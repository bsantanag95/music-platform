import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { genre, genreFamilyMember, genreRelation, type GenreRelationKind, type GenreRow } from "@/db/schema";
import type { FamilyKey } from "./families";
import { genreDisplayName, type GenreLocale } from "./names";
import { findStyleGenreBySlug } from "./read";

// Identidad y árbol de la página de género (openspec: show-genres y redesign-genre-page,
// capabilities `genre-pages` y `genre-page-overview`). Las relaciones salen de `genre_relation` y solo
// cuentan géneros de estilo visibles. Estadísticas, artistas, rieles, listas y reseñas viven en sus
// propios módulos: cada pestaña consulta solo lo que muestra.

export const RELATED_GENRES_LIMIT = 8;

export interface RelatedGenre {
  slug: string;
  name: string;
  nameEs: string | null;
}

/** Subgénero directo con la cantidad de álbumes de su subárbol. */
export interface TreeGenre extends RelatedGenre {
  albumCount: number;
}

export interface GenrePageData {
  genre: GenreRow;
  families: FamilyKey[];
  parents: RelatedGenre[];
  /** Subgéneros directos, del más grande al más pequeño (desempate por nombre). */
  children: TreeGenre[];
  /** Fusión de, luego influido por; sin repetir padres, subgéneros ni el propio género. */
  related: RelatedGenre[];
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
 * Cantidad de álbumes del subárbol de cada subgénero directo de `genreId`, en una sola consulta
 * (no una por subgénero). Un subgénero sin álbumes no figura en el resultado.
 */
export async function childAlbumCounts(genreId: string): Promise<Map<string, number>> {
  const rows = await db.execute<{ id: string; album_count: number }>(sql`
    WITH RECURSIVE sub(root_id, id) AS (
      SELECT r.genre_id, r.genre_id
      FROM genre_relation r
      WHERE r.related_genre_id = ${genreId}::uuid AND r.kind = 'subgenre_of'
      UNION
      SELECT s.root_id, r.genre_id
      FROM genre_relation r
      JOIN sub s ON r.related_genre_id = s.id
      WHERE r.kind = 'subgenre_of'
    )
    SELECT sub.root_id AS id, count(DISTINCT e.release_group_id)::int AS album_count
    FROM sub
    JOIN release_group_effective_genre e ON e.genre_id = sub.id
    GROUP BY sub.root_id
  `);
  return new Map(rows.map((r) => [r.id, Number(r.album_count)]));
}

/** Del más grande al más pequeño; a igualdad, por el nombre que ve la persona en su idioma. */
export function sortTreeChildren(children: TreeGenre[], locale: GenreLocale): TreeGenre[] {
  return [...children].sort(
    (a, b) =>
      b.albumCount - a.albumCount ||
      genreDisplayName(a, locale).localeCompare(genreDisplayName(b, locale), locale) ||
      a.slug.localeCompare(b.slug),
  );
}

/** Identidad, familias y árbol de `/genre/<slug>`, o `null` si el slug no es un estilo visible. */
export async function getGenrePage(slug: string, locale: GenreLocale = "es"): Promise<GenrePageData | null> {
  const found = await findStyleGenreBySlug(slug);
  if (!found) return null;

  const [families, parents, children, fusionOf, influencedBy, counts] = await Promise.all([
    db.select({ key: genreFamilyMember.familyKey }).from(genreFamilyMember).where(eq(genreFamilyMember.genreId, found.id)),
    outgoing(found.id, "subgenre_of"),
    childrenOf(found.id),
    outgoing(found.id, "fusion_of"),
    outgoing(found.id, "influenced_by"),
    childAlbumCounts(found.id),
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
    children: sortTreeChildren(
      children.map((g) => ({ ...toRelated(g), albumCount: counts.get(g.id) ?? 0 })),
      locale,
    ),
    related: related.slice(0, RELATED_GENRES_LIMIT).map(toRelated),
  };
}
