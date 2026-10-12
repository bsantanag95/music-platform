// Generación de una colección a partir de una plantilla (openspec: automate-explore-collections,
// ADR 0033). Idempotente: una lista por (plantilla, período), con reemplazo completo de ítems.
// Nunca hace UPDATE sobre `user_list` (su trigger de updated_at generaría eventos de feed).

import { and, desc, eq, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { appUser, userList, userListFeatured, userListItem } from "@/db/schema";
import { CURATOR_USERNAME, MIN_ALBUMS_FOR_SECTION } from "../constants";
import type { CollectionTemplate } from "./templates";

export type GenerateResult =
  | { status: "generated"; listId: string; items: number; created: boolean }
  | { status: "skipped"; items: number };

async function curatorId(): Promise<string> {
  const [row] = await db
    .select({ id: appUser.id })
    .from(appUser)
    .where(eq(appUser.username, CURATOR_USERNAME))
    .limit(1);
  if (!row) {
    throw new Error(`No existe la cuenta curadora @${CURATOR_USERNAME}; correr scripts/seed-discovery.ts`);
  }
  return row.id;
}

/**
 * Genera o refresca la colección de `template` para el período de `now`. Con menos de
 * `MIN_ALBUMS_FOR_SECTION` álbumes no crea ni modifica nada (conserva lo anterior).
 */
export async function generateCollection(template: CollectionTemplate, now = new Date()): Promise<GenerateResult> {
  const albumIds = [...new Set(await template.select(now))];
  if (albumIds.length < MIN_ALBUMS_FOR_SECTION) return { status: "skipped", items: albumIds.length };

  const ownerId = await curatorId();
  const periodKey = template.periodKey(now);

  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ listId: userListFeatured.listId })
      .from(userListFeatured)
      .where(
        and(
          eq(userListFeatured.source, "template"),
          eq(userListFeatured.templateKey, template.key),
          eq(userListFeatured.periodKey, periodKey),
        ),
      )
      .limit(1);

    let listId = existing?.listId;
    const created = !listId;
    if (!listId) {
      // Una lista de período nuevo hereda el peso y el rank de la anterior de la plantilla: así el
      // orden que fijó el equipo editorial sobrevive a la rotación.
      const [previous] = await tx
        .select({ rank: userListFeatured.rank, weight: userListFeatured.weight })
        .from(userListFeatured)
        .where(
          and(
            eq(userListFeatured.source, "template"),
            eq(userListFeatured.templateKey, template.key),
            ne(userListFeatured.periodKey, periodKey),
            isNull(userListFeatured.expiresAt),
          ),
        )
        .orderBy(desc(userListFeatured.startsAt))
        .limit(1);
      const [list] = await tx
        .insert(userList)
        .values({ ownerId, entityType: "release-group", title: template.title(now), audience: "public" })
        .returning({ id: userList.id });
      listId = list!.id;
      await tx.insert(userListFeatured).values({
        listId,
        rank: previous?.rank ?? template.rank,
        weight: previous?.weight ?? 0,
        source: "template",
        templateKey: template.key,
        periodKey,
      });
      // Rotación: el período anterior de la misma plantilla sale del riel (la lista sigue pública).
      await tx
        .update(userListFeatured)
        .set({ expiresAt: sql`greatest(now(), ${userListFeatured.startsAt} + interval '1 millisecond')` })
        .where(
          and(
            eq(userListFeatured.source, "template"),
            eq(userListFeatured.templateKey, template.key),
            ne(userListFeatured.periodKey, periodKey),
            isNull(userListFeatured.expiresAt),
          ),
        );
    }

    // Reemplazo completo, en el orden del selector.
    await tx.delete(userListItem).where(eq(userListItem.listId, listId));
    await tx
      .insert(userListItem)
      .values(albumIds.map((releaseGroupId, index) => ({ listId: listId!, releaseGroupId, position: index + 1 })));

    return { status: "generated", listId, items: albumIds.length, created } as const;
  });
}
