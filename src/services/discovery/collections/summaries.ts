import { and, asc, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { userListItem } from "@/db/schema";
import { HUB_SUMMARY_LIMIT } from "../constants";
import type { FeaturedCollection } from "../discovery";
import { COLLECTION_FAMILIES, type CollectionFamily } from "./families";
import { TEMPLATE_PRESENTERS } from "./presenters";
import { resolveContext, type PresenterRegistry } from "./presenters/resolve";
import type { CollectionPresenter, MessageRef } from "./presenters/types";

// Frase de contexto de cada tarjeta de `/explore/collections` (openspec: redesign-collections-hub, ADR 0040): el
// resumen que el presentador de la plantilla ya produce para el detalle de la colección, sin cartelas ni grupos.

// Los presentadores de familia solo ponen cartelas por disco (no tienen resumen): en el hub no aportan y harían una
// lectura de fechas por colección para nada. Sin respaldo de familia, una plantilla sin presentador propio no lleva línea.
const sinRespaldo: CollectionPresenter = async () => null;
const REGISTRY: PresenterRegistry = {
  byTemplate: TEMPLATE_PRESENTERS,
  byFamily: Object.fromEntries(COLLECTION_FAMILIES.map((family) => [family, sinRespaldo])) as Record<
    CollectionFamily,
    CollectionPresenter
  >,
};

/**
 * Resumen (mensaje por traducir) de cada colección generada que tenga presentador con resumen, por id de lista. Lee los
 * álbumes de todas las colecciones en **un solo lote** y corre un presentador por colección, en paralelo; cada
 * presentador ya consulta por lote, no por disco. Las curadas y las que no producen resumen no aparecen en el resultado.
 * Un fallo en una colección la deja sin línea y no afecta a las demás. Solo se calculan las primeras `HUB_SUMMARY_LIMIT`.
 */
export async function listCollectionSummaries(
  collections: FeaturedCollection[],
  today: Date = new Date(),
): Promise<Map<string, MessageRef>> {
  const candidates = collections
    .filter((collection) => collection.source === "template" && collection.templateKey && TEMPLATE_PRESENTERS[collection.templateKey])
    .slice(0, HUB_SUMMARY_LIMIT);
  const summaries = new Map<string, MessageRef>();
  if (candidates.length === 0) return summaries;

  const rows = await db
    .select({ listId: userListItem.listId, albumId: userListItem.releaseGroupId })
    .from(userListItem)
    .where(and(inArray(userListItem.listId, candidates.map((collection) => collection.id)), isNotNull(userListItem.releaseGroupId)))
    .orderBy(asc(userListItem.listId), asc(userListItem.position));
  const albumsByList = new Map<string, string[]>();
  for (const row of rows) {
    const albums = albumsByList.get(row.listId) ?? [];
    albums.push(row.albumId!);
    albumsByList.set(row.listId, albums);
  }

  await Promise.all(
    candidates.map(async (collection) => {
      try {
        const context = await resolveContext(REGISTRY, {
          templateKey: collection.templateKey,
          periodKey: collection.periodKey,
          family: collection.family,
          albumIds: albumsByList.get(collection.id) ?? [],
          today,
        });
        if (context.summary) summaries.set(collection.id, context.summary);
      } catch (error) {
        console.error("No se pudo calcular el resumen de una colección", collection.templateKey, error);
      }
    }),
  );
  return summaries;
}
