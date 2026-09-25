import { pickRepresentativeRelease } from "./representative-release";
import type { MBReleaseSummary } from "../musicbrainz/types";

// Variantes de un álbum con pistas adicionales (openspec: enrich-album-editions-and-credits,
// design.md D5 y D6). Funciones puras sobre el resumen de ediciones: deterministas y sin
// acceso a la base, para testearlas con la distribución real de ediciones de un álbum.

/** Edición del resumen, con lo que necesita la detección de variantes. */
export interface EditionForVariants {
  id: string;
  mbid: string;
  title: string;
  disambiguation: string | null;
  status: string | null;
  releaseDate: string | null;
  releaseYear: number | null;
  country: string | null;
  packaging: string | null;
  formats: string[];
  mediumCount: number;
  trackCount: number | null;
  labels: string[];
}

export interface EditionVariant {
  /** Edición elegida para representar al grupo (su lista es la que se ingiere). */
  editionId: string;
  editionMbid: string;
  /**
   * Nombre propio de la variante: título de la edición si difiere del álbum, si no su
   * desambiguación. `null` → la interfaz rotula "Edición {año} · {formato}".
   */
  name: string | null;
  year: number | null;
  labels: string[];
  formats: string[];
  /** Países de las ediciones del grupo, sin repetir y en orden. */
  countries: string[];
  editionCount: number;
  /** Diferencia de recuentos; el número exacto sale al comparar las listas. */
  estimatedExtraTracks: number;
  isBox: boolean;
}

const BOX_MIN_MEDIA = 4;
const BOX_TRACK_FACTOR = 3;

/** Caja: embalaje de caja, 4 o más discos, o más del triple de pistas que la representativa. */
export function isBoxEdition(
  edition: Pick<EditionForVariants, "packaging" | "mediumCount" | "trackCount">,
  representativeTrackCount: number,
): boolean {
  if (edition.packaging?.toLowerCase().includes("box")) return true;
  if (edition.mediumCount >= BOX_MIN_MEDIA) return true;
  return edition.trackCount !== null && edition.trackCount > representativeTrackCount * BOX_TRACK_FACTOR;
}

function normalizeName(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Nombre propio de una edición frente al título del álbum (null si no tiene): su título si
 * difiere del álbum; si no, la primera frase de la desambiguación. En MusicBrainz la
 * desambiguación suele seguir con detalles de prensado ("30th anniversary edition, printed
 * in EU, …") que no nombran a la edición.
 */
export function editionOwnName(edition: Pick<EditionForVariants, "title" | "disambiguation">, albumTitle: string): string | null {
  if (edition.title && normalizeName(edition.title) !== normalizeName(albumTitle)) return edition.title;
  const firstPhrase = edition.disambiguation?.split(/[,;]/)[0]?.trim();
  return firstPhrase || null;
}

/** Clave de agrupación de variantes: misma cantidad de pistas y mismos formatos. */
export function variantKeyOf(edition: Pick<EditionForVariants, "trackCount" | "formats">): string {
  return `${edition.trackCount}|${edition.formats.join("+").toLowerCase()}`;
}

const LAYER_FORMAT = /layer/i;

/**
 * Pistas de una edición sin contar las capas repetidas: un SACD híbrido informa cada capa
 * (CD, SACD 2 canales, SACD multicanal) como un disco con el mismo programa. Sin el
 * recuento por disco, se asume el programa repartido en partes iguales y se cuenta una
 * sola capa. El número exacto sale al comparar las listas.
 */
export function effectiveTrackCount(edition: Pick<EditionForVariants, "formats" | "trackCount">): number | null {
  if (edition.trackCount === null) return null;
  const media = edition.formats.length;
  const layers = edition.formats.filter((f) => LAYER_FORMAT.test(f)).length;
  if (media === 0 || layers <= 1) return edition.trackCount;
  return Math.round((edition.trackCount * (media - layers + 1)) / media);
}

function toReleaseSummary(edition: EditionForVariants): MBReleaseSummary {
  return {
    id: edition.mbid,
    title: edition.title,
    status: edition.status ?? undefined,
    date: edition.releaseDate ?? (edition.releaseYear !== null ? String(edition.releaseYear) : undefined),
    country: edition.country ?? undefined,
    packaging: edition.packaging,
    disambiguation: edition.disambiguation ?? undefined,
    media: edition.trackCount !== null ? [{ "track-count": edition.trackCount }] : [],
  };
}

/**
 * Detecta las variantes con pistas adicionales: ediciones oficiales con más pistas que la
 * representativa (sin contar capas repetidas), agrupadas por recuento y formatos — no por
 * nombre: las desambiguaciones de un mismo contenido varían por prensado. Menos o igual
 * cantidad de pistas no es variante (p. ej. ediciones que fusionan dos canciones).
 * Resultado determinista sin importar el orden de entrada: por año y recuento, cajas al
 * final.
 */
export function detectEditionVariants(
  editions: EditionForVariants[],
  representativeTrackCount: number,
  albumTitle: string,
): EditionVariant[] {
  const candidates = editions.filter((e) => {
    const count = effectiveTrackCount(e);
    return e.status === "Official" && count !== null && count > representativeTrackCount;
  });

  const groups = new Map<string, EditionForVariants[]>();
  for (const edition of candidates) {
    const key = variantKeyOf(edition);
    const group = groups.get(key) ?? [];
    group.push(edition);
    groups.set(key, group);
  }

  const variants: EditionVariant[] = [];
  for (const group of groups.values()) {
    const chosenSummary = pickRepresentativeRelease(group.map(toReleaseSummary));
    const chosen = group.find((e) => e.mbid === chosenSummary?.id) ?? group[0]!;
    const countries = [...new Set(group.map((e) => e.country).filter((c): c is string => Boolean(c)))].sort();
    variants.push({
      editionId: chosen.id,
      editionMbid: chosen.mbid,
      name: editionOwnName(chosen, albumTitle),
      year: chosen.releaseYear,
      labels: chosen.labels,
      formats: chosen.formats,
      countries,
      editionCount: group.length,
      estimatedExtraTracks: effectiveTrackCount(chosen)! - representativeTrackCount,
      isBox: isBoxEdition(chosen, representativeTrackCount),
    });
  }

  return variants.sort(
    (a, b) =>
      Number(a.isBox) - Number(b.isBox) ||
      (a.year ?? 9999) - (b.year ?? 9999) ||
      a.estimatedExtraTracks - b.estimatedExtraTracks ||
      a.editionMbid.localeCompare(b.editionMbid),
  );
}

// Marcas de remasterización que no hacen distinta a una pista: "- 2011 Remaster",
// "(Remastered)", "[2003 Remaster]", "- Remastered 2003", "(2016 Remastered Version)".
const REMASTER_SUFFIX = /\s*[-–—]\s*(?:\d{4}\s+)?remaster(?:ed)?(?:\s+\d{4})?(?:\s+version)?\s*$/i;
const REMASTER_BRACKETS = /\s*[([][^)\]]*\bremaster(?:ed)?\b[^)\]]*[)\]]/gi;

/**
 * Título normalizado para comparar pistas entre ediciones: minúsculas, sin acentos y sin
 * marcas de remasterización. Conserva cualquier otro calificador ("(Live)", "(Demo)",
 * "(Remix)"): una versión en vivo sí es una pista adicional.
 */
export function normalizeTrackTitle(title: string): string {
  return normalizeName(title.replace(REMASTER_BRACKETS, "").replace(REMASTER_SUFFIX, ""));
}

/**
 * Pistas que una edición agrega a la lista de la representativa: grabaciones que no están
 * en la lista principal y cuyo título normalizado tampoco coincide con uno de ella.
 */
export function extraTracks<T extends { recordingId: string; title: string }>(
  variantTracks: T[],
  representativeTracks: { recordingId: string; title: string }[],
): T[] {
  const recordings = new Set(representativeTracks.map((t) => t.recordingId));
  const titles = new Set(representativeTracks.map((t) => normalizeTrackTitle(t.title)));
  return variantTracks.filter(
    (t) => !recordings.has(t.recordingId) && !titles.has(normalizeTrackTitle(t.title)),
  );
}
