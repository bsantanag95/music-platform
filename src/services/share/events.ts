import { z } from "zod";
import { db } from "@/db";
import { shareEvent } from "@/db/schema";
import { SHARE_CHANNELS, SHARE_FORMATS, SHARE_TARGET_KINDS } from "@/lib/share/kinds";

// Medición de lo que se comparte (spec share-events, D13 de docs/05-features/sharing.md). Solo qué, por
// dónde y en qué formato: nunca quién comparte ni quién visita.

export const shareEventInputSchema = z.object({
  kind: z.enum(SHARE_TARGET_KINDS),
  ref: z.string().min(1).max(200),
  channel: z.enum(SHARE_CHANNELS),
  format: z.enum(SHARE_FORMATS),
});

export type ShareEventInput = z.infer<typeof shareEventInputSchema>;

export async function recordShareEvent(input: ShareEventInput): Promise<void> {
  await db.insert(shareEvent).values({
    targetKind: input.kind,
    targetRef: input.ref,
    channel: input.channel,
    format: input.format,
  });
}
