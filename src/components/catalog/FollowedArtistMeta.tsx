"use client";

import type { ReactNode } from "react";
import { useFormatter, useLocale, useNow, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { albumHref } from "@/lib/catalog-links";
import { countryName } from "@/components/artist/artist-format";
import type { FollowedArtistDto, FollowedArtistRelease } from "@/lib/api/schemas";

// Tipos que la línea de detalle nombra (redesign-artists-rows, D1); el resto no se nombra.
const NAMED_TYPES = new Set(["person", "group", "orchestra", "choir"]);

// Una fecha de calendario (`AAAA-MM-DD`) como instante a medianoche UTC: se formatea en UTC para que el día no se corra
// según la zona de quien mira.
function calendarDate(day: string): Date {
  return new Date(`${day}T00:00:00Z`);
}

function isUpcoming(day: string, now: Date): boolean {
  return day > now.toISOString().slice(0, 10);
}

/** Fecha corta de una novedad que sale ("14 nov") o `null` si ya salió (la insignia dice "Nuevo"). */
export function useUpcomingShortDate(news: FollowedArtistRelease | null | undefined): string | null {
  const format = useFormatter();
  const now = useNow();
  if (!news?.date || !isUpcoming(news.date, now)) return null;
  return format.dateTime(calendarDate(news.date), { day: "numeric", month: "short", timeZone: "UTC" });
}

function ReleaseLink({ artist, release }: { artist: FollowedArtistDto; release: FollowedArtistRelease }) {
  if (!release.releaseGroupId) return <>{release.title}</>;
  return (
    <Link
      href={albumHref(artist.name, release.title, release.releaseGroupId)}
      className="underline decoration-ink-border underline-offset-2 transition-colors hover:text-amber hover:decoration-amber"
    >
      {release.title}
    </Link>
  );
}

// Unidad indivisible de la línea: el salto solo cae entre unidades, y el separador va al inicio de la unidad.
// Un título largo sí puede partirse (`wrap`), para no desbordar en un teléfono.
function Unit({ first, wrap = false, children }: { first: boolean; wrap?: boolean; children: ReactNode }) {
  return (
    <>
      {first ? null : " "}
      <span className={wrap ? undefined : "whitespace-nowrap"}>
        {first ? null : "· "}
        {children}
      </span>
    </>
  );
}

// Línea de detalle y novedad de un artista seguido en Índice (openspec: redesign-artists-rows, D1–D2): país, tipo,
// último disco y desde cuándo lo sigues; debajo, en ámbar, la novedad del calendario. Sin cifras de discos escuchados.
export function FollowedArtistMeta({ artist }: { artist: FollowedArtistDto }) {
  const t = useTranslations("users.artistsFollowed");
  const locale = useLocale();
  const format = useFormatter();
  const now = useNow();

  const parts: { node: ReactNode; wrap?: boolean }[] = [];
  const country = countryName(artist.country ?? null, locale);
  if (country) parts.push({ node: country });
  if (NAMED_TYPES.has(artist.type)) parts.push({ node: t(`typeLabel.${artist.type}`) });
  const latest = artist.latestRelease;
  // Con novedad, "Último" no repite el mismo disco (D2).
  if (latest && latest.title !== artist.news?.title) {
    parts.push({
      node: (
        <>
          {t("latest")} <ReleaseLink artist={artist} release={latest} />
          {latest.year != null ? ` (${latest.year})` : null}
        </>
      ),
      wrap: true,
    });
  }
  if (artist.followedAt) {
    parts.push({
      node: t("followedSince", {
        date: format.dateTime(new Date(artist.followedAt), { month: "short", year: "numeric" }),
      }),
    });
  }

  const news = artist.news;
  let newsLine: ReactNode = null;
  if (news?.date) {
    const upcoming = isUpcoming(news.date, now);
    const when = upcoming
      ? t("newsUpcoming", {
          date: format.dateTime(calendarDate(news.date), { day: "numeric", month: "short", timeZone: "UTC" }),
        })
      : t("newsReleased", { when: format.relativeTime(calendarDate(news.date), now) });
    newsLine = (
      <p className="font-data text-xs text-amber">
        <span aria-hidden="true">● </span>
        {when}: «<ReleaseLink artist={artist} release={news} />»
      </p>
    );
  }

  if (parts.length === 0 && !newsLine) return null;
  return (
    <div className="min-w-0">
      {parts.length > 0 ? (
        <p className="font-data text-xs text-paper-muted">
          {parts.map((part, index) => (
            <Unit key={index} first={index === 0} wrap={part.wrap}>
              {part.node}
            </Unit>
          ))}
        </p>
      ) : null}
      {newsLine}
    </div>
  );
}
