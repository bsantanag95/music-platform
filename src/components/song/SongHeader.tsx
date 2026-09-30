import { Fragment, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { albumHref, artistHref, songHref } from "@/lib/catalog-links";
import { StatTile, ThresholdedTileValue } from "@/components/album/AlbumHeader";
import { formatDuration, formatStars } from "@/components/album/album-format";
import { SongwriterNames } from "@/components/catalog/SongwriterNames";
import { discYear, type ContainingAlbum } from "@/services/catalog/recording-detail";
import type { TrackCreditPerson } from "@/services/catalog/personnel-levels";
import type { VersionLine } from "@/services/catalog/recording-versions";
import type { SongCommunityStats } from "@/services/catalog/song-community";

// Cabecera de la página de canción (openspec: redesign-song-page, `song-page-layout` y
// `song-community-stats`): identidad, ficha técnica y bloque de comunidad. Sin estado: se
// renderizan en el servidor.

/** Número visible de una pista: `disco-pista` en álbumes de varios discos. */
export function trackNumber(track: { discNumber: number; position: number }, multiDisc: boolean): string {
  return multiDisc ? `${track.discNumber}-${track.position}` : String(track.position);
}

interface SongIdentityProps {
  title: string;
  artists: { artistId: string; name: string; joinPhrase: string | null }[];
}

export function SongIdentity({ title, artists }: SongIdentityProps) {
  const t = useTranslations("catalog.song");
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <p className="font-data text-xs uppercase tracking-wider text-paper-muted">
        {/* La posición y el disco los nombran la tira y las migas (polish-song-credits-strip). */}
        {t("kicker")}
      </p>
      <h1 className="font-display text-3xl leading-tight text-paper [overflow-wrap:anywhere] sm:text-4xl">{title}</h1>
      {artists.length > 0 && (
        <p className="font-body text-lg text-paper">
          {artists.map((artist, index) => (
            <Fragment key={artist.artistId}>
              <Link href={artistHref(artist.name, artist.artistId)} className="text-amber hover:text-amber-hover hover:underline">
                {artist.name}
              </Link>
              {index < artists.length - 1 ? (artist.joinPhrase ?? ", ") : null}
            </Fragment>
          ))}
        </p>
      )}
    </div>
  );
}

interface SongFactsProps {
  durationSec: number | null;
  songwriters: TrackCreditPerson[];
  firstAppearance: ContainingAlbum | null;
  /** Para decir el tipo de la primera aparición cuando no es el disco principal. */
  principalDiscId: string | null;
  versionLine: VersionLine | null;
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="contents">
      <dt className="font-data text-xs text-paper-muted">{label}</dt>
      <dd className="font-body text-sm text-paper">{children}</dd>
    </div>
  );
}

/** Ficha técnica: solo las filas con datos. */
export function SongFacts({ durationSec, songwriters, firstAppearance, principalDiscId, versionLine }: SongFactsProps) {
  const t = useTranslations("catalog.song");
  const year = firstAppearance ? discYear(firstAppearance) : null;
  // "Manchild (single/EP)": sin el tipo, una primera aparición homónima parece la propia canción.
  const discType =
    firstAppearance && firstAppearance.releaseGroupId !== principalDiscId && t.has(`discTypes.${firstAppearance.category}`)
      ? t(`discTypes.${firstAppearance.category}`)
      : null;
  const originalLink = (chunks: ReactNode) =>
    versionLine ? (
      <Link href={songHref(versionLine.original.artistName, versionLine.original.title, versionLine.original.recordingId)} className="text-amber hover:underline">
        {chunks}
      </Link>
    ) : null;

  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-4 gap-y-1.5">
      {durationSec !== null && <Fact label={t("duration")}>{formatDuration(durationSec)}</Fact>}
      {songwriters.length > 0 && (
        <Fact label={t("writtenBy")}>
          <SongwriterNames songwriters={songwriters} showRoles={false} />
        </Fact>
      )}
      {firstAppearance && (
        <Fact label={t("firstAppearance")}>
          <Link href={albumHref(null, firstAppearance.title, firstAppearance.releaseGroupId)} className="text-amber hover:underline">
            {firstAppearance.title}
          </Link>
          {discType && <span className="text-paper-muted"> ({discType})</span>}
          {year !== null && <span className="text-paper-muted"> · {year}</span>}
        </Fact>
      )}
      {versionLine && (
        <Fact label={t("version")}>
          {versionLine.kind === "cover" && versionLine.original.artistName
            ? t.rich("versionOfCover", {
                title: versionLine.original.title,
                artist: versionLine.original.artistName,
                link: originalLink,
              })
            : t.rich(versionLine.kind === "cover" ? "versionOfCoverNoArtist" : "versionOfLive", {
                title: versionLine.original.title,
                link: originalLink,
              })}
        </Fact>
      )}
    </dl>
  );
}

interface SongCommunityProps {
  stats: SongCommunityStats;
  listsHref: string;
}

export function SongCommunity({ stats, listsHref }: SongCommunityProps) {
  const t = useTranslations("catalog.song.community");
  const tAlbum = useTranslations("catalog.album.community");
  const tReaction = useTranslations("diary.reaction");
  const locale = useLocale();
  const number = (value: number) => new Intl.NumberFormat(locale).format(value);
  const { ratings, reactions, favorites } = stats;
  const favoritesText =
    favorites.kind === "fewer" ? tAlbum("fewerLower", { threshold: favorites.threshold }) : number(favorites.value);

  const noFavorites = favorites.kind === "exact" && favorites.value === 0;
  // Sin media, reacción predominante ni favoritas, las tarjetas estarían vacías: una línea.
  const sparse = ratings.averageStars === null && reactions.top === null && noFavorites;
  const counts = [
    ratings.count > 0 ? t("ratingsCount", { count: ratings.count }) : null,
    reactions.count > 0 ? t("reactionsCount", { count: reactions.count }) : null,
  ].filter(Boolean);

  const summary = [
    ratings.averageStars !== null ? tAlbum("averageValue", { stars: formatStars(ratings.averageStars, locale) }) : null,
    t("ratingsCount", { count: ratings.count }),
    reactions.top ? tReaction(reactions.top) : null,
    noFavorites ? null : t("favoritesSummary", { value: favoritesText }),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section aria-label={tAlbum("heading")} className="flex flex-col gap-3">
      {sparse ? (
        <p className="font-data text-xs text-paper-muted">
          {[counts.length > 0 ? t("sparse") : t("none"), ...counts].join(" · ")}
        </p>
      ) : (
        <>
          <p className="font-data text-sm text-paper sm:hidden">{summary}</p>
          <div className="hidden grid-cols-3 gap-2 sm:grid">
            <StatTile
              label={tAlbum("average")}
              value={
                ratings.averageStars !== null ? tAlbum("averageValue", { stars: formatStars(ratings.averageStars, locale) }) : "—"
              }
              detail={t("ratingsCount", { count: ratings.count })}
            />
            <StatTile
              label={t("reaction")}
              value={reactions.top ? tReaction(reactions.top) : "—"}
              detail={t("reactionsCount", { count: reactions.count })}
            />
            <StatTile label={t("favorites")} value={noFavorites ? "—" : <ThresholdedTileValue count={favorites} />} />
          </div>
        </>
      )}
      {stats.listCount > 0 && (
        <Link href={listsHref} className="self-start font-data text-xs text-amber hover:underline">
          {tAlbum("appearsInLists", { count: stats.listCount })} →
        </Link>
      )}
    </section>
  );
}
