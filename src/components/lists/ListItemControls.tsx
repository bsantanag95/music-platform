"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

// Controles de gestión de un ítem compartidos por los renderers Detallada e
// Índice (el modo Gráfico usa la barra de selección). Trazo quieto: texto
// `paper-muted` con subrayado punteado, ámbar solo en foco (heredado).

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
  const cls =
    "font-data text-xs text-paper-muted transition-colors hover:text-paper disabled:opacity-40";
  return (
    <>
      <button
        type="button"
        disabled={handlers.busy || index === 0}
        aria-label={t("moveToStart", { title })}
        onClick={() => handlers.onMoveToEdge("start")}
        className={cls}
      >
        ⤒
      </button>
      <button
        type="button"
        disabled={handlers.busy || index === 0}
        aria-label={t("moveUp", { title })}
        onClick={() => handlers.onMove(-1)}
        className={cls}
      >
        ↑
      </button>
      <button
        type="button"
        disabled={handlers.busy || index === total - 1}
        aria-label={t("moveDown", { title })}
        onClick={() => handlers.onMove(1)}
        className={cls}
      >
        ↓
      </button>
      <button
        type="button"
        disabled={handlers.busy || index === total - 1}
        aria-label={t("moveToEnd", { title })}
        onClick={() => handlers.onMoveToEdge("end")}
        className={cls}
      >
        ⤓
      </button>
    </>
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
      className={`font-data text-xs underline decoration-dotted transition-colors disabled:opacity-40 ${
        armed ? "text-danger hover:text-paper" : "text-paper-muted hover:text-danger"
      }`}
    >
      {armed ? t("removeItemShort") : t("removeItem")}
    </button>
  );
}
