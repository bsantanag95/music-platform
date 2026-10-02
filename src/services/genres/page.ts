import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { genre, genreFamilyMember, genreRelation, type GenreRelationKind, type GenreRow } from "@/db/schema";
import type { FamilyKey } from "./families";
import { findStyleGenreBySlug, genreWithDescendants } from "./read";

// Datos de la página de género (openspec: show-genres, capability `genre-pages`). Las relaciones
// salen de `genre_relation` y solo cuentan géneros de estilo visibles; los álbumes del género los
// lista `listAlbumsByGenre` (Explorar), con el mismo orden y paginación.

export const RELATED_GENRES_LIMIT = 8;
export const GENRE_ARTISTS_LIMIT = 12;

export interface RelatedGenre {
  slug: string;
  name: string;
  nameEs: string | null;
}

export interface GenreArtist {
  id: string;
  name: string;
  type: string;
  albumCount: number;
}

export interface GenrePageData {
  genre: GenreRow;
  families: FamilyKey[];
  parents: RelatedGenre[];
  children: RelatedGenre[];
  /** Fusión de, luego influido por; sin repetir padres, subgéneros ni el propio género. */
  related: RelatedGenre[];
  artists: GenreArtist[];
}

const relatedColumns = { id: genre.id, slug: genre.slug, name: genre.name, nameEs: genre.nameEs };

type RelatedRow = { id: string; slug: string; name: string; nameEs: string | null };
const toRelated = ({ slug, name, nameEs }: RelatedRow): RelatedGenre => ({ slug, name, nameEs });

/** Géneros de estilo a los que apunta `genreId` con `kind` (él es subgénero / fusión / influido por ellos). */
function outgoing(genreId: string, kind: GenreRelationKind) {
  return db
    .select(relatedColumns)
    .from(genreRelation)
    .innerJoin(genre, eq(genre.id, genreRelation.relatedGenreId))
    .where(and(eq(genreRelation.genreId, genreId), eq(genreRelation.kind, kind), eq(genre.kind, "style")))
    .orderBy(asc(genre.slug));
}

/** Subgéneros directos de estilo visibles. */
function childrenOf(genreId: string) {
  return db
    .select(relatedColumns)
    .from(genreRelation)
    .innerJoin(genre, eq(genre.id, genreRelation.genreId))
    .where(and(eq(genreRelation.relatedGenreId, genreId), eq(genreRelation.kind, "subgenre_of"), eq(genre.kind, "style")))
    .orderBy(asc(genre.slug));
}

/**
 * Artistas con el género o un subgénero entre sus semillas, por álbumes acreditados (desempate por
 * nombre). Un artista cuenta una vez aunque tenga varios géneros del subárbol.
 */
async function artistsOfGenre(genreId: string): Promise<GenreArtist[]> {
  const rows = await db.execute<{ id: string; name: string; type: string; album_count: number }>(sql`
    SELECT a.id, a.name, a.type,
           (SELECT count(DISTINCT c.release_group_id)::int FROM credit c
            WHERE c.artist_id = a.id AND c.release_group_id IS NOT NULL) AS album_count
    FROM artist a
    WHERE a.type <> 'unknown' AND EXISTS (
      SELECT 1 FROM artist_genre_seed s WHERE s.artist_id = a.id AND s.genre_id IN ${genreWithDescendants(genreId)}
    )
    ORDER BY album_count DESC, a.name ASC
    LIMIT ${GENRE_ARTISTS_LIMIT}
  `);
  return rows.map((r) => ({ id: r.id, name: r.name, type: r.type, albumCount: r.album_count }));
}

/** Todo lo que necesita la página de `/genre/<slug>`, o `null` si el slug no es un estilo visible. */
export async function getGenrePage(slug: string): Promise<GenrePageData | null> {
  const found = await findStyleGenreBySlug(slug);
  if (!found) return null;

  const [families, parents, children, fusionOf, influencedBy, artists] = await Promise.all([
    db.select({ key: genreFamilyMember.familyKey }).from(genreFamilyMember).where(eq(genreFamilyMember.genreId, found.id)),
    outgoing(found.id, "subgenre_of"),
    childrenOf(found.id),
    outgoing(found.id, "fusion_of"),
    outgoing(found.id, "influenced_by"),
    artistsOfGenre(found.id),
  ]);

  const taken = new Set([found.id, ...parents.map((g) => g.id), ...children.map((g) => g.id)]);
  const related: RelatedRow[] = [];
  for (const g of [...fusionOf, ...influencedBy]) {
    if (!taken.has(g.id)) {
      taken.add(g.id);
      related.push(g);
    }
  }

  return {
    genre: found,
    families: families.map((f) => f.key as FamilyKey),
    parents: parents.map(toRelated),
    children: children.map(toRelated),
    related: related.slice(0, RELATED_GENRES_LIMIT).map(toRelated),
    artists,
  };
}

