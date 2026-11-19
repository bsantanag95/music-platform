// Smoke tests que corre el job `integration` del CI (`pnpm run smoke:ci`), en este orden.
//
// Criterio de entrada: pasa sobre una BD virgen recién migrada (PostgreSQL 18), solo usa `fetch` mockeado, limpia sus fixtures y NO
// falla por un umbral de milisegundos (una medida de tiempo es una fuente de intermitencia en un runner compartido). La única que mide
// tiempo es `notifications`, con un umbral de fallo de 5× su presupuesto (ver `TIMING_TOLERANT` en el test de esta lista). `ingestion` va primero: puebla
// los datos reales (Pink Floyd, DSOTM) que leen `routes` y `new-endpoints`. Auditoría completa y los excluidos, con su motivo:
// `docs/06-operations/smoke-tests.md`.

export const CI_SMOKES: readonly string[] = [
  // Pueblan y consumen el catálogo de Pink Floyd: el orden importa.
  "ingestion",
  "routes",
  "new-endpoints",
  // Catálogo e ingesta
  "artist-by-id",
  "recording-search",
  "unknown-enrichment",
  "discography-cache",
  "album-editions",
  "personnel-credits",
  "artist-profile",
  "artist-lineup",
  "artist-discography",
  "membership-sync",
  // Cuentas y sesión
  "account-settings",
  "email-verification",
  "google-oauth",
  "keep-signed-in",
  "password-reset",
  // Social
  "social",
  "comment-likes",
  "comment-replies",
  "artist-comment-topics",
  "notifications",
  "diary-social",
  "share-relation",
  "share-user-content",
  // Conciertos, géneros y premios
  "concerts",
  "community-concerts",
  "shared-concerts",
  "genres",
  "music-awards",
  "explore-collections",
  "phase4",
];
