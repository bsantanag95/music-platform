// Fusión de conciertos duplicados (openspec: add-shared-concerts-phase2, ADR 0058). La usan la moderación (fusión
// manual) y la sincronización de MusicBrainz (un concierto de la comunidad que MusicBrainz agrega después). Los recuerdos
// enlazados pasan al destino; si la persona ya estaba en el destino, su recuerdo del origen queda sin enlace (nunca se
// borra: ADR 0056). El origen queda oculto con el enlace al destino y el destino reevalúa su confirmación.

import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { concert, concertEntry, concertPerformer } from "@/db/schema";
import { evaluateConfirmation, type Executor } from "./confirmation";

export interface MergeResult {
  moved: number;
  unlinked: number;
}

/** Fusiona `sourceId` en `targetId` dentro de la transacción del llamador. No valida permisos ni estados. */
export async function mergeConcertInto(executor: Executor, sourceId: string, targetId: string, now: Date = new Date()): Promise<MergeResult> {
  // Mover un recuerdo no es editarlo: conserva `updated_at` (y con él que "Quitar" pueda borrar uno de "Estuve ahí").
  await executor.execute(sql`SELECT set_config('app.preserve_updated_at', 'on', true)`);

  const inTarget = executor
    .select({ userId: concertEntry.userId })
    .from(concertEntry)
    .where(eq(concertEntry.concertId, targetId));
  const unlinked = await executor
    .update(concertEntry)
    .set({ concertId: null })
    .where(and(eq(concertEntry.concertId, sourceId), inArray(concertEntry.userId, inTarget)))
    .returning({ id: concertEntry.id });
  const moved = await executor
    .update(concertEntry)
    .set({ concertId: targetId })
    .where(eq(concertEntry.concertId, sourceId))
    .returning({ id: concertEntry.id });

  await executor.execute(sql`SELECT set_config('app.preserve_updated_at', 'off', true)`);

  // Lo que ya se había fusionado en el origen apunta directo al destino (sin cadenas).
  await executor.update(concert).set({ mergedIntoId: targetId }).where(eq(concert.mergedIntoId, sourceId));
  await executor.update(concert).set({ status: "hidden", mergedIntoId: targetId }).where(eq(concert.id, sourceId));
  await evaluateConfirmation(executor, targetId, now);
  return { moved: moved.length, unlinked: unlinked.length };
}

/**
 * Fusiona en el concierto de MusicBrainz `mbConcertId` los de la comunidad no ocultos con la misma fecha, la misma
 * ciudad normalizada y un artista principal en común. Devuelve cuántos fusionó.
 */
export async function mergeCommunityDuplicatesInto(executor: Executor, mbConcertId: string, now: Date = new Date()): Promise<number> {
  const [target] = await executor
    .select({ eventDate: concert.eventDate, cityKey: concert.cityKey, status: concert.status })
    .from(concert)
    .where(eq(concert.id, mbConcertId))
    .limit(1);
  if (!target || target.status === "hidden" || !target.cityKey) return 0;

  const mainMbids = executor
    .select({ mbid: concertPerformer.artistMbid })
    .from(concertPerformer)
    .where(and(eq(concertPerformer.concertId, mbConcertId), eq(concertPerformer.role, "main")));
  const duplicates = await executor
    .selectDistinct({ id: concert.id })
    .from(concert)
    .innerJoin(concertPerformer, eq(concertPerformer.concertId, concert.id))
    .where(
      and(
        eq(concert.source, "community"),
        sql`${concert.status} <> 'hidden'`,
        eq(concert.eventDate, target.eventDate),
        eq(concert.cityKey, target.cityKey),
        eq(concertPerformer.role, "main"),
        isNotNull(concertPerformer.artistMbid),
        inArray(concertPerformer.artistMbid, mainMbids),
      ),
    );
  for (const duplicate of duplicates) {
    const result = await mergeConcertInto(executor, duplicate.id, mbConcertId, now);
    console.info(`[concerts] concierto de la comunidad ${duplicate.id} fusionado en ${mbConcertId} (MusicBrainz)`, result);
  }
  return duplicates.length;
}
