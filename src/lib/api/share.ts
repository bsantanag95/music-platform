import { z } from "zod";
import { apiFetch } from "./client";
import { NoContentResponseSchema } from "./schemas";
import { SHARE_TARGET_KINDS } from "@/lib/share/kinds";
import type { ShareChannel, ShareFormat, ShareTargetKind } from "@/lib/share/kinds";

// Registro de un uso de la hoja de compartir (spec share-events). Se dispara sin esperar la respuesta: un fallo
// nunca debe impedir ni retrasar el compartir. `keepalive` cubre el caso en que la página se va (menú nativo).
export function postShareEvent(input: {
  kind: ShareTargetKind;
  ref: string;
  channel: ShareChannel;
  format: ShareFormat;
}): void {
  apiFetch("/api/share/events", NoContentResponseSchema, {
    method: "POST",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).catch(() => {});
}

// Compartir lo propio (spec personal-share-image): el servidor decide el estado; la hoja solo lo muestra.
const OwnShareStateSchema = z.object({
  state: z.enum(["public", "needs_gesture", "private_profile"]),
  canUnshare: z.boolean(),
  hasNote: z.boolean(),
  payload: z.object({
    kind: z.enum(SHARE_TARGET_KINDS),
    ref: z.string(),
    url: z.string(),
    title: z.string(),
    imageUrl: z.string(),
    imageAlt: z.string(),
    downloadName: z.string(),
  }),
});
export type OwnShareState = z.infer<typeof OwnShareStateSchema>;

const ownSharePath = (kind: "rating" | "listen", ref: string, locale: string) => `/api/me/share/${kind}/${ref}?locale=${locale}`;

export function getOwnShare(kind: "rating" | "listen", ref: string, locale: string): Promise<OwnShareState> {
  return apiFetch(ownSharePath(kind, ref, locale), OwnShareStateSchema);
}

export function makeOwnShareable(kind: "rating" | "listen", ref: string, locale: string): Promise<OwnShareState> {
  return apiFetch(ownSharePath(kind, ref, locale), OwnShareStateSchema, { method: "POST" });
}

export function stopOwnShare(ref: string, locale: string): Promise<OwnShareState> {
  return apiFetch(ownSharePath("rating", ref, locale), OwnShareStateSchema, { method: "DELETE" });
}
