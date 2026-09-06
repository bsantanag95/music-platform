"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ReorderButtons, RemoveItemButton } from "./ListItemControls";
import { listItemHref } from "./lists-shared";
import type { ListItemsRendererProps } from "./list-items-view";

// Modo Índice: filas de texto compactas para escanear y reordenar listas
// largas. Los controles se revelan al posar el puntero o enfocar (siempre
// visibles en pantallas angostas, donde no hay hover).
export function ItemsIndex({ items, entityType, actions }: ListItemsRendererProps) {
  const t = useTranslations("lists");
  return (
    <ol className="flex flex-col">
      {items.map((item, index) => (
        <li
          key={item.id}
          className="group flex items-center gap-3 border-b border-ink-border py-2 last:border-b-0"
        >
          <span className="w-6 shrink-0 text-right font-data text-xs text-paper-muted">
            {index + 1}
          </span>
          <Link
            href={listItemHref(item.target.id, entityType)}
            className="min-w-0 flex-1 truncate font-display text-sm text-paper transition-colors hover:text-amber"
          >
            {item.target.title || t("itemUnavailable")}
            {item.target.artistName ? (
              <span className="font-data text-xs text-paper-muted"> — {item.target.artistName}</span>
            ) : null}
          </Link>
          {actions ? (
            <div className="flex shrink-0 items-center gap-2 opacity-100 transition-opacity focus-within:opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
              <ReorderButtons
                title={item.target.title}
                index={index}
                total={items.length}
                handlers={{
                  busy: actions.busy,
                  onMove: (delta) => actions.move(item.id, delta),
                  onMoveToEdge: (edge) => actions.moveToEdge(item.id, edge),
                  onRemove: () => actions.remove(item.id),
                }}
              />
              <RemoveItemButton
                title={item.target.title}
                busy={actions.busy}
                onRemove={() => actions.remove(item.id)}
              />
            </div>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
