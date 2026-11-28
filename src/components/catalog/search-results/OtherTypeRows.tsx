import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { albumHref, artistHref } from "@/lib/catalog-links";
import { AppImage } from "@/components/ui/AppImage";
import type { OtherTypeMatches } from "@/services/catalog/search/other-type";
import { searchHref } from "../search-types";
import { SearchTypeIcon } from "../SearchTypeIcon";
import { ResultCover } from "./ResultCover";

// Filas mini de coincidencias en otro tipo (openspec: redesign-search-phase2 y phase3, design D5): las comparten el panel
// lateral «x en otros tipos» y el estado sin resultados. Carátula, retrato (o inicial) o icono, título y una línea de datos.
export function OtherTypeRows({ matches }: { matches: OtherTypeMatches }) {
  const t = useTranslations("catalog.search.results.artists");
  return (
    <ul className="flex flex-col divide-y divide-ink-border">
      {matches.type === "album"
        ? matches.rows.map((album) => (
            <Row
              key={album.id}
              href={albumHref(album.artistName, album.title, album.id)}
              thumb={<ResultCover item={album} className="size-10 shrink-0" />}
              title={album.title}
              meta={[album.artistName, album.year].filter(Boolean).join(" · ")}
            />
          ))
        : matches.type === "song"
          ? matches.rows.map((song) => (
              <Row
                key={song.key}
                href={searchHref("song", song.query)}
                thumb={
                  <span className="flex size-10 shrink-0 items-center justify-center rounded bg-ink text-paper-muted">
                    <SearchTypeIcon type="song" className="size-4" />
                  </span>
                }
                title={song.title}
                meta={song.artistName ?? ""}
              />
            ))
          : matches.rows.map((artist) => (
              <Row
                key={artist.id}
                href={artistHref(artist.name, artist.id)}
                thumb={
                  artist.photoUrl ? (
                    <span className="relative size-10 shrink-0 overflow-hidden rounded-full bg-ink">
                      <AppImage src={artist.photoUrl} alt="" fill sizes="2.5rem" className="object-cover" />
                    </span>
                  ) : (
                    <span
                      aria-hidden
                      className="flex size-10 shrink-0 items-center justify-center rounded-full border border-ink-border bg-ink font-display text-sm font-bold text-paper-muted"
                    >
                      {artist.name.trim().charAt(0).toUpperCase() || "?"}
                    </span>
                  )
                }
                title={artist.name}
                meta={artist.discCount ? t("discs", { count: artist.discCount }) : (artist.disambiguation ?? "")}
              />
            ))}
    </ul>
  );
}

function Row({ href, thumb, title, meta }: { href: string; thumb: React.ReactNode; title: string; meta: string }) {
  return (
    <li className="py-2.5 first:pt-0 last:pb-0">
      <Link href={href} className="group flex items-center gap-3">
        {thumb}
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate font-display text-sm text-paper transition-colors group-hover:text-amber">{title}</span>
          {meta ? <span className="truncate font-data text-[11px] text-paper-muted">{meta}</span> : null}
        </span>
      </Link>
    </li>
  );
}
