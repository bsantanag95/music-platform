import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { collectionEntry, favorite, listenEntry, rating, userList } from "@/db/schema";
import { audiencesForProfile } from "@/services/social/visibility";
import type { Audience } from "@/services/social/types";

async function maxTimestamp(
  query: Promise<{ t: Date | null }[]> | null,
): Promise<Date | null> {
  if (!query) return null;
  const [row] = await query;
  return row?.t ?? null;
}

// Fecha de la señal más reciente del dueño visible para el visitante: la
// última escucha, favorito, valoración, lista o entrada de colección que el
// visitante tiene permitido ver. Devuelve null si no hay acceso o no hay
// actividad visible. Ver spec social-profiles ("La actividad reciente").
export async function getProfileRecency(
  username: string,
  viewerId: string | null,
): Promise<Date | null> {
  const { getProfileByUsername } = await import("@/services/social/profiles");
  const profile = await getProfileByUsername(username, viewerId);
  if (!profile.accessible) return null;

  const audiences = audiencesForProfile(profile) as Audience[];
  const ratingsVisible = profile.relation === "self" || profile.relation === "following";
  const byAudience = audiences.length > 0;

  const parts = await Promise.all([
    maxTimestamp(
      byAudience
        ? db
            .select({ t: sql<Date | null>`max(${listenEntry.createdAt})` })
            .from(listenEntry)
            .where(
              and(
                eq(listenEntry.userId, profile.id),
                inArray(listenEntry.audience, audiences),
              ),
            )
        : null,
    ),
    maxTimestamp(
      byAudience
        ? db
            .select({ t: sql<Date | null>`max(${favorite.createdAt})` })
            .from(favorite)
            .where(and(eq(favorite.userId, profile.id), inArray(favorite.audience, audiences)))
        : null,
    ),
    maxTimestamp(
      byAudience
        ? db
            .select({ t: sql<Date | null>`max(${userList.updatedAt})` })
            .from(userList)
            .where(and(eq(userList.ownerId, profile.id), inArray(userList.audience, audiences)))
        : null,
    ),
    maxTimestamp(
      byAudience
        ? db
            .select({ t: sql<Date | null>`max(${collectionEntry.updatedAt})` })
            .from(collectionEntry)
            .where(
              and(
                eq(collectionEntry.userId, profile.id),
                inArray(collectionEntry.audience, audiences),
              ),
            )
        : null,
    ),
    maxTimestamp(
      ratingsVisible
        ? db
            .select({ t: sql<Date | null>`max(${rating.updatedAt})` })
            .from(rating)
            .where(eq(rating.userId, profile.id))
        : null,
    ),
  ]);

  const latest = parts
    .filter((value): value is Date => value instanceof Date)
    .sort((a, b) => b.getTime() - a.getTime())[0];

  return latest ?? null;
}
