import { isValidUuid } from "@/lib/validation";

// Intención "Arma la tuya" (openspec: add-top-n-lamina-phase3 y add-discography-lamina-phase3, ADR 0052 y 0054): lo único que
// aporta el cliente es un identificador, el de una Lámina o el de un artista. La ruta de destino se arma aquí, con el usuario ya
// autenticado, así que el retorno después de autenticarse no puede llevar a otro lugar. Es distinta de la intención del flujo de
// Google (`login`, `link`, `reauth`): esta dice qué quiere armar la persona, aquella qué hace el flujo.

export type BuildIntent = { kind: "lamina"; id: string } | { kind: "discography"; artistId: string };

/** El id si es un identificador válido; cualquier otra cosa se descarta. */
export function parseLaminaIntent(value: unknown): string | null {
  return typeof value === "string" && isValidUuid(value) ? value.toLowerCase() : null;
}

/** Intención desde los parámetros `lamina` y `discografia`. Si llegan las dos, manda la de Lámina. */
export function parseBuildIntent(params: { lamina?: unknown; discografia?: unknown }): BuildIntent | null {
  const lamina = parseLaminaIntent(params.lamina);
  if (lamina) return { kind: "lamina", id: lamina };
  const artistId = parseLaminaIntent(params.discografia);
  return artistId ? { kind: "discography", artistId } : null;
}

/** Revalida una intención guardada (el estado del flujo de Google viaja en una cookie). */
export function normalizeBuildIntent(value: unknown): BuildIntent | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as { kind?: unknown; id?: unknown; artistId?: unknown };
  if (candidate.kind === "lamina") return parseBuildIntent({ lamina: candidate.id });
  if (candidate.kind === "discography") return parseBuildIntent({ discografia: candidate.artistId });
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

/** Destino de una intención para el usuario autenticado. */
export function buildIntentDestination(intent: BuildIntent, username: string): string {
  return intent.kind === "lamina" ? laminaBuildHref(intent.id) : discographyBuildHref(username, intent.artistId);
}

/** Parámetro de consulta que lleva la intención entre registro, login y Google. */
export function buildIntentQuery(intent: BuildIntent | null): string {
  if (!intent) return "";
  return intent.kind === "lamina" ? `lamina=${intent.id}` : `discografia=${intent.artistId}`;
}

/** Registro o login conservando la intención. */
export function buildIntentAuthHref(path: "/auth/register" | "/auth/login", intent: BuildIntent | null): string {
  const query = buildIntentQuery(intent);
  return query ? `${path}?${query}` : path;
}
