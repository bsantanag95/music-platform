"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CollectionGroupHeading } from "./CollectionGroupHeading";
import { EntryMenu } from "./EntryMenu";
import { RemoveError } from "./entry-parts";
import {
  collectionAlbumHref,
  formatCollectionDate,
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
  /** Las secciones son artistas: la columna Artista sobra. */
  groupedByArtist?: boolean;
}

// Modo "Índice" (openspec: redesign-collection-views, D7): una tabla por sección con posición, álbum, artista, formato,
// edición, fecha de alta y el `⋯`. Bajo `sm` los encabezados quedan solo para lectores de pantalla, Formato y Edición se
// ocultan y el artista pasa bajo el título. La posición es global a toda la lista, no por sección.
export function EntriesIndex({ groups, actions, selection, groupedByArtist = false }: EntriesIndexProps) {
  const t = useTranslations("collection");
  const locale = useLocale();
  let counter = 0;
  const head = "px-2 py-2 text-left font-normal max-sm:sr-only";

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <section key={group.key} className="flex flex-col gap-1">
          <CollectionGroupHeading group={group} />
          <table className="w-full border-collapse font-data text-sm">
            <thead className="text-[0.7rem] text-paper-muted">
              <tr>
                <th scope="col" className={`${head} w-10 pl-0`}>
                  {selection?.active ? <span className="sr-only">{t("selectMode")}</span> : "#"}
                </th>
                <th scope="col" className={head}>
                  {t("indexAlbum")}
                </th>
                {!groupedByArtist ? (
                  <th scope="col" className={`${head} max-sm:hidden`}>
                    {t("indexArtist")}
                  </th>
                ) : null}
                <th scope="col" className={`${head} max-sm:hidden`}>
                  {t("formatLabel")}
                </th>
                <th scope="col" className={`${head} max-md:hidden`}>
                  {t("editionLabel")}
                </th>
                <th scope="col" className={`${head} text-right max-sm:hidden`}>
                  {t("indexAdded")}
                </th>
                <th scope="col" className="w-12 px-0 py-2">
                  <span className="sr-only">{t("indexActions")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {group.entries.map((entry) => {
                counter += 1;
                const position = counter;
                const title = entry.album.title || t("albumUnavailable");
                const selected = Boolean(selection?.active) && selection!.selectedIds.has(entry.id);
                return (
                  <tr
                    key={entry.id}
                    className={`border-t border-ink-border align-middle ${selected ? "bg-amber/5" : ""}`}
                  >
                    <td className="w-10 py-1.5 pr-2 text-paper-muted tabular-nums">
                      {selection?.active ? (
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => selection.onToggle(entry.id)}
                          aria-label={t("selectEntry", { title: entry.album.title })}
                          className="size-4 accent-amber [@media(pointer:coarse)]:size-6"
                        />
                      ) : (
                        String(position).padStart(2, "0")
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      <Link href={collectionAlbumHref(entry)} className="text-paper transition-colors hover:text-amber">
                        {title}
                      </Link>
                      {!groupedByArtist && entry.album.artistName ? (
                        <span className="block text-xs text-paper-muted sm:hidden">{entry.album.artistName}</span>
                      ) : null}
                      {actions?.errorId === entry.id ? (
                        <span className="block">
                          <RemoveError />
                        </span>
                      ) : null}
                    </td>
                    {!groupedByArtist ? (
                      <td className="px-2 py-1.5 text-paper-muted max-sm:hidden">{entry.album.artistName ?? ""}</td>
                    ) : null}
                    <td className="px-2 py-1.5 text-paper max-sm:hidden">{t(`format.${entry.format}`)}</td>
                    <td className="px-2 py-1.5 text-xs text-paper-muted max-md:hidden">
                      {entry.attributes.length > 0
                        ? entry.attributes.map((attribute) => t(`attribute.${attribute}`)).join(" · ")
                        : "—"}
                    </td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-right text-xs text-paper-muted max-sm:hidden">
                      {formatCollectionDate(entry.createdAt, locale)}
                    </td>
                    <td className="w-12 py-1 text-right">
                      {actions && !selection?.active ? (
                        <div className="flex justify-end">
                          <EntryMenu
                            title={title}
                            audience={entry.audience}
                            busy={actions.busyId === entry.id}
                            onEdit={() => actions.onEdit(entry)}
                            onAudienceChange={(audience) => actions.onAudienceChange(entry, audience)}
                            onRemove={() => actions.onRemove(entry)}
                          />
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
