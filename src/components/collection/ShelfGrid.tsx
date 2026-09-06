"use client";

import { Fragment } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import type { CollectionEntry } from "@/lib/api/schemas";
import { CollectionEntryControls } from "./CollectionEntryControls";
import {
  collectionAlbumHref,
  collectionArtistHref,
  type CollectionGroup,
  type CollectionRowActions,
  type CollectionSelectionState,
} from "./collection-shared";

interface ShelfGridProps {
  groups: CollectionGroup[];
  actions: CollectionRowActions | null;
  selection: CollectionSelectionState | null;
}

// Modo "Estantería": cuadrícula de carátulas cuadradas donde predomina lo
// visual. El panel de edición se despliega a ancho completo bajo la ficha.
export function ShelfGrid({ groups, actions, selection }: ShelfGridProps) {
  return (
    <div className="flex flex-col gap-8">
      {groups.map((group) => (
        <section key={group.key} className="flex flex-col gap-3">
          {group.heading ? (
            <h3 className="flex items-baseline gap-2 font-display text-base text-paper">
              {group.heading}
              {group.count !== null ? (
                <span className="font-data text-xs text-paper-muted">{group.count}</span>
              ) : null}
            </h3>
          ) : null}
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {group.entries.map((entry) => (
              <Fragment key={entry.id}>
                <ShelfTile entry={entry} actions={actions} selection={selection} />
                {actions?.editingId === entry.id ? (
                  <li className="col-span-full">
                    <CollectionEntryControls entry={entry} actions={actions} />
                  </li>
                ) : null}
              </Fragment>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function ShelfTile({
  entry,
  actions,
  selection,
}: {
  entry: CollectionEntry;
  actions: CollectionRowActions | null;
  selection: CollectionSelectionState | null;
}) {
  const t = useTranslations("collection");
  const artistHref = collectionArtistHref(entry);
  const busy = actions?.busyId === entry.id;

  return (
    <li className="group relative flex flex-col gap-1.5">
      <div className="relative">
        <Link
          href={collectionAlbumHref(entry)}
          aria-label={entry.album.title || t("albumUnavailable")}
          className="block overflow-hidden rounded-lg border border-ink-border transition-colors hover:border-amber focus-visible:border-amber"
        >
          <CoverThumb cover={entry.album.coverThumbUrl} label="" className="aspect-square w-full" />
        </Link>
        <span className="absolute left-1.5 top-1.5 rounded bg-ink/80 px-1.5 py-0.5 font-data text-[0.65rem] text-paper">
          {t(`format.${entry.format}`)}
        </span>
        {selection?.active ? (
          <input
            type="checkbox"
            checked={selection.selectedIds.has(entry.id)}
            onChange={() => selection.onToggle(entry.id)}
            aria-label={t("selectEntry", { title: entry.album.title })}
            className="absolute right-1.5 top-1.5 size-4 accent-amber"
          />
        ) : null}
      </div>

      <div className="flex min-w-0 flex-col">
        <Link
          href={collectionAlbumHref(entry)}
          className="truncate font-display text-sm text-paper transition-colors hover:text-amber"
        >
          {entry.album.title || t("albumUnavailable")}
        </Link>
        {entry.album.artistName ? (
          artistHref ? (
            <Link
              href={artistHref}
              className="truncate font-data text-xs text-paper-muted transition-colors hover:text-paper"
            >
              {entry.album.artistName}
            </Link>
          ) : (
            <span className="truncate font-data text-xs text-paper-muted">
              {entry.album.artistName}
            </span>
          )
        ) : null}
      </div>

      {actions && !selection?.active && actions.editingId !== entry.id ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => actions.onStartEdit(entry.id)}
          className="self-start font-data text-xs text-paper-muted underline decoration-dotted transition-colors hover:text-paper disabled:opacity-50"
        >
          {t("editEntry")}
        </button>
      ) : null}
    </li>
  );
}
