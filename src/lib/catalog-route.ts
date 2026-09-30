import { permanentRedirect } from "next/navigation";

// Canonicalización de las direcciones del catálogo (openspec: add-catalog-slugs,
// design D5). Cada página pública carga la entidad por el id del segmento y, si
// el segmento recibido no es el canónico (slug desactualizado, id pelado o el
// UUID hexadecimal del formato anterior), responde un 308 a la dirección
// canónica conservando locale, subruta de pestaña y query.

export type CatalogRouteKind = "artist" | "album" | "song" | "review" | "list";

const BASE_PATH: Record<Exclude<CatalogRouteKind, "list">, string> = {
  artist: "artist",
  album: "album",
  song: "song",
  review: "review",
};

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment).normalize("NFC");
  } catch {
    return segment.normalize("NFC");
  }
}

function buildQuery(searchParams?: Record<string, string | string[] | undefined>): string {
  if (!searchParams) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) for (const item of value) params.append(key, item);
    else params.append(key, value);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

interface ResolveCatalogRouteOptions {
  locale: string;
  kind: CatalogRouteKind;
  /** Segmento tal como llegó por la URL (puede venir percent-encoded). */
  segment: string;
  /** Segmento canónico esperado, ya en NFC. */
  canonical: string;
  /** Subruta de la pestaña (`""`, `"/credits"`, `"/reviews"`, …). */
  subpath?: string;
  searchParams?: Record<string, string | string[] | undefined>;
  /** Solo para listas: el usuario dueño. */
  owner?: string;
}

export function resolveCatalogRoute({
  locale,
  kind,
  segment,
  canonical,
  subpath = "",
  searchParams,
  owner,
}: ResolveCatalogRouteOptions): void {
  if (decodeSegment(segment) === canonical.normalize("NFC")) return;
  const base = kind === "list" ? `users/${encodeURIComponent(owner ?? "")}/lists` : BASE_PATH[kind];
  const target = `/${locale}/${base}/${encodeURIComponent(canonical)}${subpath}${buildQuery(searchParams)}`;
  // El `Location` debe ser ASCII: un slug Unicode sin percent-encoding hace fallar la respuesta (500).
  permanentRedirect(target);
}
