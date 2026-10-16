import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { genre, genreFamilyMember, releaseGroupEffectiveGenre } from "@/db/schema";
import { createTtlCache, type TtlCache } from "@/lib/ttl-cache";
import { parseFamilyKey } from "@/services/genres/read";

// Géneros de una familia para la vista `/explore?familia=` (openspec: redesign-family-view): los más grandes, cada uno con su
// página completa a un clic. El número de discos se usa solo para ordenar y no se muestra: lo que la base ha guardado crece con
// cada artista que alguien abre y no dice nada del género (lección del cambio de tarjetas de familia).

/** Cuántos géneros muestra la fila. */
export const FAMILY_GENRES_LIMIT = 12;

/** Cuánto vale el resultado en memoria: la consulta tarda ~0,4 s en frío y la lista cambia muy despacio. */
export const FAMILY_GENRES_TTL_MS = 6 * 60 * 60 * 1000;

export interface FamilyGenre {
  slug: string;
  name: string;
  nameEs: string | null;
}

/**
 * Los géneros de estilo de la familia con más discos (por género efectivo, con herencia), del mayor al menor y con el slug
 * como desempate. Incluye el género raíz (`rock` dentro de Rock): es justo el acceso a la ficha completa de la familia.
 */
async function queryFamilyGenres(familyKey: string, limit: number): Promise<FamilyGenre[]> {
  const count = sql<number>`count(distinct ${releaseGroupEffectiveGenre.releaseGroupId})`;
  return db
    .select({ slug: genre.slug, name: genre.name, nameEs: genre.nameEs })
    .from(genreFamilyMember)
    .innerJoin(genre, and(eq(genre.id, genreFamilyMember.genreId), eq(genre.kind, "style")))
    .innerJoin(releaseGroupEffectiveGenre, eq(releaseGroupEffectiveGenre.genreId, genre.id))
    .where(eq(genreFamilyMember.familyKey, familyKey))
    .groupBy(genre.id)
    .orderBy(desc(count), genre.slug)
    .limit(limit);
}

// Una caché por familia: se lee la de la familia que se abre, no las veinte.
const caches = new Map<string, TtlCache<FamilyGenre[]>>();

function cacheFor(familyKey: string): TtlCache<FamilyGenre[]> {
  let cache = caches.get(familyKey);
  if (!cache) {
    cache = createTtlCache<FamilyGenre[]>({
      ttlMs: FAMILY_GENRES_TTL_MS,
      load: () => queryFamilyGenres(familyKey, FAMILY_GENRES_LIMIT),
      onError: () => [],
      errorLabel: `No se pudieron leer los géneros de la familia ${familyKey}`,
    });
    caches.set(familyKey, cache);
  }
  return cache;
}

/**
 * Hasta `FAMILY_GENRES_LIMIT` géneros de la familia, con caché en memoria. Una clave desconocida devuelve `[]` sin consultar.
 * Un error devuelve `[]` (la vista no pinta la fila) y no se cachea.
 */
export async function listFamilyGenres(familyKey: string, now: number = Date.now()): Promise<FamilyGenre[]> {
  const family = parseFamilyKey(familyKey);
  if (!family) return [];
  return cacheFor(family).get(now);
}

/** Solo para pruebas: vacía las cachés. */
export function resetFamilyGenresCache(): void {
  caches.clear();
}
