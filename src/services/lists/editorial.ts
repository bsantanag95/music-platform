import { and, desc, eq, inArray, isNotNull, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { appUser, userList } from "@/db/schema";
import { requirePermissionForUser } from "@/services/auth/authorization";
import { CURATOR_USERNAME } from "@/services/discovery/constants";

// El contenido editorial se administra solo sobre listas de la cuenta curadora
// de `/explore` (`@exploracion`): las listas personales de otros usuarios no
// son candidatas a publicación oficial (ver docs/05-features/explore.md).
function curatorOwnerIds() {
  return db
    .select({ id: appUser.id })
    .from(appUser)
    .where(eq(appUser.username, CURATOR_USERNAME));
}

function curatorListCondition(): SQL {
  return inArray(userList.ownerId, curatorOwnerIds());
}

export async function publishOfficialList(actorId: string, listId: string) {
  await requirePermissionForUser(actorId, "editorial.publish");
  const [list] = await db
    .update(userList)
    .set({
      isOfficial: true,
      officialPublishedBy: actorId,
      officialPublishedAt: new Date(),
      officialWithdrawnAt: null,
    })
    .where(
      and(
        eq(userList.id, listId),
        eq(userList.moderationStatus, "visible"),
        curatorListCondition(),
      ),
    )
    .returning();
  return list ?? null;
}

export async function unpublishOfficialList(actorId: string, listId: string) {
  await requirePermissionForUser(actorId, "editorial.publish");
  const [list] = await db
    .update(userList)
    .set({
      isOfficial: false,
      officialPublishedBy: null,
      officialPublishedAt: null,
      officialWithdrawnAt: new Date(),
    })
    .where(and(eq(userList.id, listId), eq(userList.isOfficial, true), curatorListCondition()))
    .returning();
  return list ?? null;
}

export async function listEditorialLists(status?: "published" | "withdrawn") {
  const rows = await db
    .select({
      id: userList.id,
      title: userList.title,
      description: userList.description,
      audience: userList.audience,
      moderationStatus: userList.moderationStatus,
      isOfficial: userList.isOfficial,
      officialPublishedAt: userList.officialPublishedAt,
      officialWithdrawnAt: userList.officialWithdrawnAt,
      createdAt: userList.createdAt,
      owner: { id: appUser.id, username: appUser.username, displayName: appUser.displayName },
    })
    .from(userList)
    .innerJoin(appUser, eq(appUser.id, userList.ownerId))
    .where(
      and(
        eq(appUser.username, CURATOR_USERNAME),
        status === "published"
          ? eq(userList.isOfficial, true)
          : status === "withdrawn"
            ? isNotNull(userList.officialWithdrawnAt)
            : undefined,
      ),
    )
    .orderBy(desc(userList.createdAt));

  return rows.map((row) => ({
    ...row,
    officialPublishedAt: row.officialPublishedAt?.toISOString() ?? null,
    officialWithdrawnAt: row.officialWithdrawnAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }));
}