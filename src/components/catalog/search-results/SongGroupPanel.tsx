"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { SongGroupResult } from "@/services/catalog/search/types";
import { LazyCoverImage } from "../LazyCoverImage";

// Cuántos álbumes se ven antes de "Ver más". Una canción muy versionada
// aparece en decenas de compilados; el corte deja arriba lo esencial y el
// resto queda a un clic.
const VISIBLE_ALBUMS = 5;

// La canción resuelta del tipo Canciones: "Álbumes que contienen «canción»"
// (la sección contextual de la búsqueda anterior, ahora resultado principal
// del tipo — openspec: redesign-scoped-search). Un único panel `ink-surface`
// con hairline; la veta de ámbar es un punto junto al encabezado, como una
// aguja de VU. El título de la canción es dato del catálogo: no se traduce.
export function SongGroupPanel({ group }: { group: SongGroupResult }) {
  const t = useTranslations("catalog");
  const [expanded, setExpanded] = useState(false);

  const total = group.albums.length;
  const visible = expanded ? group.albums : group.albums.slice(0, VISIBLE_ALBUMS);
  const hidden = total - visible.length;

  return (
    <section className="flex w-full flex-col gap-3 rounded-lg border border-ink-border bg-ink-surface p-4">
      <header className="flex flex-col gap-0.5">
        <h3 className="flex items-center gap-2 font-display text-base text-paper">
          <span className="size-1.5 shrink-0 rounded-full bg-amber" aria-hidden />
          {t("search.results.songContext.title", { song: group.title })}
        </h3>
        {/* Artista y acción comparten fila: el enlace no suma un renglón suelto. */}
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 pl-3.5">
          {group.artistName ? <p className="min-w-0 font-data text-xs text-paper-muted">{group.artistName}</p> : null}
          {group.recordingId ? (
            // Enlace directo a la ficha de la canción resuelta (openspec:
            // link-song-from-search); el panel describe sus álbumes, así que la
            // canción se ofrece como acción explícita.
            <Link
              href={`/song/${group.recordingId}`}
              aria-label={t("search.results.songContext.viewSongAria", { song: group.title })}
              className="shrink-0 font-data text-xs text-amber underline-offset-2 transition-colors hover:text-amber-hover hover:underline"
            >
              {t("search.results.songContext.viewSong")} <span aria-hidden>→</span>
            </Link>
          ) : null}
        </div>
      </header>

      {total === 0 ? (
        <p className="font-body text-sm text-paper-muted">{t("search.results.songs.noAlbums")}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-ink-border">
          {visible.map((album) => {
            const meta = [t(`artist.categories.${album.category}`), album.year !== null ? String(album.year) : null]
              .filter(Boolean)
              .join(" · ");
            return (
              <li key={album.id} className="py-3 first:pt-0 last:pb-0">
                <Link href={`/album/${album.id}`} className="group flex gap-3">
                  <LazyCoverImage releaseGroupId={album.id} coverLabel="" className="size-10 shrink-0" />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate font-display text-sm text-paper transition-colors group-hover:text-amber">
                      {album.title}
                    </span>
                    {meta ? <span className="truncate font-data text-xs text-paper-muted">{meta}</span> : null}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {total > VISIBLE_ALBUMS ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="self-start font-data text-xs text-paper-muted transition-colors hover:text-paper"
        >
          {expanded
            ? t("search.results.songContext.showLess")
            : t("search.results.songContext.showMore", { count: hidden })}
        </button>
      ) : null}
    </section>
  );
}
