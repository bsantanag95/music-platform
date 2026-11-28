import { cache } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { albumHref } from "@/lib/catalog-links";
import { findInOtherType } from "@/services/catalog/search/other-type";
import type { SearchType } from "@/services/catalog/search/types";
import { searchHref } from "../search-types";
import { SearchTypeIcon } from "../SearchTypeIcon";
import { LazyCoverImage } from "../LazyCoverImage";

// «x» en otros tipos, en la columna lateral de la búsqueda rápida (openspec: redesign-search-phase2, design D5). Solo de
// la base propia: ninguna solicitud a MusicBrainz. Se transmite en su propio `Suspense`; sin coincidencias, no se pinta.
// `ResultsLayout` pinta el panel dos veces (teléfono y columna fija): una sola consulta por petición.
const findCached = cache(findInOtherType);

export async function OtherTypePanel({ type, query }: { type: SearchType; query: string }) {
  const matches = await findCached(type, query);
  if (!matches) return null;
  const t = await getTranslations("catalog.search");
  const typeName = t(`types.${matches.type}`).toLowerCase();

  return (
    <section
      aria-labelledby={`other-type-${matches.type}`}
      className="flex flex-col gap-3 rounded-xl border border-ink-border bg-ink-surface/60 p-5"
    >
      <h3 id={`other-type-${matches.type}`} className="font-display text-base font-bold text-paper">
        {t("results.otherType.title", { query, type: typeName })}
      </h3>
      <ul className="flex flex-col divide-y divide-ink-border">
        {matches.type === "album"
          ? matches.rows.map((album) => (
              <li key={album.id} className="py-2.5 first:pt-0 last:pb-0">
                <Link href={albumHref(album.artistName, album.title, album.id)} className="group flex items-center gap-3">
                  <LazyCoverImage releaseGroupId={album.id} coverLabel="" className="size-10 shrink-0" />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate font-display text-sm text-paper transition-colors group-hover:text-amber">
                      {album.title}
                    </span>
                    <span className="truncate font-data text-[11px] text-paper-muted">
                      {[album.artistName, album.year].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </Link>
              </li>
            ))
          : matches.rows.map((song) => (
              <li key={song.key} className="py-2.5 first:pt-0 last:pb-0">
                <Link href={searchHref("song", song.query)} className="group flex items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded bg-ink text-paper-muted">
                    <SearchTypeIcon type="song" className="size-4" />
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate font-display text-sm text-paper transition-colors group-hover:text-amber">
                      {song.title}
                    </span>
                    {song.artistName ? (
                      <span className="truncate font-data text-[11px] text-paper-muted">{song.artistName}</span>
                    ) : null}
                  </span>
                </Link>
              </li>
            ))}
      </ul>
      <Link
        href={searchHref(matches.type, query)}
        className="self-start font-data text-xs text-paper-muted transition-colors hover:text-amber"
      >
        {t("results.otherType.seeAll", { type: typeName })} <span aria-hidden>→</span>
      </Link>
    </section>
  );
}
