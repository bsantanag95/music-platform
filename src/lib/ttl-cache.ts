/**
 * Caché en memoria con vigencia, para lecturas pesadas y poco cambiantes de páginas públicas (las carátulas y los géneros
 * de las familias de `/explore`). Sin dependencias ni infraestructura: el valor vive en la instancia y se recalcula al vencer
 * o al reiniciarla.
 *
 * - Dentro de la vigencia devuelve el valor guardado, sin leer.
 * - Las llamadas simultáneas comparten una sola lectura (promesa en vuelo).
 * - Un error **no se cachea**: devuelve `onError` (el valor degradado, p. ej. un mapa vacío) y la próxima llamada reintenta.
 */
export interface TtlCache<T> {
  /** El valor vigente o una lectura nueva. `now` es inyectable para probar el vencimiento sin reloj. */
  get(now?: number): Promise<T>;
  /** Vacía la caché (solo para pruebas). */
  reset(): void;
}

export function createTtlCache<T>(options: {
  ttlMs: number;
  load: () => Promise<T>;
  /** Valor que se devuelve (sin guardarlo) si la lectura falla. */
  onError: () => T;
  /** Mensaje del registro de errores. */
  errorLabel: string;
}): TtlCache<T> {
  let cached: { at: number; value: T } | null = null;
  let inFlight: Promise<T> | null = null;

  return {
    async get(now: number = Date.now()): Promise<T> {
      if (cached && now - cached.at < options.ttlMs) return cached.value;
      if (!inFlight) {
        inFlight = options
          .load()
          .then((value) => {
            cached = { at: now, value };
            return value;
          })
          .catch((error) => {
            console.error(options.errorLabel, error);
            return options.onError();
          })
          .finally(() => {
            inFlight = null;
          });
      }
      return inFlight;
    },
    reset() {
      cached = null;
      inFlight = null;
    },
  };
}
