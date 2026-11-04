import type { ShareLocale, ShareTargetKind } from "@/lib/share/kinds";

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

export interface ShareCard {
  kicker: string;
  title: string;
  subtitle: string | null;
  meta: string[];
  media: ShareMedia;
  community: ShareCommunityScore | null;
  credits: string[];
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
  card: ShareCard;
}
