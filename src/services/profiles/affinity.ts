import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { userFollow } from "@/db/schema";

// Cuántos de los seguidores aprobados del dueño son personas que el visitante
// también sigue (relación aceptada). Señal para el aviso de perfil privado:
// solo la cantidad, nunca las identidades (el listado de seguidores del dueño
// no es accesible para un visitante no autorizado). Ver spec profile-affinity.
export async function mutualFollowersHint(
  viewerId: string,
  ownerId: string,
): Promise<number> {
  if (viewerId === ownerId) return 0;

  const viewerFollowing = await db
    .select({ id: userFollow.followedId })
    .from(userFollow)
    .where(and(eq(userFollow.followerId, viewerId), eq(userFollow.status, "accepted")));

  const ids = viewerFollowing.map((row) => row.id);
  if (ids.length === 0) return 0;

  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(userFollow)
    .where(
      and(
        eq(userFollow.followedId, ownerId),
        eq(userFollow.status, "accepted"),
        inArray(userFollow.followerId, ids),
      ),
    );

  return row?.count ?? 0;
}
