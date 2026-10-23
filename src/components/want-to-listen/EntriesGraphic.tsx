"use client";

import { Link } from "@/i18n/navigation";
import { EntryActions } from "./EntryActions";
import { EntryExtras } from "./EntryExtras";
import { EntryMedia, useEntryFacts } from "./entry-parts";
import { wantToListenHref } from "./want-to-listen-shared";
import type { WantToListenRendererProps } from "./want-to-listen-items-view";

// Modo Gráfico (openspec: redesign-want-to-listen-views, D7): pared de carátulas con el `⋯` sobre cada una y un pie
// con el título y "artista · año"; sin acciones de texto. La foto del artista va en círculo dentro del cuadro.
export function EntriesGraphic({ entries, actions, priorityIds }: WantToListenRendererProps) {
  const facts = useEntryFacts();
  const openEntry = entries.find((entry) => entry.id === actions.listOpenId || entry.id === actions.errorId);
  return (
    <div className="flex flex-col gap-3">
      <ul className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-4 lg:grid-cols-5">
        {entries.map((entry) => {
          const href = wantToListenHref(entry);
          return (
            <li key={entry.id} className="relative flex min-w-0 flex-col gap-1.5">
              <Link
                href={href}
                tabIndex={-1}
                aria-hidden
                className={`block overflow-hidden rounded-md border border-ink-border transition-colors hover:border-amber ${
                  entry.targetType === "artist" ? "bg-ink-surface p-[10%]" : ""
                }`}
              >
                <EntryMedia
                  entry={entry}
                  className="aspect-square w-full"
                  textClassName="text-3xl"
                  priority={priorityIds.has(entry.id)}
                />
              </Link>
              <div className="absolute right-1.5 top-1.5">
                <EntryActions
                  entry={entry}
                  actions={actions}
                  triggerClassName="border border-ink-border bg-ink/80 text-paper hover:bg-ink"
                />
              </div>
              <Link
                href={href}
                className="truncate font-display text-sm text-paper transition-colors hover:text-amber"
              >
                {entry.target.title}
              </Link>
              <span className="truncate font-data text-[0.7rem] text-paper-muted">
                {facts(entry).split(" · ").slice(0, 2).join(" · ")}
              </span>
            </li>
          );
        })}
      </ul>
      {openEntry ? <EntryExtras entry={openEntry} actions={actions} /> : null}
    </div>
  );
}
