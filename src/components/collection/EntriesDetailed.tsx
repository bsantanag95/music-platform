"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { CollectionGroupHeading } from "./CollectionGroupHeading";
import { EntryMenu } from "./EntryMenu";
import { RemoveError } from "./entry-parts";
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
  /** Entradas cuyas carátulas cargan con prioridad (las primeras). */
  priorityIds?: Set<string>;
  /** Las secciones son artistas: la fila no repite el artista del encabezado. */
  groupedByArtist?: boolean;
}

// Modo "Lista detallada" (openspec: redesign-collection-views, D7): filas compactas separadas por una línea, con
// carátula de 48 px, título, "artista · año", una línea "formato · atributos" (texto, no etiquetas: no se tocan), nota y,
// a la derecha, "Añadida el …", la audiencia (que abre el mismo menú que el `⋯`) y el `⋯`. En pantallas angostas la columna derecha baja bajo el
// texto. Con las secciones por artista, el artista ya está en el encabezado y la fila no lo repite.
export function EntriesDetailed({
  groups,
  actions,
  selection,
  priorityIds,
  groupedByArtist = false,
}: EntriesDetailedProps) {
  const t = useTranslations("collection");
  const locale = useLocale();

  return (
    <div className="flex flex-col gap-8">
      {groups.map((group) => (
        <section key={group.key} className="flex flex-col gap-2">
          <CollectionGroupHeading group={group} />
          <ul className="flex flex-col divide-y divide-ink-border border-y border-ink-border">
            {group.entries.map((entry) => {
              const selecting = Boolean(selection?.active);
              const selected = selecting && selection!.selectedIds.has(entry.id);
              const title = entry.album.title || t("albumUnavailable");
              const artistHref = collectionArtistHref(entry);
              const cover = (
                <CoverThumb
                  cover={entry.album.coverThumbUrl}
                  label=""
                  className="size-12"
                  priority={priorityIds?.has(entry.id) ?? false}
                />
              );
              return (
                <li
                  key={entry.id}
                  className={`flex flex-wrap items-start gap-x-3 gap-y-2 py-3 transition-colors sm:flex-nowrap ${
                    selected ? "bg-amber/5" : ""
                  }`}
                >
                  {selecting ? (
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => selection!.onToggle(entry.id)}
                      aria-label={t("selectEntry", { title: entry.album.title })}
                      className="mt-4 size-4 shrink-0 accent-amber [@media(pointer:coarse)]:size-6"
                    />
                  ) : null}

                  {selecting ? (
                    // En modo selección la carátula marca la copia; la casilla es el control accesible.
                    <button
                      type="button"
                      tabIndex={-1}
                      aria-hidden
                      onClick={() => selection!.onToggle(entry.id)}
                      className={`shrink-0 overflow-hidden rounded ${selected ? "ring-2 ring-amber" : ""}`}
                    >
                      {cover}
                    </button>
                  ) : (
                    <Link href={collectionAlbumHref(entry)} tabIndex={-1} aria-hidden className="shrink-0 overflow-hidden rounded">
                      {cover}
                    </Link>
                  )}

                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <Link
                        href={collectionAlbumHref(entry)}
                        className="font-display text-base text-paper transition-colors hover:text-amber"
                      >
                        {title}
                      </Link>
                      {entry.album.artistName && !groupedByArtist ? (
                        artistHref ? (
                          <Link
                            href={artistHref}
                            className="font-data text-xs text-paper-muted transition-colors hover:text-paper"
                          >
                            {entry.album.artistName}
                          </Link>
                        ) : (
                          <span className="font-data text-xs text-paper-muted">{entry.album.artistName}</span>
                        )
                      ) : null}
                      {entry.album.year ? (
                        <span className="font-data text-xs text-paper-muted">{entry.album.year}</span>
                      ) : null}
                    </div>

                    <p className="font-data text-xs text-paper-muted">
                      <span className="text-paper">{t(`format.${entry.format}`)}</span>
                      {entry.attributes.map((attribute) => (
                        <span key={attribute}>
                          <span aria-hidden> · </span>
                          {t(`attribute.${attribute}`)}
                        </span>
                      ))}
                    </p>

                    {entry.note ? (
                      <p className="font-body text-sm italic text-paper-muted">{entry.note}</p>
                    ) : null}

                    {actions?.errorId === entry.id ? <RemoveError /> : null}
                  </div>

                  <div className="flex w-full shrink-0 items-center gap-1 sm:w-auto">
                    <time dateTime={entry.createdAt} className="mr-1 font-data text-[0.7rem] text-paper-muted">
                      {t("addedOn", { date: formatCollectionDate(entry.createdAt, locale) })}
                    </time>
                    {actions && !selecting ? (
                      <EntryMenu
                        title={title}
                        audience={entry.audience}
                        busy={actions.busyId === entry.id}
                        showBadge
                        onEdit={() => actions.onEdit(entry)}
                        onAudienceChange={(audience) => actions.onAudienceChange(entry, audience)}
                        onRemove={() => actions.onRemove(entry)}
                      />
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
