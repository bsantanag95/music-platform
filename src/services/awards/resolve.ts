import type { AwardSubjectKind } from "@/db/schema";
import { mapReleaseGroupCategory } from "@/services/musicbrainz/mappers";
import type {
  MBArtistSearchItem,
  MBRecordingSearchItem,
  MBReleaseGroupSearchItem,
} from "@/services/musicbrainz/types";
import type { Nominee, NomineeSeed, Resolution, ResolutionCandidate } from "./curation-schema";

// Resolución de nominados a MBID (openspec: add-music-awards, design D3, ADR 0032). Funciones puras sobre una
// búsqueda inyectada: el script `resolve-award-nominees.ts` les pasa el cliente de MusicBrainz y las pruebas,
// respuestas fijas. Nunca eligen entre dos candidatos válidos: eso queda como `ambiguous` para el curador.

/** Puntaje mínimo de MusicBrainz para considerar un candidato. */
export const STRONG_SCORE = 95;
/** Candidatos que se guardan para revisar un `ambiguous` o un `not_found`. */
const MAX_CANDIDATES = 5;

export interface NomineeSearch {
  releaseGroups(query: string): Promise<MBReleaseGroupSearchItem[]>;
  recordings(query: string): Promise<MBRecordingSearchItem[]>;
  artists(query: string): Promise<MBArtistSearchItem[]>;
}

/** Frase Lucene entre comillas, con `"` y `\` escapados. */
export function phrase(value: string): string {
  return `"${value.replace(/[\\"]/g, (c) => `\\${c}`)}"`;
}

const creditName = (credits: { name: string; joinphrase?: string }[] | undefined) =>
  (credits ?? []).map((c) => `${c.name}${c.joinphrase ?? ""}`).join("");

function releaseGroupCandidate(item: MBReleaseGroupSearchItem): ResolutionCandidate {
  const secondary = item["secondary-types"] ?? [];
  const date = item["first-release-date"];
  return {
    mbid: item.id,
    score: item.score ?? 0,
    label: `${item.title} — ${creditName(item["artist-credit"])}${date ? ` (${date})` : ""}${
      secondary.length ? ` [${secondary.join(", ")}]` : ""
    }`,
    seed: {
      kind: "release_group",
      title: item.title,
      category: mapReleaseGroupCategory(item["primary-type"], item["secondary-types"]),
      ...(date ? { firstReleaseDate: date } : {}),
      credits: item["artist-credit"] ?? [],
    },
  };
}

function recordingCandidate(item: MBRecordingSearchItem, anchorMbid: string, anchor: NomineeSeed | undefined): ResolutionCandidate {
  return {
    mbid: item.id,
    score: item.score ?? 0,
    label: `${item.title} — ${creditName(item["artist-credit"])}${item.disambiguation ? ` (${item.disambiguation})` : ""}`,
    seed: {
      kind: "recording",
      title: item.title,
      durationSec: typeof item.length === "number" ? Math.round(item.length / 1000) : null,
      credits: item["artist-credit"] ?? [],
      anchorMbid,
      ...(anchor?.kind === "release_group" ? { anchor } : {}),
    },
  };
}

function artistCandidate(item: MBArtistSearchItem): ResolutionCandidate {
  return {
    mbid: item.id,
    score: item.score ?? 0,
    label: `${item.name}${item.disambiguation ? ` (${item.disambiguation})` : ""}${item.country ? ` · ${item.country}` : ""}`,
    seed: {
      kind: "artist",
      name: item.name,
      ...(item.type ? { mbType: item.type } : {}),
      disambiguation: item.disambiguation ?? null,
    },
  };
}

const exact = (candidate: ResolutionCandidate): Resolution => ({
  status: "exact",
  mbid: candidate.mbid,
  seed: candidate.seed as NomineeSeed,
});

/** Candidato con su rango de preferencia: menor es mejor. */
export interface Scored {
  candidate: ResolutionCandidate;
  rank: number;
}

/**
 * Decide entre candidatos ya ordenados por puntaje. Entre los fuertes (puntaje ≥ `STRONG_SCORE`) se queda con los
 * del mejor rango: si es uno solo, se toma; si son dos o más, queda `ambiguous` con ellos, sin elegir. Ninguno
 * fuerte → `not_found`, con los mejores candidatos para que el curador elija.
 */
export function decide(scored: Scored[]): Resolution {
  const strong = scored.filter((s) => s.candidate.score >= STRONG_SCORE);
  if (strong.length === 0) return { status: "not_found", candidates: scored.slice(0, MAX_CANDIDATES).map((s) => s.candidate) };
  const best = Math.min(...strong.map((s) => s.rank));
  const top = strong.filter((s) => s.rank === best).map((s) => s.candidate);
  if (top.length === 1) return exact(top[0]!);
  return { status: "ambiguous", candidates: top.slice(0, MAX_CANDIDATES) };
}

/** Comparación de nombres sin mayúsculas, acentos ni puntuación ("drivers license" = "Drivers License"). */
export function sameName(a: string, b: string): boolean {
  const norm = (value: string) =>
    value
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "");
  return norm(a) === norm(b);
}

/**
 * Rango de un disco: el título idéntico va antes; luego un álbum sin tipos secundarios (un sencillo homónimo, como
 * "Future Nostalgia" de 2019, no le gana al álbum), después cualquier otro sin tipos secundarios y al final el
 * resto (en vivo, remix, reedición).
 */
function releaseGroupRank(item: MBReleaseGroupSearchItem, title: string): number {
  const secondary = (item["secondary-types"] ?? []).length > 0;
  const typeRank = secondary ? 2 : item["primary-type"] === "Album" ? 0 : 1;
  return (sameName(item.title, title) ? 0 : 10) + typeRank;
}

/** Busca un álbum, sencillo o EP por título y artista. */
export async function resolveReleaseGroup(search: NomineeSearch, title: string, artist: string): Promise<Resolution> {
  const items = await search.releaseGroups(`releasegroup:${phrase(title)} AND artist:${phrase(artist)}`);
  return decide(items.map((item) => ({ candidate: releaseGroupCandidate(item), rank: releaseGroupRank(item, title) })));
}

export async function resolveArtist(search: NomineeSearch, name: string): Promise<Resolution> {
  const items = await search.artists(`artist:${phrase(name)}`);
  // Solo el nombre idéntico separa candidatos ("Chika" de "Chika Chika"); dos homónimos exactos son ambiguos.
  return decide(items.map((item) => ({ candidate: artistCandidate(item), rank: sameName(item.name, name) ? 0 : 1 })));
}

/**
 * Rango de una grabación dentro de su disco: sin desambiguación (la original) primero, luego la marcada solo como
 * "explicit" (cuando la original se distingue de su versión "clean"), y al final mezclas, videos y demás versiones.
 */
function recordingRank(item: MBRecordingSearchItem, title: string): number {
  const disambiguation = (item.disambiguation ?? "").trim().toLowerCase();
  const versionRank = disambiguation === "" ? 0 : disambiguation === "explicit" ? 1 : 2;
  return (sameName(item.title, title) ? 0 : 10) + versionRank;
}

/**
 * Grabación anclada en su disco (ADR 0032, punto 3): primero el disco, después la grabación dentro de él. Si el
 * disco no se resuelve sin ambigüedad, la grabación tampoco: queda para el curador.
 */
export async function resolveRecording(
  search: NomineeSearch,
  title: string,
  artist: string,
  anchor: { title: string; artist: string },
): Promise<Resolution> {
  const anchorResolution = await resolveReleaseGroup(search, anchor.title, anchor.artist);
  if (anchorResolution.status !== "exact" || !anchorResolution.mbid) {
    return { status: anchorResolution.status === "ambiguous" ? "ambiguous" : "not_found", candidates: [] };
  }
  const anchorMbid = anchorResolution.mbid;
  const items = await search.recordings(`recording:${phrase(title)} AND rgid:${anchorMbid}`);
  // La misma grabación aparece una vez por edición del disco: se deduplica por MBID.
  const unique = [...new Map(items.map((item) => [item.id, item])).values()];
  const anchorSeed = anchorResolution.seed;
  return decide(unique.map((item) => ({ candidate: recordingCandidate(item, anchorMbid, anchorSeed), rank: recordingRank(item, title) })));
}

/** Resuelve un nominado según el tipo de sujeto de su categoría. */
export function resolveNominee(search: NomineeSearch, nominee: Nominee, subject: AwardSubjectKind): Promise<Resolution> {
  const title = nominee.searchAs?.title ?? nominee.title;
  const artist = nominee.searchAs?.artist ?? nominee.artist;
  if (subject === "artist") return resolveArtist(search, title);
  if (subject === "recording") {
    if (!nominee.anchor || !artist) return Promise.resolve({ status: "not_found", candidates: [] });
    return resolveRecording(search, title, artist, nominee.anchor);
  }
  if (!artist) return Promise.resolve({ status: "not_found", candidates: [] });
  return resolveReleaseGroup(search, title, artist);
}

/** Si el nominado necesita (re)resolverse: sin resolución, o ambiguo / no encontrado con `retry`. */
export function needsResolution(nominee: Nominee, retry: boolean): boolean {
  const status = nominee.resolved?.status;
  if (!status) return true;
  return retry && (status === "ambiguous" || status === "not_found");
}
