import type { ShareFormat, ShareLocale, ShareTargetKind } from "@/lib/share/kinds";

// Objetivo de compartir (design D3 de add-share-foundation): todo lo que la imagen y los metadatos necesitan,
// calculado SIEMPRE como visitante anónimo y con los textos ya localizados. La versión de la imagen es un hash
// de este objeto, así que metadatos e imagen no pueden divergir.

/** Imagen remota del catálogo o del storage. `url` nula = sin imagen (sin carátula, retirada o sin foto). */
export interface ShareImageRef {
  url: string | null;
  /** Texto del recuadro tipográfico cuando no hay imagen o falla al obtenerse. */
  fallbackTitle: string;
  fallbackSubtitle: string | null;
}

export type ShareMedia =
  | { type: "cover"; cover: ShareImageRef }
  | { type: "mosaic"; covers: ShareImageRef[] }
  | { type: "photo"; photo: ShareImageRef; monogram: string }
  | {
      type: "identity";
      avatarUrl: string | null;
      monogram: string;
      /** Variante determinista del monograma (`monogramStyle`): 0 dorado, 1 petróleo. */
      monogramVariant: 0 | 1;
      covers: ShareImageRef[];
    }
  | { type: "typographic" };

/** Media de la comunidad ya filtrada por el umbral: `null` por debajo de 5 valoraciones. */
export interface ShareCommunityScore {
  averageStars: number;
  count: number;
}

/** Ranking de una Lámina: los formatos que no son Enlace dibujan esto en lugar del medio. */
export interface ShareTopCard {
  format: "top5" | "top10" | "grid9";
  byline: string;
  items: Array<{ cover: ShareImageRef; title: string; subtitle: string | null; stars: number | null; detailedScore: number | null }>;
}

/** Lámina de discografía: todos sus formatos dibujan esto. Sin números de avance: solo la proporción de la barra. */
export interface ShareDiscographyCard {
  byline: string;
  rated: string;
  discs: Array<{ cover: ShareImageRef; title: string; year: number | null; stars: number; detailedScore: number | null }>;
  more: number;
  progressPercent: number | null;
  /** Vista Por canción, cuando es la del dueño y está disponible: columnas = discos, filas = pistas. */
  songs?: ShareSongGrid;
}

export interface ShareScore {
  stars: number;
  detailedScore: number | null;
}

export interface ShareSongGrid {
  columns: Array<{ cover: ShareImageRef; title: string; year: number | null; score: ShareScore | null }>;
  /** Una fila por número de pista; `null` es una pista sin valorar o que el disco no tiene. */
  rows: Array<Array<ShareScore | null>>;
  moreDiscs: number;
  moreTracks: number;
}

/** Lámina de un álbum: sus pistas como barras con la nota. */
export interface ShareDiscographyAlbumCard {
  byline: string;
  cover: ShareImageRef;
  year: number | null;
  tracks: Array<{ number: number; title: string; score: ShareScore | null }>;
  more: number;
}

export interface ShareCard {
  kicker: string;
  title: string;
  subtitle: string | null;
  meta: string[];
  media: ShareMedia;
  community: ShareCommunityScore | null;
  credits: string[];
  /** Cita de lo que escribió una persona (reseña, comentario), ya recortada. */
  quote?: string | null;
  /** Estrellas de quien escribió; nunca un número derivado de ellas. */
  stars?: number | null;
  /** Puntaje detallado, solo en lo que su dueño hizo público: la reseña no lo lleva. */
  detailedScore?: number | null;
  /** Firma de quien escribió (`@usuario`), que no es quien comparte. */
  byline?: string | null;
  top?: ShareTopCard;
  discography?: ShareDiscographyCard;
  discographyAlbum?: ShareDiscographyAlbumCard;
}

export interface ShareTarget {
  kind: ShareTargetKind;
  /** Referencia estable del objeto (id, slug o `<slug>:<año>`; `-` en los índices). */
  ref: string;
  locale: ShareLocale;
  /** Ruta canónica con locale y sin query (`/es/album/<slug-id>`). */
  canonicalPath: string;
  title: string;
  description: string;
  imageAlt: string;
  /** Nombre del PNG descargado, sin extensión. */
  downloadName: string;
  /** Formatos que ofrece, con el primero por defecto. Sin esto, Enlace e Historia. */
  formats?: ShareFormat[];
  card: ShareCard;
}
