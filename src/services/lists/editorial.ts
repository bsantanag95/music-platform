import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { userList } from "@/db/schema";
import { requirePermissionForUser } from "@/services/auth/authorization";

export async function publishOfficialList(actorId: string, listId: string) {
  await requirePermissionForUser(actorId, "editorial.publish");
  const [list] = await db
    .update(userList)
    .set({ isOfficial: true, officialPublishedBy: actorId, officialPublishedAt: new Date() })
    .where(eq(userList.id, listId))
    .returning();
  return list ?? null;
}

export async function unpublishOfficialList(actorId: string, listId: string) {
  await requirePermissionForUser(actorId, "editorial.publish");
  const [list] = await db
    .update(userList)
    .set({ isOfficial: false, officialPublishedBy: null, officialPublishedAt: null })
    .where(and(eq(userList.id, listId), eq(userList.isOfficial, true)))
    .returning();
  return list ?? null;
}
