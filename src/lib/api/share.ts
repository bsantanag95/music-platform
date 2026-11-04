import { apiFetch } from "./client";
import { NoContentResponseSchema } from "./schemas";
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
