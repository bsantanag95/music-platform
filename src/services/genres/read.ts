import { and, eq, inArray, ne, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { genre, releaseGroup, releaseGroupEffectiveGenre, type GenreRow } from "@/db/schema";
import { isFamilyKey, type FamilyKey } from "./families";
import { genreDisplayName, type GenreLocale } from "./names";
import { GENRE_SLUG_PATTERN } from "./slug";

// Lecturas de la taxonomía de géneros (openspec: add-genre-taxonomy, capability
// `genre-taxonomy`). Nombres por idioma, búsqueda por slug, subgéneros y descriptores. Las
// lecturas de álbumes usan la vista `release_group_effective_genre` (con herencia).

export { genreDisplayName, type GenreLocale } from "./names";

/** Género de estilo por slug; `null` si no existe, tiene formato inválido o no es un estilo visible. */
export async function findStyleGenreBySlug(slug: string): Promise<GenreRow | null> {
  const normalized = slug.trim().toLowerCase();
  if (!GENRE_SLUG_PATTERN.test(normalized) || normalized.length > 120) return null;
  const [row] = await db
    .select()
    .from(genre)
    .where(and(eq(genre.slug, normalized), eq(genre.kind, "style")))
    .limit(1);
  return row ?? null;
}

/** Clave de familia válida o `null` (las URLs y la API reciben texto libre). */
export function parseFamilyKey(value: string): FamilyKey | null {
  const normalized = value.trim().toLowerCase();
  return isFamilyKey(normalized) ? normalized : null;
}

/**
 * Subconsulta con el género y todos sus descendientes por "subgénero de" (CTE recursiva; tolera
 * ciclos porque `UNION` descarta repetidos). Uso: `inArray`-like con `IN (...)`.
 */
export function genreWithDescendants(rootId: string): SQL {
  return sql`(
    WITH RECURSIVE descendants(id) AS (
      SELECT ${rootId}::uuid
      UNION
      SELECT r.genre_id
      FROM genre_relation r
      JOIN descendants d ON r.related_genre_id = d.id
      WHERE r.kind = 'subgenre_of'
    )
    SELECT id FROM descendants
  )`;
}

// Las condiciones se correlacionan con la consulta exterior por el literal "release_group"."id":
// en un SELECT sin joins Drizzle renderiza `${releaseGroup.id}` como "id" a secas (ambiguo dentro
// del EXISTS).

/** Condición: el álbum de la consulta exterior tiene algún género efectivo de estilo de la familia. */
export function albumInFamily(familyKey: FamilyKey): SQL {
  return sql`EXISTS (
    SELECT 1
    FROM release_group_effective_genre e
    JOIN genre_family_member m ON m.genre_id = e.genre_id
    JOIN genre g ON g.id = e.genre_id
    WHERE e.release_group_id = "release_group"."id" AND m.family_key = ${familyKey} AND g.kind = 'style'
  )`;
}

/** Condición: el álbum de la consulta exterior tiene ese género efectivo o uno de sus subgéneros. */
export function albumInGenreTree(genreId: string): SQL {
  return sql`EXISTS (
    SELECT 1
    FROM release_group_effective_genre e
    WHERE e.release_group_id = "release_group"."id" AND e.genre_id IN ${genreWithDescendants(genreId)}
  )`;
}

export const DESCRIPTOR_KEYS = ["instrumental", "christmas", "orchestral", "soundtrack"] as const;
export type DescriptorKey = (typeof DESCRIPTOR_KEYS)[number];

/** Descriptor de la interfaz para cada género descriptor de MusicBrainz. */
const DESCRIPTOR_BY_GENRE: Record<string, DescriptorKey> = {
  instrumental: "instrumental",
  "christmas music": "christmas",
  orchestral: "orchestral",
};

/**
 * Descriptores de un álbum: sus géneros efectivos de clase descriptor y "Banda sonora" cuando su
 * tipo secundario de MusicBrainz es `Soundtrack` (no es un género en MusicBrainz).
 */
export function descriptorsOf(descriptorGenreNames: readonly string[], secondaryTypes: readonly string[] | null): DescriptorKey[] {
  const keys = new Set<DescriptorKey>();
  for (const name of descriptorGenreNames) {
    const key = DESCRIPTOR_BY_GENRE[name];
    if (key) keys.add(key);
  }
  if (secondaryTypes?.includes("Soundtrack")) keys.add("soundtrack");
  return DESCRIPTOR_KEYS.filter((k) => keys.has(k));
}

/** Descriptores de varios álbumes en una consulta. */
export async function albumDescriptors(releaseGroupIds: string[]): Promise<Map<string, DescriptorKey[]>> {
  if (releaseGroupIds.length === 0) return new Map();
  const [albums, descriptorGenres] = await Promise.all([
    db
      .select({ id: releaseGroup.id, secondaryTypes: releaseGroup.secondaryTypes })
      .from(releaseGroup)
      .where(inArray(releaseGroup.id, releaseGroupIds)),
    db
      .select({ releaseGroupId: releaseGroupEffectiveGenre.releaseGroupId, name: genre.name })
      .from(releaseGroupEffectiveGenre)
      .innerJoin(genre, eq(genre.id, releaseGroupEffectiveGenre.genreId))
      .where(and(inArray(releaseGroupEffectiveGenre.releaseGroupId, releaseGroupIds), eq(genre.kind, "descriptor"))),
  ]);
  const namesByAlbum = new Map<string, string[]>();
  for (const row of descriptorGenres) namesByAlbum.set(row.releaseGroupId, [...(namesByAlbum.get(row.releaseGroupId) ?? []), row.name]);
  return new Map(albums.map((a) => [a.id, descriptorsOf(namesByAlbum.get(a.id) ?? [], a.secondaryTypes)]));
}

/** Nombres localizados de varios géneros de estilo por slug (identidad musical, etc.). */
export async function genreNamesBySlug(slugs: readonly string[], locale: GenreLocale): Promise<Map<string, string>> {
  if (slugs.length === 0) return new Map();
  const rows = await db
    .select({ slug: genre.slug, name: genre.name, nameEs: genre.nameEs })
    .from(genre)
    .where(and(inArray(genre.slug, [...slugs]), ne(genre.kind, "hidden")));
  return new Map(rows.map((r) => [r.slug, genreDisplayName(r, locale)]));
}

/**
 * Etiquetas de los géneros de "Géneros que me mueven" en el idioma pedido. Un slug que ya no es un
 * estilo visible (género retirado u oculto) no figura en el resultado: se ignora al mostrar y lo
 * guardado no se toca (openspec: show-genres, D5).
 */
export async function identityGenreLabels(slugs: readonly string[], locale: GenreLocale): Promise<Record<string, string>> {
  if (slugs.length === 0) return {};
  const rows = await db
    .select({ slug: genre.slug, name: genre.name, nameEs: genre.nameEs })
    .from(genre)
    .where(and(inArray(genre.slug, [...slugs]), eq(genre.kind, "style")));
  return Object.fromEntries(rows.map((r) => [r.slug, genreDisplayName(r, locale)]));
}
