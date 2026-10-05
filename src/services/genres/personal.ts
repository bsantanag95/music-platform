import { and, desc, eq, sql } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import { appUser, rating, releaseGroup, wantToListenEntry } from "@/db/schema";
import { activeUserCondition } from "@/services/auth/account-status";
import { COMMUNITY_MIN_COUNT } from "./constants";
import { FOOTPRINT_FAVORITES, type GenreFootprint } from "./footprint";
import { albumInGenreTreeOnce } from "./read";

export { FOOTPRINT_FAVORITES, footprintIsEmpty, type GenreFootprint, type GenreFootprintFavorite } from "./footprint";

// Relación de una persona con un género (openspec: redesign-genre-page, capability
// `genre-page-personal`): su huella en el género y "Me mueve". Los datos personales solo se calculan
// con sesión y solo del propio lector; las cifras de otras personas son agregados con umbral.

/** Huella del lector en el género: valoraciones, media, favoritos y pendientes del subárbol. */
export async function getGenreFootprint(userId: string, genreId: string): Promise<GenreFootprint> {
  const tree = albumInGenreTreeOnce(genreId);
  const [totals, top, pending] = await Promise.all([
    db
      .select({ ratedCount: sql<number>`count(*)::int`, averageStars: sql<number | null>`avg(${rating.stars})::float` })
      .from(rating)
      .innerJoin(releaseGroup, eq(releaseGroup.id, rating.releaseGroupId))
      .where(and(eq(rating.userId, userId), tree)),
    db
      .select({ id: releaseGroup.id, title: releaseGroup.title, stars: rating.stars })
      .from(rating)
      .innerJoin(releaseGroup, eq(releaseGroup.id, rating.releaseGroupId))
      .where(and(eq(rating.userId, userId), tree))
      .orderBy(desc(rating.stars), desc(rating.updatedAt), desc(rating.id))
      .limit(FOOTPRINT_FAVORITES),
    db
      .select({ pendingCount: sql<number>`count(*)::int` })
      .from(wantToListenEntry)
      .innerJoin(releaseGroup, eq(releaseGroup.id, wantToListenEntry.releaseGroupId))
      .where(and(eq(wantToListenEntry.userId, userId), tree)),
  ]);

  const rated = Number(totals[0]?.ratedCount ?? 0);
  return {
    ratedCount: rated,
    averageStars: rated > 0 ? (totals[0]?.averageStars ?? null) : null,
    favorites: top.map((row) => ({ id: row.id, title: row.title, stars: Number(row.stars) })),
    pendingCount: Number(pending[0]?.pendingCount ?? 0),
  };
}

/** ¿El género está en "Géneros que me mueven" de la persona? (estado inicial del botón "Me mueve"). */
export const isGenreInIdentity = cache(async (userId: string, slug: string): Promise<boolean> => {
  const [row] = await db
    .select({ declared: sql<boolean>`${slug} = ANY(${appUser.genres})` })
    .from(appUser)
    .where(eq(appUser.id, userId))
    .limit(1);
  return row?.declared === true;
});

/**
 * Personas que declaran exactamente este género en su identidad musical: cuentas activas con perfil
 * público. `null` bajo `COMMUNITY_MIN_COUNT` (nunca una cifra pequeña ni una lista de nombres). Es el
 * mismo número para cualquier visitante. Usa contención de arreglos (`@>`) y no `= ANY(...)` para poder
 * apoyarse en el índice GIN `idx_app_user_genres` (migración 0059).
 */
export async function getMovedByCount(slug: string): Promise<number | null> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(appUser)
    .where(and(sql`${appUser.genres} @> ARRAY[${slug}]::text[]`, eq(appUser.profileVisibility, "public"), activeUserCondition()));
  const n = Number(row?.n ?? 0);
  return n >= COMMUNITY_MIN_COUNT ? n : null;
}
