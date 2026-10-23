"use client";

import { Fragment } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { EntryActions } from "./EntryActions";
import { EntryExtras } from "./EntryExtras";
import { NotedAgo } from "./entry-parts";
import { wantToListenHref } from "./want-to-listen-shared";
import type { WantToListenRendererProps } from "./want-to-listen-items-view";

// Modo Índice como tabla (openspec: redesign-want-to-listen-views, D6): Título, Artista y Año (solo álbumes),
// Anotado y acciones. Bajo `sm` quedan Título (con el artista debajo) y acciones; los encabezados siguen para los
// lectores de pantalla.
export function EntriesIndex({ entries, actions }: WantToListenRendererProps) {
  const t = useTranslations("wantToListen");
  const albums = entries.some((entry) => entry.targetType === "release-group");
  const columns = albums ? 5 : 3;
  const head = "px-2 py-1.5 text-left font-data text-[0.7rem] font-normal uppercase tracking-wide text-paper-muted";
  const cell = "px-2 py-2 align-middle";

  return (
    <table className="w-full table-fixed border-collapse">
      <thead className="max-sm:sr-only">
        <tr className="border-b border-ink-border">
          <th scope="col" className={`${head} w-auto`}>
            {t("colTitle")}
          </th>
          {albums ? (
            <>
              <th scope="col" className={`${head} w-[28%] max-sm:hidden`}>
                {t("colArtist")}
              </th>
              <th scope="col" className={`${head} w-16 max-sm:hidden`}>
                {t("colYear")}
              </th>
            </>
          ) : null}
          <th scope="col" className={`${head} w-36 max-sm:hidden`}>
            {t("colNoted")}
          </th>
          <th scope="col" className={`${head} w-12`}>
            <span className="sr-only">{t("colActions")}</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => (
          <Fragment key={entry.id}>
            <tr className="border-b border-ink-border transition-colors hover:bg-ink-surface">
              <td className={`${cell} min-w-0`}>
                <Link
                  href={wantToListenHref(entry)}
                  className="block truncate font-display text-sm text-paper transition-colors hover:text-amber"
                >
                  {entry.target.title}
                </Link>
                {entry.target.artistName ? (
                  <span className="block truncate font-data text-xs text-paper-muted sm:hidden">
                    {entry.target.artistName}
                    {entry.target.year ? ` · ${entry.target.year}` : ""}
                  </span>
                ) : null}
              </td>
              {albums ? (
                <>
                  <td className={`${cell} truncate font-data text-xs text-paper-muted max-sm:hidden`}>
                    {entry.target.artistName ?? ""}
                  </td>
                  <td className={`${cell} font-data text-xs tabular-nums text-paper-muted max-sm:hidden`}>
                    {entry.target.year ?? ""}
                  </td>
                </>
              ) : null}
              <td className={`${cell} font-data text-xs text-paper-muted max-sm:hidden`}>
                <NotedAgo iso={entry.createdAt} />
              </td>
              <td className={`${cell} text-right`}>
                <div className="flex justify-end">
                  <EntryActions entry={entry} actions={actions} />
                </div>
              </td>
            </tr>
            {actions.errorId === entry.id || actions.listOpenId === entry.id ? (
              <tr>
                <td colSpan={columns} className="px-2 pb-3">
                  <EntryExtras entry={entry} actions={actions} />
                </td>
              </tr>
            ) : null}
          </Fragment>
        ))}
      </tbody>
    </table>
  );
}
