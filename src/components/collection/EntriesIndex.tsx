"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CollectionEntryControls } from "./CollectionEntryControls";
import { CollectionGroupHeading } from "./CollectionGroupHeading";
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
  /** Sin carátulas en el Índice: se acepta para compartir la firma de los renderers. */
  priorityIds?: Set<string>;
  /** Las secciones son artistas: la fila no repite el artista del encabezado. */
  groupedByArtist?: boolean;
}

// Modo "Índice": filas compactas `NN · Álbum — artista · formato`, con los
// controles siempre visibles en la misma fila (debajo en pantallas angostas).
// Antes se ocultaban con opacidad hasta el hover, pero seguían ocupando su
// línea y dejaban un hueco en cada fila.
export function EntriesIndex({ groups, actions, selection, groupedByArtist = false }: EntriesIndexProps) {
  const t = useTranslations("collection");
  let counter = 0;

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <section key={group.key} className="flex flex-col">
          <CollectionGroupHeading group={group} className="mb-1" />
          <ol className="flex flex-col">
            {group.entries.map((entry) => {
              counter += 1;
              const position = counter;
              return (
                <li
                  key={entry.id}
                  className={`flex flex-col gap-x-4 gap-y-1 border-b border-ink-border py-2 last:border-b-0 ${
                    actions?.editingId === entry.id ? "" : "sm:flex-row sm:items-center"
                  }`}
                >
                  <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 font-data text-sm">
                    {selection?.active ? (
                      <input
                        type="checkbox"
                        checked={selection.selectedIds.has(entry.id)}
                        onChange={() => selection.onToggle(entry.id)}
                        aria-label={t("selectEntry", { title: entry.album.title })}
                        className="size-3.5 shrink-0 accent-amber [@media(pointer:coarse)]:size-6"
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
                    {entry.album.artistName && !groupedByArtist ? (
                      <span className="text-paper-muted">— {entry.album.artistName}</span>
                    ) : null}
                    <span className="text-paper-muted">· {t(`format.${entry.format}`)}</span>
                  </div>

                  {actions && !selection?.active ? (
                    <div className={actions.editingId === entry.id ? "" : "shrink-0 [&>div]:mt-0"}>
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
