import { isValidUuid } from "@/lib/validation";

// Intención "Arma la tuya" (openspec: add-top-n-lamina-phase3, add-discography-lamina-phase3 y add-year-in-discs-phase3, ADR 0052, 0054 y
// 0055): lo único que aporta el cliente es un identificador, el de una Lámina o el de un artista, o un año. La ruta de destino se arma aquí, con el usuario ya
// autenticado, así que el retorno después de autenticarse no puede llevar a otro lugar. Es distinta de la intención del flujo de
// Google (`login`, `link`, `reauth`): esta dice qué quiere armar la persona, aquella qué hace el flujo.

export type BuildIntent = { kind: "lamina"; id: string } | { kind: "discography"; artistId: string } | { kind: "year"; year: number };

/** Años que acepta la intención de año: los mismos de "Tu año en discos". */
const YEAR_MIN = 2000;
const YEAR_MAX = 2100;

/** El año si es un entero de cuatro cifras entre 2000 y 2100; cualquier otra cosa se descarta. */
export function parseYearIntent(value: unknown): number | null {
  const year = typeof value === "number" ? value : typeof value === "string" && /^\d{4}$/.test(value) ? Number(value) : NaN;
  return Number.isInteger(year) && year >= YEAR_MIN && year <= YEAR_MAX ? year : null;
}

/** El id si es un identificador válido; cualquier otra cosa se descarta. */
export function parseLaminaIntent(value: unknown): string | null {
  return typeof value === "string" && isValidUuid(value) ? value.toLowerCase() : null;
}

/** Intención desde los parámetros `lamina`, `discografia` y `anio`. Si llegan varias, manda la de Lámina y después la de discografía. */
export function parseBuildIntent(params: { lamina?: unknown; discografia?: unknown; anio?: unknown }): BuildIntent | null {
  const lamina = parseLaminaIntent(params.lamina);
  if (lamina) return { kind: "lamina", id: lamina };
  const artistId = parseLaminaIntent(params.discografia);
  if (artistId) return { kind: "discography", artistId };
  const year = parseYearIntent(params.anio);
  return year !== null ? { kind: "year", year } : null;
}

/** Revalida una intención guardada (el estado del flujo de Google viaja en una cookie). */
export function normalizeBuildIntent(value: unknown): BuildIntent | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as { kind?: unknown; id?: unknown; artistId?: unknown; year?: unknown };
  if (candidate.kind === "lamina") return parseBuildIntent({ lamina: candidate.id });
  if (candidate.kind === "discography") return parseBuildIntent({ discografia: candidate.artistId });
  if (candidate.kind === "year") return parseBuildIntent({ anio: candidate.year });
  return null;
}

/** Destino para armar una Lámina a partir de otra. */
export function laminaBuildHref(id: string): string {
  return `/me/laminas?desde=${id}`;
}

/** Destino para armar la discografía propia de un artista: el modo para valorar lo que falta. */
export function discographyBuildHref(username: string, artistId: string): string {
  return `/users/${encodeURIComponent(username)}/artist/${artistId}?valorar=1`;
}

/** Destino para armar el año propio: la página de ese año, con escuchas o vacía. */
export function yearBuildHref(username: string, year: number): string {
  return `/users/${encodeURIComponent(username)}/year/${year}`;
}

/** Destino de una intención para el usuario autenticado. */
export function buildIntentDestination(intent: BuildIntent, username: string): string {
  if (intent.kind === "lamina") return laminaBuildHref(intent.id);
  if (intent.kind === "discography") return discographyBuildHref(username, intent.artistId);
  return yearBuildHref(username, intent.year);
}

/** Parámetro de consulta que lleva la intención entre registro, login y Google. */
export function buildIntentQuery(intent: BuildIntent | null): string {
  if (!intent) return "";
  if (intent.kind === "lamina") return `lamina=${intent.id}`;
  if (intent.kind === "discography") return `discografia=${intent.artistId}`;
  return `anio=${intent.year}`;
}

/** Registro o login conservando la intención. */
export function buildIntentAuthHref(path: "/auth/register" | "/auth/login", intent: BuildIntent | null): string {
  const query = buildIntentQuery(intent);
  return query ? `${path}?${query}` : path;
}
