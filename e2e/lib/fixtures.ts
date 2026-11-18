// Datos de prueba de los E2E (ver docs/05-features/feature-map.md). Todo lleva un prefijo propio para
// poder borrarlo sin tocar el catálogo real: MBID `e2e00000-0000-4000-8000-*` y usuarios `e2e_*`.

export const E2E_PORT = Number(process.env.E2E_PORT ?? 3417);
export const E2E_BASE_URL = `http://localhost:${E2E_PORT}`;

/** MBID sintético determinista (hex válido, distinto del prefijo de los smoke tests `5e0ce000`). */
export function e2eMbid(n: number): string {
  return `e2e00000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;
}

export const IDS = {
  artist: e2eMbid(1),
  releaseGroup: e2eMbid(2),
  release: e2eMbid(3),
  recording: (n: number) => e2eMbid(0x100 + n),
};

export const ARTIST_NAME = "Banda E2E de Prueba";
export const ALBUM_TITLE = "Álbum E2E de Prueba";
export const TRACK_TITLES = ["Primera pista E2E", "Segunda pista E2E", "Tercera pista E2E"];

export const USER = {
  username: "e2e_tester",
  email: "e2e_tester@example.test",
  password: "e2e-clave-de-prueba-123",
  /** Otro usuario público, para el flujo de perfil de terceros. */
  otherUsername: "e2e_vecina",
  otherEmail: "e2e_vecina@example.test",
};

export const LIST_TITLE = "Lista E2E de Prueba";

/** Dónde guarda la sesión del usuario de prueba el setup global. */
export const STORAGE_STATE = "e2e/.auth/user.json";

/** Rutas canónicas de lo sembrado (las escribe ). */
export const SEED_FILE = "e2e/.auth/seed.json";

export interface SeedPaths {
  albumPath: string;
  artistPath: string;
  profilePath: string;
  otherProfilePath: string;
}
