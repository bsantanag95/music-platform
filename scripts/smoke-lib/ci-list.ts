// Smoke tests que corre el job `integration` del CI (`pnpm run smoke:ci`), en este orden.
//
// Criterio de entrada: pasa sobre una BD virgen recién migrada (PostgreSQL 18), solo usa `fetch` mockeado, limpia sus fixtures y NO
// mide tiempos (un umbral de milisegundos es una fuente de intermitencia en un runner compartido). `ingestion` va primero: puebla
// los datos reales (Pink Floyd, DSOTM) que leen `routes` y `new-endpoints`. Auditoría completa y los excluidos, con su motivo:
// `docs/06-operations/smoke-tests.md`.

export const CI_SMOKES: readonly string[] = [
  // Pueblan y consumen el catálogo de Pink Floyd: el orden importa.
  "ingestion",
  "routes",
  "new-endpoints",
  // Catálogo e ingesta
  "artist-by-id",
  "unknown-enrichment",
  "discography-cache",
  "album-editions",
  "personnel-credits",
  "artist-profile",
  "artist-lineup",
  "artist-discography",
  "membership-sync",
  // Cuentas y sesión
  "google-oauth",
  // Social
  "social",
  "comment-likes",
  "comment-replies",
  "artist-comment-topics",
  "diary-social",
  "share-relation",
  "share-user-content",
  // Conciertos, géneros y premios
  "concerts",
  "shared-concerts",
  "genres",
  "music-awards",
  "phase4",
];
