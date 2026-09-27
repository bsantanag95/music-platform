// Ficha del artista a partir del lookup de MusicBrainz con `inc=artist-rels+url-rels`
// (openspec: enrich-artist-profile, capability `artist-profile-facts`). Funciones puras: la
// escritura vive en src/services/catalog/artist-profile.ts. No se leen géneros ni etiquetas:
// son datos suplementarios CC BY-NC-SA (ver docs/03-data/data-licensing.md).

import type { MBArtistDetail, MBArtistRelation } from "./types";

export type ArtistLinkKind = "official" | "bandcamp" | "streaming";

export interface ArtistLinkInput {
  kind: ArtistLinkKind;
  url: string;
  position: number;
}

export interface ArtistProfileFacts {
  country: string | null;
  beginAreaName: string | null;
  endAreaName: string | null;
  lifeBegin: string | null;
  lifeEnd: string | null;
  lifeEnded: boolean | null;
  wikidataId: string | null;
  links: ArtistLinkInput[];
}

const PARTIAL_DATE = /^\d{4}(-\d{2}(-\d{2})?)?$/;

/** Fecha parcial de MusicBrainz ('YYYY', 'YYYY-MM' o 'YYYY-MM-DD'); cualquier otra cosa, null. */
export function partialDate(value: string | null | undefined): string | null {
  return value && PARTIAL_DATE.test(value) ? value : null;
}

/** Streaming, en orden de preferencia: se guarda solo la primera disponible. */
const STREAMING_HOSTS = ["open.spotify.com", "music.apple.com", "www.deezer.com", "deezer.com", "music.youtube.com"];
const STREAMING_PRIORITY = ["open.spotify.com", "music.apple.com", "deezer.com", "music.youtube.com"];

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function activeUrlRelations(detail: MBArtistDetail): (MBArtistRelation & { url: { resource: string } })[] {
  return (detail.relations ?? []).filter(
    (r): r is MBArtistRelation & { url: { resource: string } } => Boolean(r.url?.resource) && r.ended !== true,
  );
}

/** Id de Wikidata (`Q…`) de la relación `wikidata`, o null. */
export function wikidataIdOf(detail: MBArtistDetail): string | null {
  for (const relation of activeUrlRelations(detail)) {
    if (relation.type !== "wikidata") continue;
    const match = /\/(Q\d+)$/.exec(relation.url.resource);
    if (match) return match[1]!;
  }
  return null;
}

/**
 * Enlaces curados en orden fijo: sitio oficial, Bandcamp y una plataforma de streaming (la
 * primera disponible entre Spotify, Apple Music, Deezer y YouTube Music). Sin redes sociales,
 * tiendas ni bases de datos. Las relaciones terminadas se descartan.
 */
export function curatedArtistLinks(detail: MBArtistDetail): ArtistLinkInput[] {
  const relations = activeUrlRelations(detail);
  const official = relations.find((r) => r.type === "official homepage")?.url.resource;
  const bandcamp = relations.find(
    (r) => r.type === "bandcamp" || hostOf(r.url.resource)?.endsWith(".bandcamp.com"),
  )?.url.resource;

  let streaming: string | undefined;
  let bestRank = Number.POSITIVE_INFINITY;
  for (const relation of relations) {
    const host = hostOf(relation.url.resource);
    if (!host || !STREAMING_HOSTS.includes(host)) continue;
    const rank = STREAMING_PRIORITY.indexOf(host.replace(/^www\./, ""));
    if (rank !== -1 && rank < bestRank) {
      bestRank = rank;
      streaming = relation.url.resource;
    }
  }

  const ordered: [ArtistLinkKind, string | undefined][] = [
    ["official", official],
    ["bandcamp", bandcamp],
    ["streaming", streaming],
  ];
  return ordered
    .filter((entry): entry is [ArtistLinkKind, string] => Boolean(entry[1]))
    .map(([kind, url], position) => ({ kind, url, position }));
}

/** Datos de ficha del lookup; para una persona, inicio y fin son nacimiento y muerte. */
export function mapArtistProfileFacts(detail: MBArtistDetail): ArtistProfileFacts {
  const lifeSpan = detail["life-span"];
  const country = detail.country && /^[A-Z]{2}$/.test(detail.country) ? detail.country : null;
  return {
    country,
    beginAreaName: detail["begin-area"]?.name ?? null,
    endAreaName: detail["end-area"]?.name ?? null,
    lifeBegin: partialDate(lifeSpan?.begin),
    lifeEnd: partialDate(lifeSpan?.end),
    lifeEnded: typeof lifeSpan?.ended === "boolean" ? lifeSpan.ended : null,
    wikidataId: wikidataIdOf(detail),
    links: curatedArtistLinks(detail),
  };
}
