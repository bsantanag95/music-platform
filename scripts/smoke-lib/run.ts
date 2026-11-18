// Ejecución común de los smoke tests (change strengthen-verification-loop, fase 3).
//
// Antes cada script armaba a mano su `main().catch(...)`, y varios terminaban con `process.exit(0)` aunque hubieran
// impreso "❌": el CI no puede fiarse de un código de salida que no refleja el resultado. Este helper unifica tres cosas:
//   1. el código de salida (0 solo si no falló ningún `check` ni lanzó el script);
//   2. la limpieza de fixtures en un `finally` (antes de empezar, para reintentar una corrida interrumpida, y siempre al terminar,
//      también si el script falló), sin que un fallo de limpieza tape el error original;
//   3. la declaración de si el script exige una BD virgen (`pristineCheck`), con un aborto explicado antes de escribir nada.
//
// Cada script sigue llamando a `assertSmokeAllowed()` en su primera línea ejecutable (REVIEW.md, R10): esa guardia corre antes de
// importar la BD y no se delega aquí.

export interface SmokeContext {
  /** Registra una comprobación: imprime ✅/❌ y, si falla, hará que el script termine con código 1. */
  check(condition: boolean, message: string): void;
}

export interface SmokeDefinition {
  /** Nombre corto para los mensajes (p. ej. `artist-by-id`). */
  name: string;
  /**
   * Solo si el script exige una BD virgen: devuelve el motivo por el que NO lo está, o `null` si lo está.
   * Se evalúa antes de limpiar o escribir nada.
   */
  pristineCheck?: () => Promise<string | null>;
  /** Borra los fixtures del script (idempotente). Corre antes de `run` y siempre al terminar. */
  cleanup?: () => Promise<void>;
  run: (ctx: SmokeContext) => Promise<void>;
}

export interface SmokeOutcome {
  exitCode: 0 | 1;
  failures: number;
  /** Líneas que se imprimieron, en orden (útil para probar el helper). */
  log: string[];
}

export async function executeSmoke(def: SmokeDefinition, print: (line: string) => void = console.log): Promise<SmokeOutcome> {
  const log: string[] = [];
  const out = (line: string) => {
    log.push(line);
    print(line);
  };
  let failures = 0;
  const ctx: SmokeContext = {
    check(condition, message) {
      out(`${condition ? "✅" : "❌"} ${message}`);
      if (!condition) failures++;
    },
  };

  if (def.pristineCheck) {
    const reason = await def.pristineCheck();
    if (reason !== null) {
      out(`⛔ ${def.name}: exige una BD de scratch virgen y no lo está — ${reason}`);
      out("   Usa otro DATABASE_URL de scratch limpio (ver AGENTS.md); no se escribió nada.");
      return { exitCode: 1, failures: 1, log };
    }
  }

  let runError: unknown = null;
  try {
    // Limpieza previa: permite reintentar tras una corrida interrumpida que dejó fixtures.
    await def.cleanup?.();
    await def.run(ctx);
  } catch (error) {
    runError = error;
    failures++;
    out(`❌ ${def.name}: el script lanzó un error: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`);
  } finally {
    if (def.cleanup) {
      try {
        await def.cleanup();
      } catch (cleanupError) {
        // Un fixture que queda en la BD es un fallo en sí mismo, pero no debe ocultar el error original.
        failures++;
        out(`❌ ${def.name}: la limpieza de fixtures falló: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`);
      }
    }
  }

  if (runError === null && failures === 0) out(`✅ ${def.name}: todo en orden.`);
  return { exitCode: failures === 0 ? 0 : 1, failures, log };
}

/**
 * Cierra el pool de Postgres (`src/db` lo cachea en `globalThis.pgClient`). Salir con conexiones abiertas hace que Node en Windows aborte a
 * veces con un assert de libuv (código 3221226505) DESPUÉS de haber pasado todo: el código de salida dejaría de reflejar el resultado.
 */
async function closeDb(): Promise<void> {
  const client = (globalThis as { pgClient?: { end(options?: { timeout?: number }): Promise<void> } }).pgClient;
  await client?.end({ timeout: 2 });
}

/** Punto de entrada de un script: ejecuta, imprime y termina el proceso con el código que corresponde. */
export async function runSmoke(def: SmokeDefinition): Promise<never> {
  const outcome = await executeSmoke(def);
  try {
    await closeDb();
  } catch {
    // Cerrar el pool es una cortesía: su fallo no cambia el resultado del smoke test.
  }
  // Salida natural cuando no queda nada vivo (evita el assert de libuv de Windows al forzar la salida con handles cerrándose);
  // si algo mantiene vivo el proceso (un timer, una conexión), se fuerza pasados 3 s.
  process.exitCode = outcome.exitCode;
  setTimeout(() => process.exit(outcome.exitCode), 3000).unref();
  return new Promise<never>(() => {});
}
