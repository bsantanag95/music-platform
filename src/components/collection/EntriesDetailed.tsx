"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { CollectionEntryControls } from "./CollectionEntryControls";
import {
  collectionAlbumHref,
  collectionArtistHref,
  formatCollectionDate,
  type CollectionGroup,
  type CollectionRowActions,
  type CollectionSelectionState,
} from "./collection-shared";

interface EntriesDetailedProps {
  groups: CollectionGroup[];
  actions: CollectionRowActions | null;
  selection: CollectionSelectionState | null;
}

// Modo "Lista detallada": fila con carátula, título, artista, chips de formato y
// atributos, nota, audiencia y fecha, más los controles de gestión.
export function EntriesDetailed({ groups, actions, selection }: EntriesDetailedProps) {
  const t = useTranslations("collection");
  const locale = useLocale();

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
          <ul className="flex flex-col gap-4">
            {group.entries.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap gap-3 rounded-lg border border-ink-border bg-ink-surface p-4 transition-colors focus-within:border-amber hover:border-amber"
              >
                {selection?.active ? (
                  <input
                    type="checkbox"
                    checked={selection.selectedIds.has(entry.id)}
                    onChange={() => selection.onToggle(entry.id)}
                    aria-label={t("selectEntry", { title: entry.album.title })}
                    className="mt-1 size-4 shrink-0 accent-amber"
                  />
                ) : null}

                <Link href={collectionAlbumHref(entry)} tabIndex={-1} aria-hidden className="shrink-0">
                  <CoverThumb cover={entry.album.coverThumbUrl} label="" className="size-16" />
                </Link>

                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <Link
                      href={collectionAlbumHref(entry)}
                      className="font-display text-base text-paper transition-colors hover:text-amber"
                    >
                      {entry.album.title || t("albumUnavailable")}
                    </Link>
                    {entry.album.artistName ? (
                      collectionArtistHref(entry) ? (
                        <Link
                          href={collectionArtistHref(entry)!}
                          className="font-data text-sm text-paper-muted transition-colors hover:text-paper"
                        >
                          {entry.album.artistName}
                        </Link>
                      ) : (
                        <span className="font-data text-sm text-paper-muted">
                          {entry.album.artistName}
                        </span>
                      )
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 font-data text-xs">
                    <span className="rounded border border-ink-border px-1.5 py-0.5 text-paper">
                      {t(`format.${entry.format}`)}
                    </span>
                    {entry.attributes.map((attribute) => (
                      <span
                        key={attribute}
                        className="rounded border border-ink-border px-1.5 py-0.5 text-paper-muted"
                      >
                        {t(`attribute.${attribute}`)}
                      </span>
                    ))}
                  </div>

                  {entry.note ? (
                    <p className="font-body text-sm text-paper-muted">{entry.note}</p>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-data text-xs text-paper-muted">
                    {actions ? <span>{t(`audience.${entry.audience}`)}</span> : null}
                    <time dateTime={entry.createdAt}>
                      {formatCollectionDate(entry.createdAt, locale)}
                    </time>
                  </div>

                  {actions && !selection?.active ? (
                    <CollectionEntryControls entry={entry} actions={actions} />
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
