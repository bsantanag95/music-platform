import { and, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { listenEntry } from "@/db/schema";
import { LISTEN_REACTIONS, type ListenReaction } from "@/services/diary/types";

// Resumen de reacciones PÚBLICAS de la comunidad sobre una canción, para la
// página de detalle (openspec: rebalance-catalog-detail-pages). Lectura
// agregada — deliberadamente separada de `diary.ts` para no arrastrar el
// diario personal a la página de canción. Solo `audience = 'public'`: la
// página de catálogo no computa relación de seguimiento.

export interface RecordingReactionSummary {
  /** Total de entradas públicas con reacción no nula. */
  total: number;
  /** Conteo por reacción; siempre incluye las cinco claves. */
  byReaction: Record<ListenReaction, number>;
  /** Reacción con más conteo (desempate por orden de la taxonomía); null si total 0. */
  top: ListenReaction | null;
}

export async function getRecordingReactionSummary(
  recordingId: string,
): Promise<RecordingReactionSummary> {
  const rows = await db
    .select({ reaction: listenEntry.reaction, n: sql<number>`count(*)::int` })
    .from(listenEntry)
    .where(
      and(
        eq(listenEntry.recordingId, recordingId),
        eq(listenEntry.audience, "public"),
        isNotNull(listenEntry.reaction),
      ),
    )
    .groupBy(listenEntry.reaction);

  const byReaction = Object.fromEntries(
    LISTEN_REACTIONS.map((r) => [r, 0]),
  ) as Record<ListenReaction, number>;

  let total = 0;
  for (const row of rows) {
    const reaction = row.reaction as ListenReaction | null;
    if (!reaction || !(reaction in byReaction)) continue;
    byReaction[reaction] = row.n;
    total += row.n;
  }

  let top: ListenReaction | null = null;
  if (total > 0) {
    top = LISTEN_REACTIONS.reduce((best, r) =>
      byReaction[r] > byReaction[best] ? r : best,
    );
    if (byReaction[top] === 0) top = null;
  }

  return { total, byReaction, top };
}
