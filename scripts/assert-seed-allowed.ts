// Guardia de los scripts de seed en desarrollo (scripts/seed-*.ts).
//
// Un seed escribe usuarios, ratings, comentarios y listas en la BD apuntada
// por DATABASE_URL, y en el caso de seed-home.ts además ingiere artistas
// reales de MusicBrainz (misma ruta de producción, sin datos de catálogo
// falsos — ver docs/05-features/home.md). Mismo env var que los smoke tests
// (scripts/assert-smoke-allowed.ts): un único knob para "este script escribe
// en la BD real si no le decís lo contrario".

export function assertSeedAllowed(): void {
  if (process.env.ALLOW_SMOKE_ON_REAL_DB === "1") return;
  console.error(
    [
      "⛔ Seed abortado: escribiría datos de prueba en la BD de DATABASE_URL.",
      "Para correrlo (idealmente contra una BD de scratch, otro DATABASE_URL):",
      "  ALLOW_SMOKE_ON_REAL_DB=1 npx tsx --env-file=.env scripts/<nombre>.ts",
    ].join("\n"),
  );
  process.exit(1);
}
