// `?tab=` de `/activity` (redesign-activity-page, D2), compartido entre la página (servidor) y `ActivityTabs`
// (cliente): vive fuera del módulo `"use client"` porque el servidor no puede llamar funciones de un módulo cliente.

import type { FeedKind } from "@/lib/api/schemas";

export type ActivitySource = "recent" | "from-following" | "own";

// Claves en inglés, estables entre locales; Recientes es la pestaña por defecto y no lleva parámetro.
export const TAB_PARAM: Record<ActivitySource, string | null> = {
  recent: null,
  "from-following": "following",
  own: "you",
};

export function tabFromParam(value: string | null | undefined): ActivitySource {
  if (value === TAB_PARAM["from-following"]) return "from-following";
  if (value === TAB_PARAM.own) return "own";
  return "recent";
}

// Tipos que ofrece cada pestaña como chips (`?kind=`, redesign-activity-page, fase 2), en el orden en que se muestran.
// "Recientes" solo compone valoraciones, comentarios y reseñas; "Siguiendo" suma escuchas y listas de entre los tipos
// que ya filtra `/api/me/feed`. "Tú" reutiliza el rastro de Inicio, que no filtra.
export const ACTIVITY_FILTER_KINDS = {
  recent: ["review", "comment", "rating"],
  "from-following": ["review", "comment", "rating", "listen", "list"],
  own: [],
} as const satisfies Record<ActivitySource, readonly FeedKind[]>;

// `kind` de la URL validado contra la pestaña: un valor que no aplica se ignora en silencio (es un parámetro de UI,
// no de API).
export function kindFromParam(source: ActivitySource, value: string | null | undefined): FeedKind | undefined {
  const kinds: readonly FeedKind[] = ACTIVITY_FILTER_KINDS[source];
  return value && kinds.includes(value as FeedKind) ? (value as FeedKind) : undefined;
}
