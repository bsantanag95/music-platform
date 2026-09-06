"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CollectionEntryControls } from "./CollectionEntryControls";
import {
  collectionAlbumHref,
  type CollectionGroup,
  type CollectionRowActions,
  type CollectionSelectionState,
} from "./collection-shared";

interface EntriesIndexProps {
  groups: CollectionGroup[];
  actions: CollectionRowActions | null;
  selection: CollectionSelectionState | null;
}

// Modo "Índice": filas compactas `NN · Álbum — artista · formato`, con los
// controles ocultos hasta el hover o el foco.
export function EntriesIndex({ groups, actions, selection }: EntriesIndexProps) {
  const t = useTranslations("collection");
  let counter = 0;

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <section key={group.key} className="flex flex-col">
          {group.heading ? (
            <h3 className="mb-1 flex items-baseline gap-2 font-display text-base text-paper">
              {group.heading}
              {group.count !== null ? (
                <span className="font-data text-xs text-paper-muted">{group.count}</span>
              ) : null}
            </h3>
          ) : null}
          <ol className="flex flex-col">
            {group.entries.map((entry) => {
              counter += 1;
              const position = counter;
              return (
                <li
                  key={entry.id}
                  className="group flex flex-col gap-1 border-b border-ink-border py-2 last:border-b-0"
                >
                  <div className="flex flex-wrap items-baseline gap-x-2 font-data text-sm">
                    {selection?.active ? (
                      <input
                        type="checkbox"
                        checked={selection.selectedIds.has(entry.id)}
                        onChange={() => selection.onToggle(entry.id)}
                        aria-label={t("selectEntry", { title: entry.album.title })}
                        className="size-3.5 shrink-0 accent-amber"
                      />
                    ) : (
                      <span className="text-paper-muted tabular-nums">
                        {String(position).padStart(2, "0")}
                      </span>
                    )}
                    <Link
                      href={collectionAlbumHref(entry)}
                      className="text-paper transition-colors hover:text-amber"
                    >
                      {entry.album.title || t("albumUnavailable")}
                    </Link>
                    {entry.album.artistName ? (
                      <span className="text-paper-muted">— {entry.album.artistName}</span>
                    ) : null}
                    <span className="text-paper-muted">· {t(`format.${entry.format}`)}</span>
                  </div>

                  {actions && !selection?.active ? (
                    <div className="opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                      <CollectionEntryControls entry={entry} actions={actions} />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
