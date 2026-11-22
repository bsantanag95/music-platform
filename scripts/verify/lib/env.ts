// Lógica pura de entorno para `verify` (sin I/O): lectura de un `.env` y veredicto de seguridad
// sobre la BD apuntada por `DATABASE_URL`.
//
// Regla (falla cerrada): los smoke tests escriben fixtures, así que solo se habilitan cuando el
// NOMBRE de la BD indica que es desechable (`scratch`, `test`, `ci`, `tmp` como palabra) o cuando la
// persona la autorizó de forma explícita con `VERIFY_ALLOWED_DB`. Si no se puede determinar, no se corre.

/** Lee un `.env` simple (`CLAVE=valor`, comentarios con `#`, comillas opcionales). */
export function parseEnvFile(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

export interface DbIdentity {
  host: string;
  port: string;
  database: string;
}

/** Extrae host, puerto y nombre de BD de una URL de Postgres. Nunca devuelve la contraseña. */
export function parseDbUrl(url: string | undefined): DbIdentity | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const database = decodeURIComponent(u.pathname.replace(/^\//, ""));
    if (!database) return null;
    return { host: u.hostname, port: u.port, database };
  } catch {
    return null;
  }
}

export interface SmokeDbVerdict {
  allowed: boolean;
  reason: string;
  database: string | null;
}

const DISPOSABLE_WORD = /(^|[_-])(scratch|test|ci|tmp)([_-]|$)/i;

/**
 * Decide si es seguro correr smoke tests contra `databaseUrl`.
 * `allowedDatabases` viene de `VERIFY_ALLOWED_DB` (nombres separados por coma, autorización explícita).
 */
export function judgeSmokeDb(databaseUrl: string | undefined, allowedDatabases: string[] = []): SmokeDbVerdict {
  const id = parseDbUrl(databaseUrl);
  if (!id) {
    return {
      allowed: false,
      reason: "No se pudo determinar la BD de DATABASE_URL (falta o no es una URL de Postgres válida).",
      database: null,
    };
  }
  if (DISPOSABLE_WORD.test(id.database)) {
    return { allowed: true, reason: `La BD "${id.database}" tiene nombre de BD desechable.`, database: id.database };
  }
  if (allowedDatabases.map((d) => d.trim()).includes(id.database)) {
    return {
      allowed: true,
      reason: `La BD "${id.database}" fue autorizada con VERIFY_ALLOWED_DB.`,
      database: id.database,
    };
  }
  return {
    allowed: false,
    reason:
      `La BD "${id.database}" no parece de scratch: los smoke tests escriben fixtures. ` +
      "Apunta DATABASE_URL a una BD de scratch (p. ej. music_platform_scratch) o autoriza el nombre con VERIFY_ALLOWED_DB.",
    database: id.database,
  };
}
