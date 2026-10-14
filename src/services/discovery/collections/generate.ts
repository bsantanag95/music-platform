// Generación de una colección a partir de una plantilla (openspec: automate-explore-collections,
// ADR 0033). Idempotente: una lista por (plantilla, período), con reemplazo completo de ítems.
// Nunca hace UPDATE sobre `user_list` (su trigger de updated_at generaría eventos de feed).

import { and, desc, eq, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { appUser, userList, userListFeatured, userListItem } from "@/db/schema";
import { COLLECTION_SIZE, CURATOR_USERNAME, MIN_ALBUMS_FOR_SECTION } from "../constants";
import { createCoverResolver, type CoverResolver } from "./covers";
import { TEMPLATE_FAMILY } from "./families";
import { isSkip, type CollectionTemplate } from "./types";

export type GenerateResult =
  | { status: "generated"; listId: string; items: number; created: boolean }
  | { status: "skipped"; items: number; reason: string };

/** Lo que una plantilla elegiría ahora (sin escribir): período, título y álbumes con carátula resuelta. */
export interface CollectionPreview {
  key: string;
  periodKey: string | null;
  title: string | null;
  /** Candidatos que propuso la plantilla (antes de verificar carátulas). */
  candidates: number;
  /** Álbumes finales, todos con carátula. */
  albumIds: string[];
  /** Motivo si no llega a `MIN_ALBUMS_FOR_SECTION`; `null` si la colección es válida. */
  reason: string | null;
  coverRequests: number;
  coverBudgetExhausted: boolean;
}

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
 * Planifica una plantilla y verifica sus carátulas, sin escribir nada. Es lo que usan la generación y
 * `--dry-run`: los mismos candidatos, los mismos descartes.
 */
export async function previewCollection(
  template: CollectionTemplate,
  now = new Date(),
  covers: CoverResolver = createCoverResolver(),
): Promise<CollectionPreview> {
  const base = { key: template.key, coverRequests: 0, coverBudgetExhausted: false };
  const plan = await template.plan(now, { covers });
  if (isSkip(plan)) {
    return { ...base, periodKey: null, title: null, candidates: 0, albumIds: [], reason: plan.skip, coverRequests: covers.spent, coverBudgetExhausted: covers.exhausted };
  }
  const candidates = [...new Set(plan.candidates)];
  const albumIds = await covers.take(candidates, COLLECTION_SIZE);
  let reason: string | null = null;
  if (albumIds.length < MIN_ALBUMS_FOR_SECTION) {
    reason =
      `Solo ${albumIds.length} de ${candidates.length} candidatos tienen carátula (mínimo ${MIN_ALBUMS_FOR_SECTION})` +
      (covers.exhausted ? "; se agotó el presupuesto de carátulas" : "");
  }
  return {
    ...base,
    periodKey: plan.periodKey,
    title: plan.title,
    candidates: candidates.length,
    albumIds,
    reason,
    coverRequests: covers.spent,
    coverBudgetExhausted: covers.exhausted,
  };
}

/**
 * Genera o refresca la colección de `template` para el período de `now`. Con menos de
 * `MIN_ALBUMS_FOR_SECTION` álbumes no crea ni modifica nada (conserva lo anterior).
 */
export async function generateCollection(
  template: CollectionTemplate,
  now = new Date(),
  covers: CoverResolver = createCoverResolver(),
): Promise<GenerateResult> {
  const preview = await previewCollection(template, now, covers);
  const { albumIds, periodKey, title } = preview;
  if (preview.reason !== null || periodKey === null || title === null) {
    return { status: "skipped", items: albumIds.length, reason: preview.reason ?? "Sin colección" };
  }

  const ownerId = await curatorId();

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
        .values({ ownerId, entityType: "release-group", title, audience: "public" })
        .returning({ id: userList.id });
      listId = list!.id;
      await tx.insert(userListFeatured).values({
        listId,
        rank: previous?.rank ?? template.rank,
        weight: previous?.weight ?? template.weight,
        source: "template",
        templateKey: template.key,
        periodKey,
        // La familia se guarda en la fila (migración 0071): la plantilla la declara al escribir y la
        // colección la conserva aunque la plantilla salga del registro.
        family: TEMPLATE_FAMILY[template.key] ?? "discovery",
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
