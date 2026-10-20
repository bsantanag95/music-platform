// `?tab=` de `/activity` (redesign-activity-page, D2), compartido entre la página (servidor) y `ActivityTabs`
// (cliente): vive fuera del módulo `"use client"` porque el servidor no puede llamar funciones de un módulo cliente.

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
