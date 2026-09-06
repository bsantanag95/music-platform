"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { ReorderButtons, RemoveItemButton } from "./ListItemControls";
import { listItemHref } from "./lists-shared";
import type { ListItemsRendererProps } from "./list-items-view";

// Modo Detallada: una fila-tarjeta por ítem con carátula, título y artista, y
// los controles de gestión al pie. Es el modo por defecto.
export function ItemsDetailed({ items, entityType, actions }: ListItemsRendererProps) {
  const t = useTranslations("lists");
  return (
    <ol className="flex flex-col gap-2">
      {items.map((item, index) => (
        <li
          key={item.id}
          className="flex gap-3 rounded-lg border border-ink-border bg-ink-surface p-3 transition-colors focus-within:border-amber"
        >
          <span className="w-5 shrink-0 pt-1 text-right font-data text-xs text-paper-muted">
            {index + 1}
          </span>
          <Link href={listItemHref(item.target.id, entityType)} className="shrink-0" tabIndex={-1} aria-hidden>
            <CoverThumb cover={item.target.coverThumbUrl} label="" className="size-14 sm:size-16" />
          </Link>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <Link
              href={listItemHref(item.target.id, entityType)}
              className="truncate font-display text-base text-paper transition-colors hover:text-amber"
            >
              {item.target.title || t("itemUnavailable")}
            </Link>
            {item.target.artistName ? (
              <p className="truncate font-data text-xs text-paper-muted">{item.target.artistName}</p>
            ) : null}
            {actions ? (
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
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
          </div>
        </li>
      ))}
    </ol>
  );
}
