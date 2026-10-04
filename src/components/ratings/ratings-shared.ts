import { albumHref, artistHref, songHref } from "@/lib/catalog-links";
import type { MyRatingEntry, MyRatingGroup, MyRatingTargetType, RatingsResponse } from "@/lib/api/schemas";
import type { RatingsDisplay } from "./ratings-view";

// Tamaño de página de la biblioteca: 30 reparte parejo la última fila de la pared con 3, 5
// o 6 columnas (el servicio admite hasta 50).
export const RATINGS_PAGE_SIZE = 30;

// Orden fijo de secciones: álbumes → canciones. Coincide con el rango de tipo del ORDER BY
// del servicio, así que la lista plana que llega ya viene en este orden. Los artistas no se
// valoran, por eso no hay sección de artistas.
export const RATING_TYPE_ORDER: MyRatingTargetType[] = ["release-group", "recording"];

/** Datos que cada entrada puede omitir porque el encabezado de su sección ya los dice. */
export function displayForGroup(group: MyRatingGroup): RatingsDisplay {
  return { showArtist: group !== "artist", showType: group === "none" };
}

export function ratingHref(entry: MyRatingEntry): string {
  const { target } = entry;
  return entry.targetType === "release-group"
    ? albumHref(target.artistName, target.title, target.id)
    : songHref(target.artistName, target.title, target.id);
}

/** Enlace al artista acreditado; `null` si no se conoce. */
export function ratingArtistHref(entry: MyRatingEntry): string | null {
  const { target } = entry;
  return target.artistName && target.artistId ? artistHref(target.artistName, target.artistId) : null;
}

export function typeLabelKey(type: MyRatingTargetType): "typeAlbum" | "typeSong" {
  return type === "release-group" ? "typeAlbum" : "typeSong";
}

export function sectionTitleKey(type: MyRatingTargetType): "sectionAlbums" | "sectionSongs" {
  return type === "release-group" ? "sectionAlbums" : "sectionSongs";
}

export interface RatingGroup {
  type: MyRatingTargetType;
  entries: MyRatingEntry[];
}

// Parte la lista plana (ya ordenada por rango de tipo) en secciones no vacías.
export function groupRatingsByType(entries: MyRatingEntry[]): RatingGroup[] {
  return RATING_TYPE_ORDER.map((type) => ({
    type,
    entries: entries.filter((entry) => entry.targetType === type),
  })).filter((group) => group.entries.length > 0);
}

export interface RatingArtistGroup {
  /** Id del artista principal, o `"none"` para las valoraciones sin artista acreditado. */
  key: string;
  artistName: string | null;
  /** Enlace a la página del artista; `null` si no se conoce su id. */
  href: string | null;
  /** Álbumes y canciones del artista, en ese orden, sin subgrupos vacíos. */
  byType: RatingGroup[];
}

// Reúne las valoraciones bajo su artista principal acreditado, en el orden de aparición (el
// servidor ya las entrega ordenadas por artista, pero no se supone contigüidad). Dentro de cada
// artista separa Álbumes y Canciones: así se distingue una canción de un álbum. Las valoraciones
// sin artista van a una sección propia, siempre al final.
export function groupRatingsByArtist(entries: MyRatingEntry[]): RatingArtistGroup[] {
  const byKey = new Map<string, MyRatingEntry[]>();
  for (const entry of entries) {
    const key = entry.target.artistId ?? "none";
    const bucket = byKey.get(key);
    if (bucket) bucket.push(entry);
    else byKey.set(key, [entry]);
  }
  const groups = [...byKey.entries()].map(([key, bucket]): RatingArtistGroup => {
    const first = bucket[0]!;
    const artistName = first.target.artistName;
    return {
      key,
      artistName,
      href: ratingArtistHref(first),
      byType: groupRatingsByType(bucket),
    };
  });
  return [...groups.filter((group) => group.key !== "none"), ...groups.filter((group) => group.key === "none")];
}

/**
 * Aplica la respuesta del diálogo de puntaje a la entrada. Devuelve la entrada actualizada o
 * `null` si la nota se borró (la entrada debe quitarse de la lista).
 */
export function applyRatingsResponse(
  entry: MyRatingEntry,
  ratings: RatingsResponse,
): MyRatingEntry | null {
  if (!ratings.own) return null;
  return {
    ...entry,
    stars: ratings.own.stars,
    detailedScore: ratings.own.detailedScore,
    updatedAt: ratings.own.updatedAt,
  };
}

/** Valoración de la entrada en el formato que espera el diálogo de puntaje. */
export function ownForDialog(entry: MyRatingEntry): NonNullable<RatingsResponse["own"]> {
  return {
    id: entry.id,
    stars: entry.stars,
    detailedScore: entry.detailedScore,
    createdAt: entry.updatedAt,
    updatedAt: entry.updatedAt,
  };
}
