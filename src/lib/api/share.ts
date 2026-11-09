import { z } from "zod";
import { apiFetch } from "./client";
import { NoContentResponseSchema } from "./schemas";
import { SHARE_FORMATS, SHARE_TARGET_KINDS } from "@/lib/share/kinds";
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
const SharePayloadSchema = z.object({
  kind: z.enum(SHARE_TARGET_KINDS),
  ref: z.string(),
  url: z.string(),
  title: z.string(),
  images: z.array(z.object({ format: z.enum(SHARE_FORMATS), url: z.string() })).min(1),
  imageAlt: z.string(),
  downloadName: z.string(),
});

const OwnShareStateSchema = z.object({
  state: z.enum(["public", "needs_gesture", "private_profile"]),
  canUnshare: z.boolean(),
  hasNote: z.boolean(),
  payload: SharePayloadSchema,
});
export type OwnShareState = z.infer<typeof OwnShareStateSchema>;

/** Datos de la hoja de un objeto, como anónimo. Se pide al abrirla. */
export function getSharePayload(kind: ShareTargetKind, ref: string, locale: string) {
  return apiFetch(`/api/share/payload/${kind}/${encodeURIComponent(ref)}?locale=${locale}`, SharePayloadSchema);
}

type OwnKind = "rating" | "listen" | "top" | "discography" | "tier" | "year";

const ownSharePath = (kind: OwnKind, ref: string, locale: string) => `/api/me/share/${kind}/${ref}?locale=${locale}`;

export function getOwnShare(kind: OwnKind, ref: string, locale: string): Promise<OwnShareState> {
  return apiFetch(ownSharePath(kind, ref, locale), OwnShareStateSchema);
}

export function makeOwnShareable(kind: OwnKind, ref: string, locale: string): Promise<OwnShareState> {
  return apiFetch(ownSharePath(kind, ref, locale), OwnShareStateSchema, { method: "POST" });
}

export function stopOwnShare(kind: "rating" | "discography", ref: string, locale: string): Promise<OwnShareState> {
  return apiFetch(ownSharePath(kind, ref, locale), OwnShareStateSchema, { method: "DELETE" });
}
