"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import type { CollectionEntry } from "@/lib/api/schemas";
import { CollectionGroupHeading } from "./CollectionGroupHeading";
import { EntryMenu } from "./EntryMenu";
import { EditionSummary, PrivateMark, RemoveError } from "./entry-parts";
import {
  albumByline,
  collectionAlbumHref,
  type CollectionGroup,
  type CollectionRowActions,
  type CollectionSelectionState,
} from "./collection-shared";

interface ShelfGridProps {
  groups: CollectionGroup[];
  actions: CollectionRowActions | null;
  selection: CollectionSelectionState | null;
  /** Entradas cuyas carátulas cargan con prioridad (las primeras). */
  priorityIds?: Set<string>;
  /** Las secciones son artistas: el pie muestra solo el año. */
  groupedByArtist?: boolean;
}

// Modo "Estantería" (openspec: redesign-collection-views, D7): cuadrícula de carátulas con el menú `⋯` encima (visible
// al pasar el mouse o con foco; siempre con puntero grueso) y un pie de tres líneas: título, "artista · año" y "formato
// · primer atributo". Una copia privada lleva un candado. La edición se abre en la hoja lateral.
export function ShelfGrid({ groups, actions, selection, priorityIds, groupedByArtist = false }: ShelfGridProps) {
  return (
    <div className="flex flex-col gap-8">
      {groups.map((group) => (
        <section key={group.key} className="flex flex-col gap-3">
          <CollectionGroupHeading group={group} />
          <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {group.entries.map((entry) => (
              <ShelfTile
                key={entry.id}
                entry={entry}
                actions={actions}
                selection={selection}
                priority={priorityIds?.has(entry.id) ?? false}
                groupedByArtist={groupedByArtist}
              />
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
  priority,
  groupedByArtist,
}: {
  entry: CollectionEntry;
  actions: CollectionRowActions | null;
  selection: CollectionSelectionState | null;
  priority: boolean;
  groupedByArtist: boolean;
}) {
  const t = useTranslations("collection");
  const busy = actions?.busyId === entry.id;
  const selecting = Boolean(selection?.active);
  const selected = selecting && selection!.selectedIds.has(entry.id);
  const title = entry.album.title || t("albumUnavailable");
  const byline = groupedByArtist ? (entry.album.year ? String(entry.album.year) : "") : albumByline(entry.album);
  const cover = <CoverThumb cover={entry.album.coverThumbUrl} label="" className="aspect-square w-full" priority={priority} />;

  return (
    <li className="group relative flex min-w-0 flex-col gap-2">
      <div className="relative">
        {selecting ? (
          // En modo selección la carátula marca la copia en vez de abrir el álbum. La casilla es el control
          // accesible; este botón solo agranda el área (fuera del orden de tabulación).
          <button
            type="button"
            tabIndex={-1}
            aria-hidden
            onClick={() => selection!.onToggle(entry.id)}
            className={`block w-full overflow-hidden rounded-lg border transition-colors ${
              selected ? "border-amber ring-2 ring-amber" : "border-ink-border hover:border-amber"
            }`}
          >
            {cover}
          </button>
        ) : (
          <Link
            href={collectionAlbumHref(entry)}
            aria-label={title}
            className="block overflow-hidden rounded-lg border border-ink-border transition-colors hover:border-amber focus-visible:border-amber"
          >
            {cover}
          </Link>
        )}
        {actions ? <PrivateMark audience={entry.audience} /> : null}
        {selecting ? (
          <input
            type="checkbox"
            checked={selected}
            onChange={() => selection!.onToggle(entry.id)}
            aria-label={t("selectEntry", { title: entry.album.title })}
            className="absolute left-1.5 top-1.5 size-5 accent-amber [@media(pointer:coarse)]:size-6"
          />
        ) : actions ? (
          <div className="absolute right-1.5 top-1.5 opacity-100 transition-opacity focus-within:opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [&:has([aria-expanded=true])]:opacity-100">
            <EntryMenu
              title={title}
              audience={entry.audience}
              busy={busy}
              overlay
              onEdit={() => actions.onEdit(entry)}
              onAudienceChange={(audience) => actions.onAudienceChange(entry, audience)}
              onRemove={() => actions.onRemove(entry)}
            />
          </div>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-col gap-0.5">
        <Link
          href={collectionAlbumHref(entry)}
          className="truncate font-display text-sm text-paper transition-colors hover:text-amber"
        >
          {title}
        </Link>
        {byline ? <span className="truncate font-data text-xs text-paper-muted">{byline}</span> : null}
        <span className="truncate font-data text-[0.7rem] text-paper-muted/80">
          <EditionSummary format={entry.format} attributes={entry.attributes} />
        </span>
      </div>

      {actions?.errorId === entry.id ? <RemoveError /> : null}
    </li>
  );
}
