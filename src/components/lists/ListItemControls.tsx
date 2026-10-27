"use client";

import { useTranslations } from "next-intl";
import { RowMenu, RowMenuItem, RowMenuSeparator } from "@/components/ui/RowMenu";

// Controles de gestión de un ítem compartidos por los renderers Detallada e
// Índice (el modo Gráfico usa la barra de selección). Trazo quieto: texto
// `paper-muted`, ámbar solo en foco (heredado). Miden 32 px (44 con puntero grueso) (openspec:
// refine-me-lists-page-phase1, D2).

const REORDER_BUTTON =
  "inline-flex size-8 items-center justify-center rounded font-data text-sm text-paper-muted transition-colors hover:bg-ink-border/60 hover:text-paper disabled:opacity-40 [@media(pointer:coarse)]:size-11";

export interface ItemRowHandlers {
  busy: boolean;
  onMove: (delta: -1 | 1) => void;
  onMoveToEdge: (edge: "start" | "end") => void;
  onAskPosition: () => void;
  onRemove: () => void;
}

// Fila del detalle propio (openspec: redesign-me-lists-views, D6): subir y bajar quedan a la vista; al principio, al
// final, mover a una posición y quitar van al menú ⋯. Un control que no aplica en un extremo queda `invisible`: no se ve
// ni recibe foco, pero conserva su lugar para que las columnas sigan alineadas (refine-me-lists-page-phase1, D1).
export function ItemRowControls({
  title,
  index,
  total,
  handlers,
}: {
  title: string;
  index: number;
  total: number;
  handlers: ItemRowHandlers;
}) {
  const t = useTranslations("lists");
  const first = index === 0;
  const last = index === total - 1;
  return (
    <div className="flex items-center">
      <button
        type="button"
        disabled={handlers.busy || first}
        aria-label={t("moveUp", { title })}
        onClick={() => handlers.onMove(-1)}
        className={`${REORDER_BUTTON} ${first ? "invisible" : ""}`}
      >
        ↑
      </button>
      <button
        type="button"
        disabled={handlers.busy || last}
        aria-label={t("moveDown", { title })}
        onClick={() => handlers.onMove(1)}
        className={`${REORDER_BUTTON} ${last ? "invisible" : ""}`}
      >
        ↓
      </button>
      <RowMenu label={t("itemActionsLabel", { title })} triggerClassName="size-8 [@media(pointer:coarse)]:size-11">
        {!first ? <RowMenuItem onSelect={() => handlers.onMoveToEdge("start")}>{t("moveToStartShort")}</RowMenuItem> : null}
        {!last ? <RowMenuItem onSelect={() => handlers.onMoveToEdge("end")}>{t("moveToEndShort")}</RowMenuItem> : null}
        {total > 2 ? <RowMenuItem onSelect={handlers.onAskPosition}>{t("moveToPosition")}</RowMenuItem> : null}
        {total > 1 ? <RowMenuSeparator /> : null}
        <RowMenuItem danger onSelect={handlers.onRemove}>
          {t("removeItem")}
        </RowMenuItem>
      </RowMenu>
    </div>
  );
}

// Quitar en el modo Gráfico (su barra de selección): inmediato, con Deshacer en el aviso del detalle
// (openspec: redesign-me-lists-views, D7).
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
  return (
    <button
      type="button"
      disabled={busy}
      aria-label={t("removeItemNamed", { title })}
      onClick={onRemove}
      className="min-h-8 px-1 font-data text-xs text-paper-muted underline decoration-dotted transition-colors hover:text-danger disabled:opacity-40 [@media(pointer:coarse)]:min-h-11"
    >
      {t("removeItem")}
    </button>
  );
}
