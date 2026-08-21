import { and, eq, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import { userBlock, userFollow } from "@/db/schema";
import type { FollowRelation } from "./types";

export async function isBlockedBetween(a: string, b: string): Promise<boolean> {
  const [row] = await db
    .select({ id: userBlock.id })
    .from(userBlock)
    .where(
      and(
        or(
          and(eq(userBlock.blockerId, a), eq(userBlock.blockedId, b)),
          and(eq(userBlock.blockerId, b), eq(userBlock.blockedId, a)),
        ),
      ),
    )
    .limit(1);
  return Boolean(row);
}

/** ¿`blockerId` bloqueó a `targetId`? (dirección única, no simétrica). */
export async function isBlocking(blockerId: string, targetId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: userBlock.id })
    .from(userBlock)
    .where(and(eq(userBlock.blockerId, blockerId), eq(userBlock.blockedId, targetId)))
    .limit(1);
  return Boolean(row);
}

/**
 * Resuelve la relación observada entre un visitante y un perfil objetivo.
 * Prioridad: self > blocked (cualquier dirección) > following > requested
 * (solicitud enviada por el visitante) > incoming (solicitud pendiente
 * recibida del objetivo) > none.
 */
export async function getRelationBetween(
  viewerId: string | null,
  targetId: string,
): Promise<FollowRelation> {
  if (!viewerId) return "none";
  if (viewerId === targetId) return "self";

  if (await isBlockedBetween(viewerId, targetId)) return "blocked";

  const [outgoing] = await db
    .select({ status: userFollow.status })
    .from(userFollow)
    .where(and(eq(userFollow.followerId, viewerId), eq(userFollow.followedId, targetId)))
    .limit(1);
  if (outgoing?.status === "accepted") return "following";
  if (outgoing?.status === "pending") return "requested";

  const [incoming] = await db
    .select({ status: userFollow.status })
    .from(userFollow)
    .where(and(eq(userFollow.followerId, targetId), eq(userFollow.followedId, viewerId)))
    .limit(1);
  if (incoming?.status === "pending") return "incoming";

  return "none";
}

/**
 * Variante por lotes para listados (búsqueda, seguidores, seguidos):
 * resuelve la relación del viewer hacia cada objetivo en pocas queries.
 */
export async function relationsFor(
  viewerId: string | null,
  targetIds: string[],
): Promise<Map<string, FollowRelation>> {
  const result = new Map<string, FollowRelation>();
  if (!viewerId) return result;

  const unique = [...new Set(targetIds)];
  const others = unique.filter((id) => id !== viewerId);
  unique
    .filter((id) => id === viewerId)
    .forEach((id) => result.set(id, "self"));

  if (others.length === 0) return result;

  const [blocks, outgoing, incoming] = await Promise.all([
    db
      .select({ blockerId: userBlock.blockerId, blockedId: userBlock.blockedId })
      .from(userBlock)
      .where(
        and(
          or(eq(userBlock.blockerId, viewerId), inArray(userBlock.blockerId, others)),
          or(eq(userBlock.blockedId, viewerId), inArray(userBlock.blockedId, others)),
        ),
      ),
    db
      .select({ followedId: userFollow.followedId, status: userFollow.status })
      .from(userFollow)
      .where(and(eq(userFollow.followerId, viewerId), inArray(userFollow.followedId, others))),
    db
      .select({ followerId: userFollow.followerId, status: userFollow.status })
      .from(userFollow)
      .where(and(eq(userFollow.followedId, viewerId), inArray(userFollow.followerId, others))),
  ]);

  others.forEach((id) => {
    const blocked = blocks.some(
      (b) => (b.blockerId === viewerId && b.blockedId === id) || (b.blockerId === id && b.blockedId === viewerId),
    );
    if (blocked) {
      result.set(id, "blocked");
      return;
    }
    const out = outgoing.find((o) => o.followedId === id);
    if (out?.status === "accepted") {
      result.set(id, "following");
      return;
    }
    if (out?.status === "pending") {
      result.set(id, "requested");
      return;
    }
    const inc = incoming.find((i) => i.followerId === id);
    if (inc?.status === "pending") {
      result.set(id, "incoming");
      return;
    }
    result.set(id, "none");
  });

  return result;
}