// Ayuda común de los tests de propiedades (`*.property.test.ts`, `fast-check`; change strengthen-verification-loop, fase 4).
//
// Una propiedad afirma algo que no puede fallar y `fast-check` genera entradas para intentar refutarlo. Se ejecutan con una
// SEMILLA FIJA y un número de corridas acotado, así una corrida es reproducible y el CI no cambia de resultado de un día para otro.
// Si una propiedad falla, `fast-check` imprime la semilla y el contraejemplo ya reducido: para reproducirlo,
//   FC_SEED=<semilla> pnpm exec vitest run <archivo>
// Para explorar con más entradas (sin tocar el código): `FC_RUNS=5000 FC_SEED=$RANDOM pnpm exec vitest run <archivo>`.
//
// `fast-check` es solo de desarrollo: nada fuera de los tests puede importarlo (lo comprueba `property.meta.test.ts`).

import fc from "fast-check";

export { fc };

export const PROPERTY_SEED = Number(process.env.FC_SEED ?? 20261118);
export const PROPERTY_RUNS = Number(process.env.FC_RUNS ?? 200);

/** Ejecuta una propiedad con la semilla y las corridas configuradas; ante un fallo lanza con la semilla y el contraejemplo reducido. */
export function assertProperty<Ts>(property: fc.IRawProperty<Ts>): void {
  fc.assert(property, { seed: PROPERTY_SEED, numRuns: PROPERTY_RUNS });
}
