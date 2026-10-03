import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { artistGenreSeed, genre, releaseGroupEffectiveGenre } from "@/db/schema";
import { rankGenres, type GenreRank } from "./rank";
import { albumDescriptors, type DescriptorKey } from "./read";

// Géneros para mostrar en las cabeceras de artista, álbum y canción (openspec: show-genres,
// capability `genre-display`). Los ocultos y los descriptores nunca salen como géneros: la vista
// de géneros efectivos ya los excluye y la consulta del artista filtra por `kind = 'style'`.

export interface DisplayGenre {
  slug: string;
  name: string;
  nameEs: string | null;
  /** Tomado del artista (álbum sin semillas propias) o, en una canción, del álbum. */
  inherited: boolean;
  /** Solo en álbumes con géneros propios: principal, secundario u otro por puntaje (add-genre-votes). */
  rank?: GenreRank;
}

export interface EntityGenres {
  genres: DisplayGenre[];
  descriptors: DescriptorKey[];
}

/** Máximo de géneros que se piden por entidad (la interfaz muestra 5 y un "+N"). */
export const DISPLAY_GENRES_LIMIT = 8;

const genreColumns = { slug: genre.slug, name: genre.name, nameEs: genre.nameEs };

/** Géneros semilla de estilo del artista, en el orden de Wikidata. */
export async function getArtistGenres(artistId: string): Promise<EntityGenres> {
  const rows = await db
    .select(genreColumns)
    .from(artistGenreSeed)
    .innerJoin(genre, eq(genre.id, artistGenreSeed.genreId))
    .where(and(eq(artistGenreSeed.artistId, artistId), eq(genre.kind, "style")))
    .orderBy(asc(artistGenreSeed.position))
    .limit(DISPLAY_GENRES_LIMIT);
  return { genres: rows.map((r) => ({ ...r, inherited: false })), descriptors: [] };
}

/** Géneros efectivos de estilo del álbum (con herencia) y sus descriptores. */
export async function getAlbumGenres(releaseGroupId: string): Promise<EntityGenres> {
  const [rows, descriptors] = await Promise.all([
    db
      .select({ ...genreColumns, inherited: releaseGroupEffectiveGenre.inherited, score: releaseGroupEffectiveGenre.score })
      .from(releaseGroupEffectiveGenre)
      .innerJoin(genre, eq(genre.id, releaseGroupEffectiveGenre.genreId))
      .where(and(eq(releaseGroupEffectiveGenre.releaseGroupId, releaseGroupId), eq(genre.kind, "style")))
      .orderBy(asc(releaseGroupEffectiveGenre.position))
      .limit(DISPLAY_GENRES_LIMIT),
    albumDescriptors([releaseGroupId]),
  ]);
  // El puntaje no sale de aquí (lo expone el panel de votos); los heredados no llevan rango.
  const genres = rankGenres(rows).map((g) => ({
    slug: g.slug,
    name: g.name,
    nameEs: g.nameEs,
    inherited: g.inherited,
    ...(g.inherited ? {} : { rank: g.rank }),
  }));
  return { genres, descriptors: descriptors.get(releaseGroupId) ?? [] };
}

/**
 * Géneros de una canción: los del disco principal, siempre marcados como heredados (la canción
 * no tiene géneros propios). Sin disco principal no hay nada. Los descriptores del disco no
 * aplican a la canción.
 */
export async function getSongGenres(principalReleaseGroupId: string | null): Promise<EntityGenres> {
  if (!principalReleaseGroupId) return { genres: [], descriptors: [] };
  const album = await getAlbumGenres(principalReleaseGroupId);
  return { genres: album.genres.map((g) => ({ slug: g.slug, name: g.name, nameEs: g.nameEs, inherited: true })), descriptors: [] };
}
