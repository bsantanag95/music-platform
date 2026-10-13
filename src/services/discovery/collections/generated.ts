// Referencias de las colecciones generadas (openspec: localize-collection-titles, ADR 0037): dado un conjunto de
// listas, cuáles son colecciones generadas por plantilla y de qué plantilla y período. Las superficies que leen
// listas por otro camino (guardadas, listas en seguimiento, ruta de usuario) las usan para localizar el título y
// enlazar a la ruta de colecciones.

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { userList, userListFeatured } from "@/db/schema";
import type { GeneratedRef } from "./titles";

/** Plantilla y período de cada lista que es una colección generada; las demás no aparecen en el mapa. */
export async function generatedRefsFor(listIds: string[]): Promise<Map<string, GeneratedRef>> {
  const refs = new Map<string, GeneratedRef>();
  if (listIds.length === 0) return refs;
  const rows = await db
    .select({
      listId: userListFeatured.listId,
      templateKey: userListFeatured.templateKey,
      periodKey: userListFeatured.periodKey,
    })
    .from(userListFeatured)
    .where(and(eq(userListFeatured.source, "template"), inArray(userListFeatured.listId, listIds)));
  for (const row of rows) {
    if (row.templateKey && row.periodKey) refs.set(row.listId, { templateKey: row.templateKey, periodKey: row.periodKey });
  }
  return refs;
}

export interface GeneratedCollection extends GeneratedRef {
  storedTitle: string;
}

/**
 * La colección generada con ese id, si existe y se puede ver: fila `template`, lista estándar, pública y visible.
 * `null` si es una lista personal, una colección curada, está oculta o no es pública.
 */
export async function findGeneratedCollection(listId: string): Promise<GeneratedCollection | null> {
  const [row] = await db
    .select({
      title: userList.title,
      templateKey: userListFeatured.templateKey,
      periodKey: userListFeatured.periodKey,
    })
    .from(userListFeatured)
    .innerJoin(userList, eq(userList.id, userListFeatured.listId))
    .where(
      and(
        eq(userListFeatured.listId, listId),
        eq(userListFeatured.source, "template"),
        eq(userList.audience, "public"),
        eq(userList.kind, "standard"),
        eq(userList.moderationStatus, "visible"),
      ),
    )
    .limit(1);
  if (!row?.templateKey || !row.periodKey) return null;
  return { templateKey: row.templateKey, periodKey: row.periodKey, storedTitle: row.title };
}
