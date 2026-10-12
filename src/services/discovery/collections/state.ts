// Estado operativo de las plantillas de colecciones (openspec: manage-explore-featured-console,
// ADR 0034): hoy, solo si están pausadas. Sin fila = no pausada.

import { isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { exploreCollectionTemplateState } from "@/db/schema";

/** Claves de las plantillas pausadas. */
export async function pausedTemplateKeys(): Promise<Set<string>> {
  const rows = await db
    .select({ templateKey: exploreCollectionTemplateState.templateKey })
    .from(exploreCollectionTemplateState)
    .where(isNotNull(exploreCollectionTemplateState.pausedAt));
  return new Set(rows.map((row) => row.templateKey));
}
