// Guardia de los smoke tests de desarrollo.
//
// Por defecto, NINGÚN smoke test puede correr: todos escriben (o pueden
// escribir) fixtures en la BD apuntada por DATABASE_URL — release_group
// sintéticos, recordings de prueba, y en `smoke-test-ingestion.ts` además
// marcan `discography_synced_at`, "congelando" al artista con datos falsos
// (incidente real con Pink Floyd en 2026-08). Para correrlos hay que
// habilitarlo explícitamente con ALLOW_SMOKE_ON_REAL_DB=1, idealmente contra
// una BD de scratch (ver AGENTS.md, sección de smoke tests).

export function assertSmokeAllowed(): void {
  if (process.env.ALLOW_SMOKE_ON_REAL_DB === "1") return;
  console.error(
    [
      "⛔ Smoke test abortado: escribiría fixtures en la BD de DATABASE_URL.",
      "Para correrlo (idealmente contra una BD de scratch, otro DATABASE_URL):",
      "  ALLOW_SMOKE_ON_REAL_DB=1 npx tsx --env-file=.env scripts/<nombre>.ts",
      "Y si corriste contra la BD real, reseteá los artistas tocados y borrá los",
      "fixtures creados (ver AGENTS.md, sección de smoke tests).",
    ].join("\n"),
  );
  process.exit(1);
}
