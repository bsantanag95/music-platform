"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { RemoveItemButton } from "./ListItemControls";
import { listItemHref } from "./lists-shared";
import type { ListItemsRendererProps } from "./list-items-view";

// Modo Gráfico: pared de carátulas. El título va como caption visible (no solo
// atributo) para que cada ítem siga siendo texto accesible. Para reordenar,
// se selecciona un tile y se actúa desde la barra de acciones sobre la grilla.
export function ItemsGraphic({ items, entityType, actions }: ListItemsRendererProps) {
  const t = useTranslations("lists");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedIndex = items.findIndex((item) => item.id === selectedId);
  const selected = selectedIndex >= 0 ? items[selectedIndex] : null;

  return (
    <div className="flex flex-col gap-3">
      <span role="status" aria-live="polite" className="sr-only">
        {selected ? t("graphicSelected", { title: selected.target.title }) : ""}
      </span>

      {actions && selected ? (
        <div
          role="group"
          aria-label={t("graphicActionsLabel", { title: selected.target.title })}
          className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-amber/40 bg-ink-surface p-2"
        >
          <span className="mr-1 truncate font-data text-xs text-paper">{selected.target.title}</span>
          <button
            type="button"
            disabled={actions.busy || selectedIndex === 0}
            onClick={() => actions.moveToEdge(selected.id, "start")}
            className="font-data text-xs text-paper-muted transition-colors hover:text-paper disabled:opacity-40"
          >
            {t("moveToStartShort")}
          </button>
          <button
            type="button"
            disabled={actions.busy || selectedIndex === 0}
            onClick={() => actions.move(selected.id, -1)}
            className="font-data text-xs text-paper-muted transition-colors hover:text-paper disabled:opacity-40"
          >
            {t("moveUpShort")}
          </button>
          <button
            type="button"
            disabled={actions.busy || selectedIndex === items.length - 1}
            onClick={() => actions.move(selected.id, 1)}
            className="font-data text-xs text-paper-muted transition-colors hover:text-paper disabled:opacity-40"
          >
            {t("moveDownShort")}
          </button>
          <button
            type="button"
            disabled={actions.busy || selectedIndex === items.length - 1}
            onClick={() => actions.moveToEdge(selected.id, "end")}
            className="font-data text-xs text-paper-muted transition-colors hover:text-paper disabled:opacity-40"
          >
            {t("moveToEndShort")}
          </button>
          <RemoveItemButton
            title={selected.target.title}
            busy={actions.busy}
            onRemove={() => {
              actions.remove(selected.id);
              setSelectedId(null);
            }}
          />
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            className="ml-auto font-data text-xs text-paper-muted transition-colors hover:text-paper"
          >
            {t("graphicDone")}
          </button>
        </div>
      ) : null}

      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        {items.map((item, index) => (
          <li key={item.id} className="flex flex-col gap-1.5">
            {actions ? (
              <button
                type="button"
                aria-pressed={item.id === selectedId}
                aria-label={t("graphicSelect", { title: item.target.title })}
                onClick={() => setSelectedId((cur) => (cur === item.id ? null : item.id))}
                className={`relative block overflow-hidden rounded-md border transition-colors ${
                  item.id === selectedId ? "border-amber" : "border-ink-border hover:border-amber/60"
                }`}
              >
                <CoverThumb cover={item.target.coverThumbUrl} label="" className="aspect-square w-full" />
                <span className="absolute left-1 top-1 rounded bg-ink/80 px-1 font-data text-[0.65rem] text-paper-muted">
                  {index + 1}
                </span>
              </button>
            ) : (
              <Link
                href={listItemHref(item.target.id, entityType)}
                className="group relative block overflow-hidden rounded-md border border-ink-border transition-colors hover:border-amber"
              >
                <CoverThumb cover={item.target.coverThumbUrl} label="" className="aspect-square w-full" />
                <span className="absolute left-1 top-1 rounded bg-ink/80 px-1 font-data text-[0.65rem] text-paper-muted">
                  {index + 1}
                </span>
              </Link>
            )}
            <Link
              href={listItemHref(item.target.id, entityType)}
              className="truncate font-data text-xs text-paper-muted transition-colors hover:text-amber"
            >
              {item.target.title || t("itemUnavailable")}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
