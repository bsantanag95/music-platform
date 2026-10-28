"use client";

import { useFormatter, useNow, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { albumHref, artistHref } from "@/lib/catalog-links";
import type { FollowedArtistDto } from "@/lib/api/schemas";

const MAX_ITEMS = 6;

/**
 * Novedades del riel (redesign-artists-rows, D5): primero lo que sale (la más cercana primero), luego lo reciente (la
 * más nueva primero), hasta seis.
 */
export function railReleases(artists: FollowedArtistDto[], today: string): FollowedArtistDto[] {
  const withNews = artists.filter((artist) => artist.news?.date);
  const upcoming = withNews
    .filter((artist) => artist.news!.date! > today)
    .sort((a, b) => (a.news!.date! < b.news!.date! ? -1 : 1));
  const recent = withNews
    .filter((artist) => artist.news!.date! <= today)
    .sort((a, b) => (a.news!.date! > b.news!.date! ? -1 : 1));
  return [...upcoming, ...recent].slice(0, MAX_ITEMS);
}

// Riel "Próximos lanzamientos" de `/me/artists`, desde `lg` (openspec: redesign-artists-rows, D5). Por debajo no se
// muestra: la sección "Con novedades" de la lista ya las tiene. Sin novedades no se renderiza.
export function FollowedArtistReleasesRail({ artists }: { artists: FollowedArtistDto[] }) {
  const t = useTranslations("users.artistsFollowed");
  const format = useFormatter();
  const now = useNow();
  const today = now.toISOString().slice(0, 10);
  const items = railReleases(artists, today);
  if (items.length === 0) return null;

  return (
    <aside aria-label={t("railLabel")} className="hidden w-full flex-col gap-4 lg:flex">
      <section className="rounded-lg border border-ink-border bg-ink-surface px-4 py-4">
        <h2 className="font-display text-base text-paper">{t("railTitle")}</h2>
        <ol className="mt-3 flex flex-col gap-3">
          {items.map((artist) => {
            const news = artist.news!;
            const date = new Date(`${news.date}T00:00:00Z`);
            const upcoming = news.date! > today;
            return (
              <li key={artist.id} className="min-w-0">
                {news.releaseGroupId ? (
                  <Link
                    href={albumHref(artist.name, news.title, news.releaseGroupId)}
                    className="block truncate font-display text-sm text-paper transition-colors hover:text-amber"
                  >
                    {news.title}
                  </Link>
                ) : (
                  <p className="truncate font-display text-sm text-paper">{news.title}</p>
                )}
                <p className="truncate font-data text-xs text-paper-muted">
                  <Link href={artistHref(artist.name, artist.id)} className="transition-colors hover:text-paper">
                    {artist.name}
                  </Link>
                  {" · "}
                  <span className={upcoming ? "text-amber" : undefined}>
                    {upcoming
                      ? format.dateTime(date, { day: "numeric", month: "short", timeZone: "UTC" })
                      : format.relativeTime(date, now)}
                  </span>
                </p>
              </li>
            );
          })}
        </ol>
      </section>
    </aside>
  );
}
