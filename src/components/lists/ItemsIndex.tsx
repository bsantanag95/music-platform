"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ItemRowControls } from "./ListItemControls";
import { listItemHref } from "./lists-shared";
import type { ListItemsRendererProps } from "./list-items-view";
import { ListItemQuickActions } from "./ListItemQuickActions";

// Modo Índice: filas de texto compactas para escanear y reordenar listas
// largas. Los controles quedan siempre visibles: ocultarlos con opacidad dejaba una franja vacía del mismo ancho en
// cada fila (openspec: refine-me-lists-page-phase1, D3).
export function ItemsIndex({ items, entityType, actions, quickActions }: ListItemsRendererProps) {
  const t = useTranslations("lists");
  return (
    <ol className="flex flex-col">
      {items.map((item, index) => (
        <li
          key={item.id}
          className="flex items-center gap-3 border-b border-ink-border py-1 last:border-b-0"
        >
          <span className="w-6 shrink-0 text-right font-data text-xs text-paper-muted">
            {index + 1}
          </span>
          <Link
            href={listItemHref(item.target.id, entityType, {
              title: item.target.title,
              artistName: item.target.artistName,
            })}
            className="min-w-0 flex-1 truncate font-display text-sm text-paper transition-colors hover:text-amber"
          >
            {item.target.title || t("itemUnavailable")}
            {item.target.artistName ? (
              <span className="font-data text-xs text-paper-muted"> — {item.target.artistName}</span>
            ) : null}
          </Link>
          {actions ? (
            <div className="flex shrink-0 items-center gap-1">
              <ItemRowControls
                  title={item.target.title}
                  index={index}
                  total={items.length}
                  handlers={{
                    busy: actions.busy,
                    onMove: (delta) => actions.move(item.id, delta),
                    onMoveToEdge: (edge) => actions.moveToEdge(item.id, edge),
                    onAskPosition: () => actions.askPosition(item.id),
                    onRemove: () => actions.remove(item.id),
                  }}
                />
            </div>
          ) : null}
          {quickActions ? <ListItemQuickActions item={item} quick={quickActions} variant="row" className="shrink-0" /> : null}
        </li>
      ))}
    </ol>
  );
}
