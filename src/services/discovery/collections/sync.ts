// Orquestador de la generación de colecciones (openspec: automate-explore-collections, ADR 0033).
// Mismo patrón que el calendario de lanzamientos (ADR 0029): refresco bajo demanda con `after()`,
// sin cron; una corrida a la vez por plantilla (fila `running` bajo advisory lock); un fallo
// conserva lo anterior y no detiene a las demás plantillas.

import { after } from "next/server";
import { and, desc, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { exploreCollectionSync } from "@/db/schema";
import { COLLECTION_REFRESH_DAYS, COLLECTION_RUNNING_STALE_MS } from "../constants";
import { generateCollection } from "./generate";
import { pausedTemplateKeys } from "./state";
import { COLLECTION_TEMPLATES, findTemplate, type CollectionTemplate } from "./templates";

const REFRESH_MS = COLLECTION_REFRESH_DAYS * 24 * 60 * 60 * 1000;

export type TemplateSyncResult =
  | { key: string; status: "skipped" }
  | { key: string; status: "succeeded"; items: number; generated: boolean }
  | { key: string; status: "failed"; error: string };

/** Abre una corrida si no hay otra viva de la misma plantilla. Devuelve su id o `null`. */
async function claimRun(templateKey: string): Promise<string | null> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`explore-collection:${templateKey}`}, 0))`);
    const cutoff = new Date(Date.now() - COLLECTION_RUNNING_STALE_MS);
    const [running] = await tx
      .select({ id: exploreCollectionSync.id })
      .from(exploreCollectionSync)
      .where(
        and(
          eq(exploreCollectionSync.templateKey, templateKey),
          eq(exploreCollectionSync.status, "running"),
          gt(exploreCollectionSync.startedAt, cutoff),
        ),
      )
      .limit(1);
    if (running) return null;
    const [row] = await tx
      .insert(exploreCollectionSync)
      .values({ templateKey })
      .returning({ id: exploreCollectionSync.id });
    return row!.id;
  });
}

/** Fecha de la última corrida exitosa de una plantilla, o `null` si nunca hubo. */
export async function lastSuccessfulRunAt(templateKey: string): Promise<Date | null> {
  const [row] = await db
    .select({ finishedAt: exploreCollectionSync.finishedAt })
    .from(exploreCollectionSync)
    .where(and(eq(exploreCollectionSync.templateKey, templateKey), eq(exploreCollectionSync.status, "succeeded")))
    .orderBy(desc(exploreCollectionSync.finishedAt))
    .limit(1);
  return row?.finishedAt ?? null;
}

/** Plantillas sin corrida exitosa en los últimos `COLLECTION_REFRESH_DAYS` días (las pausadas no cuentan). */
export async function staleTemplates(now = new Date()): Promise<CollectionTemplate[]> {
  const stale: CollectionTemplate[] = [];
  const paused = await pausedTemplateKeys();
  for (const template of COLLECTION_TEMPLATES) {
    if (paused.has(template.key)) continue;
    const last = await lastSuccessfulRunAt(template.key);
    if (!last || now.getTime() - last.getTime() > REFRESH_MS) stale.push(template);
  }
  return stale;
}

/** Corre una plantilla con su lock y registra el resultado. Nunca lanza. */
export async function syncTemplate(template: CollectionTemplate, now = new Date()): Promise<TemplateSyncResult> {
  let runId: string | null;
  try {
    runId = await claimRun(template.key);
  } catch (error) {
    return { key: template.key, status: "failed", error: error instanceof Error ? error.message : String(error) };
  }
  if (!runId) return { key: template.key, status: "skipped" };

  try {
    const result = await generateCollection(template, now);
    await db
      .update(exploreCollectionSync)
      .set({ status: "succeeded", finishedAt: new Date(), itemCount: result.items })
      .where(eq(exploreCollectionSync.id, runId));
    return { key: template.key, status: "succeeded", items: result.items, generated: result.status === "generated" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db
      .update(exploreCollectionSync)
      .set({ status: "failed", finishedAt: new Date(), error: message.slice(0, 1000) })
      .where(eq(exploreCollectionSync.id, runId))
      .catch(() => undefined);
    return { key: template.key, status: "failed", error: message };
  }
}

/**
 * Corre las plantillas indicadas (en serie, aisladas). Sin `keys`, todas; con `force` ignora la
 * antigüedad de la última corrida. Las plantillas pausadas se omiten salvo `includePaused`.
 */
export async function syncCollections(
  options: { keys?: string[]; force?: boolean; includePaused?: boolean; now?: Date } = {},
): Promise<TemplateSyncResult[]> {
  const now = options.now ?? new Date();
  const wanted = options.keys
    ? options.keys.map((key) => {
        const template = findTemplate(key);
        if (!template) throw new Error(`Plantilla desconocida: ${key}`);
        return template;
      })
    : [...COLLECTION_TEMPLATES];
  let targets: CollectionTemplate[];
  if (options.force) {
    const paused = options.includePaused ? new Set<string>() : await pausedTemplateKeys();
    targets = wanted.filter((template) => !paused.has(template.key));
  } else {
    targets = (await staleTemplates(now)).filter((template) => wanted.includes(template));
  }

  const results: TemplateSyncResult[] = [];
  for (const template of targets) results.push(await syncTemplate(template, now));
  return results;
}

/**
 * Programa la regeneración de las plantillas vencidas después de responder. Fuera de una request
 * de Next (scripts, tests) `after()` no está disponible: se omite. Nunca hace fallar la página.
 */
export async function ensureCollectionsFresh(): Promise<void> {
  try {
    if ((await staleTemplates()).length === 0) return;
  } catch (error) {
    console.error("[explore-collections] no se pudo leer el estado de la generación", error);
    return;
  }
  try {
    after(() => syncCollections().then(() => undefined));
  } catch {
    console.warn("[explore-collections] generación omitida: fuera de una request");
  }
}
