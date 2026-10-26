"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

// Controles de gestión de un ítem compartidos por los renderers Detallada e
// Índice (el modo Gráfico usa la barra de selección). Trazo quieto: texto
// `paper-muted`, ámbar solo en foco (heredado). Miden 32 px (44 con puntero grueso); el control que no aplica en un
// extremo (subir en el primero, bajar en el último) queda `invisible`: no se ve ni recibe foco, pero conserva su lugar
// para que las columnas de controles sigan alineadas (openspec: refine-me-lists-page-phase1, D1–D2).

const REORDER_BUTTON =
  "inline-flex size-8 items-center justify-center rounded font-data text-sm text-paper-muted transition-colors hover:bg-ink-border/60 hover:text-paper disabled:opacity-40 [@media(pointer:coarse)]:size-11";

export interface ItemReorderHandlers {
  busy: boolean;
  onMove: (delta: -1 | 1) => void;
  onMoveToEdge: (edge: "start" | "end") => void;
  onRemove: () => void;
}

export function ReorderButtons({
  title,
  index,
  total,
  handlers,
}: {
  title: string;
  index: number;
  total: number;
  handlers: ItemReorderHandlers;
}) {
  const t = useTranslations("lists");
  const first = index === 0;
  const last = index === total - 1;
  const cls = (hidden: boolean) => `${REORDER_BUTTON} ${hidden ? "invisible" : ""}`;
  return (
    <div className="flex items-center">
      <button
        type="button"
        disabled={handlers.busy || first}
        aria-label={t("moveToStart", { title })}
        onClick={() => handlers.onMoveToEdge("start")}
        className={cls(first)}
      >
        ⤒
      </button>
      <button
        type="button"
        disabled={handlers.busy || first}
        aria-label={t("moveUp", { title })}
        onClick={() => handlers.onMove(-1)}
        className={cls(first)}
      >
        ↑
      </button>
      <button
        type="button"
        disabled={handlers.busy || last}
        aria-label={t("moveDown", { title })}
        onClick={() => handlers.onMove(1)}
        className={cls(last)}
      >
        ↓
      </button>
      <button
        type="button"
        disabled={handlers.busy || last}
        aria-label={t("moveToEnd", { title })}
        onClick={() => handlers.onMoveToEdge("end")}
        className={cls(last)}
      >
        ⤓
      </button>
    </div>
  );
}

// Quitar en dos pasos, sin diálogo aparte: el primer clic arma la confirmación
// ("¿Quitar?"), el segundo la ejecuta; se desarma sola a los 4 s o al perder el
// foco. Mismo criterio que `deleteShort` en MyListsTab.
export function RemoveItemButton({
  title,
  busy,
  onRemove,
}: {
  title: string;
  busy: boolean;
  onRemove: () => void;
}) {
  const t = useTranslations("lists");
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const id = window.setTimeout(() => setArmed(false), 4000);
    return () => window.clearTimeout(id);
  }, [armed]);

  return (
    <button
      type="button"
      disabled={busy}
      aria-label={armed ? t("removeItemConfirm") : t("removeItemNamed", { title })}
      onClick={() => {
        if (armed) {
          onRemove();
          setArmed(false);
        } else {
          setArmed(true);
        }
      }}
      onBlur={() => setArmed(false)}
      className={`min-h-8 px-1 font-data text-xs underline decoration-dotted transition-colors disabled:opacity-40 [@media(pointer:coarse)]:min-h-11 ${
        armed ? "text-danger hover:text-paper" : "text-paper-muted hover:text-danger"
      }`}
    >
      {armed ? t("removeItemShort") : t("removeItem")}
    </button>
  );
}
