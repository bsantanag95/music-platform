"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { albumHref, songHref } from "@/lib/catalog-links";
import { formatDuration } from "@/components/album/album-format";
import type { SongGroupResult } from "@/services/catalog/search/types";
import { LazyCoverImage } from "../LazyCoverImage";

// Ficha de la canción resuelta en Canciones (openspec: redesign-search-phase2, design D4). Reemplaza en la búsqueda
// rápida al panel «Álbumes que contienen…»: la canción tiene su ficha (título, artista, duración, carátula del primer
// disco) y sus discos van en una tira de carátulas. El título es dato del catálogo: no se traduce.

/** Discos visibles en la tira antes de «Ver N más». */
const VISIBLE_ALBUMS = 5;

export function SongAnswer({ group }: { group: SongGroupResult }) {
  const t = useTranslations("catalog");
  const [expanded, setExpanded] = useState(false);
  const total = group.albums.length;
  const visible = expanded ? group.albums : group.albums.slice(0, VISIBLE_ALBUMS);
  const hidden = total - visible.length;
  const first = group.albums[0];

  return (
    <section aria-labelledby="song-answer" className="flex flex-col">
      <h3 className="sr-only">{t("search.results.songs.answerLabel")}</h3>
      <article className="grid grid-cols-1 gap-5 rounded-xl border border-ink-border bg-ink-surface p-5 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-7 sm:p-6">
        <div className="w-32 sm:w-40">
          {first ? (
            <LazyCoverImage releaseGroupId={first.id} coverLabel="" className="aspect-square w-full" />
          ) : (
            <span aria-hidden className="block aspect-square w-full rounded bg-ink" />
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-1">
            <p id="song-answer" className="wrap-break-word font-display text-2xl font-bold leading-tight tracking-[-0.015em] text-paper sm:text-3xl">
              {group.title}
            </p>
            <p className="flex flex-wrap items-baseline gap-x-3 font-display text-lg text-paper-muted">
              {group.artistName ? <span>{group.artistName}</span> : null}
              {group.durationSec != null ? <span className="font-data text-xs">{formatDuration(group.durationSec)}</span> : null}
            </p>
          </div>

          {total === 0 ? (
            <p className="font-body text-sm text-paper-muted">{t("search.results.songs.noAlbums")}</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              <p className="font-data text-xs text-paper-muted">{t("search.results.songs.appearsIn", { count: total })}</p>
              <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                {visible.map((album) => (
                  <li key={album.id} className="min-w-0">
                    <Link href={albumHref(group.artistName, album.title, album.id)} className="group flex flex-col gap-1.5">
                      <LazyCoverImage releaseGroupId={album.id} coverLabel="" className="aspect-square w-full" />
                      <span className="truncate font-display text-xs text-paper transition-colors group-hover:text-amber">
                        {album.title}
                      </span>
                      <span className="truncate font-data text-[11px] text-paper-muted">
                        {[t(`artist.categories.${album.category}`), album.year].filter(Boolean).join(" · ")}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              {total > VISIBLE_ALBUMS ? (
                <button
                  type="button"
                  onClick={() => setExpanded((value) => !value)}
                  className="inline-flex h-9 items-center self-start rounded-full border border-ink-border px-3.5 font-data text-xs text-paper-muted transition-colors hover:border-amber/60 hover:text-paper"
                >
                  {expanded ? t("search.results.songContext.showLess") : t("search.results.songContext.showMore", { count: hidden })}
                </button>
              ) : null}
            </div>
          )}

          {group.recordingId ? (
            <Link
              href={songHref(group.artistName, group.title, group.recordingId)}
              aria-label={t("search.results.songContext.viewSongAria", { song: group.title })}
              className="inline-flex h-11 items-center gap-2 self-start rounded-lg bg-amber px-5 font-display text-sm text-ink transition-colors hover:bg-amber-hover"
            >
              {t("search.results.songs.viewSong")} <span aria-hidden>→</span>
            </Link>
          ) : null}
        </div>
      </article>
    </section>
  );
}
