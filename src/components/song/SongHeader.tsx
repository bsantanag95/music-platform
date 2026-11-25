import { Fragment, type ReactNode } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SECONDARY_LINK } from "@/components/ui/segmented";
import { albumHref, artistHref, songHref } from "@/lib/catalog-links";
import { ThresholdedTileValue } from "@/components/album/AlbumHeader";
import { CommunityStrip, type CommunityCell } from "@/components/catalog/CommunityStrip";
import { formatDuration, formatStars } from "@/components/album/album-format";
import { SongwriterNames } from "@/components/catalog/SongwriterNames";
import { discYear, type ContainingAlbum } from "@/services/catalog/recording-detail";
import { discDateValue, parseDiscDate } from "./disc-date";
import type { TrackCreditPerson } from "@/services/catalog/personnel-levels";
import type { VersionLine } from "@/services/catalog/recording-versions";
import type { SongCommunityStats } from "@/services/catalog/song-community";

// Cabecera de la página de canción (openspec: redesign-song-page, `song-page-layout` y
// `song-community-stats`): identidad, ficha técnica y bloque de comunidad. Sin estado: se
// renderizan en el servidor. Desde modernize-song-page-phase1 van dentro de una tarjeta (`SongCard`): ficha en dos
// columnas con disco, pista, género, producción y versiones, e invitación «Valorar esta canción» para el visitante.

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
      <h1 className="font-display text-[clamp(1.875rem,3.4vw,2.75rem)] font-bold leading-none tracking-tight text-paper [overflow-wrap:anywhere]">
        {title}
      </h1>
      {artists.length > 0 && (
        <p className="mt-1 font-display text-lg text-paper">
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
  /** Disco principal: fila Disco. */
  disc: ContainingAlbum | null;
  /** Posición en la lista de la edición representativa ("8 de 8"); `null` sin tira. */
  position: { index: number; total: number } | null;
  /** Géneros ya dibujados (`GenreChips`); `null` sin géneros. */
  genres: ReactNode;
  /** Productores de la grabación (hasta `PRODUCERS_MAX` se muestran). */
  producers: TrackCreditPerson[];
  /** Cantidad de otras versiones de la canción; 0 sin versiones. */
  versionsCount: number;
  /** Ancla de la sección de versiones. */
  versionsHref: string;
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

/** Productores que nombra la ficha; el resto está en los créditos. */
export const PRODUCERS_MAX = 2;

/** Ficha técnica en dos columnas (una en el teléfono): solo las filas con datos. */
export function SongFacts({
  durationSec,
  disc,
  position,
  genres,
  producers,
  versionsCount,
  versionsHref,
  songwriters,
  firstAppearance,
  principalDiscId,
  versionLine,
}: SongFactsProps) {
  const t = useTranslations("catalog.song");
  const format = useFormatter();
  const year = firstAppearance ? discYear(firstAppearance) : null;
  // La primera aparición en el disco principal ya la nombra la fila Disco: basta su fecha.
  const firstIsPrincipal = firstAppearance !== null && firstAppearance.releaseGroupId === principalDiscId;
  const parts = firstAppearance ? parseDiscDate(firstAppearance.firstReleaseDate) : null;
  const firstDate =
    parts?.month != null
      ? format.dateTime(discDateValue(parts), {
          ...(parts.day != null ? { day: "numeric" as const } : {}),
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        })
      : year;
  // "Manchild (single/EP)": sin el tipo, una primera aparición homónima parece la propia canción.
  const discType =
    firstAppearance && firstAppearance.releaseGroupId !== principalDiscId && t.has(`discTypes.${firstAppearance.category}`)
      ? t(`discTypes.${firstAppearance.category}`)
      : null;
  const originalLink = (chunks: ReactNode) =>
    versionLine ? (
      <Link href={songHref(versionLine.original.artistName, versionLine.original.title, versionLine.original.recordingId)} className={SECONDARY_LINK}>
        {chunks}
      </Link>
    ) : null;

  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-4 gap-y-0.5 md:grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-y-1.5 lg:grid-cols-[auto_minmax(0,1fr)] xl:grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1fr)]">
      {durationSec !== null && <Fact label={t("duration")}>{formatDuration(durationSec)}</Fact>}
      {disc && (
        <Fact label={t("disc")}>
          <Link href={albumHref(null, disc.title, disc.releaseGroupId)} className={SECONDARY_LINK}>
            {disc.title}
          </Link>
        </Fact>
      )}
      {songwriters.length > 0 && (
        <Fact label={t("writtenBy")}>
          <SongwriterNames songwriters={songwriters} showRoles={false} />
        </Fact>
      )}
      {position && <Fact label={t("track")}>{t("strip.position", { index: position.index, total: position.total })}</Fact>}
      {genres && <Fact label={t("genre")}>{genres}</Fact>}
      {firstAppearance && firstIsPrincipal && firstDate !== null && <Fact label={t("firstAppearance")}>{firstDate}</Fact>}
      {firstAppearance && !firstIsPrincipal && (
        <Fact label={t("firstAppearance")}>
          <Link href={albumHref(null, firstAppearance.title, firstAppearance.releaseGroupId)} className={SECONDARY_LINK}>
            {firstAppearance.title}
          </Link>
          {discType && <span className="text-paper-muted"> ({discType})</span>}
          {year !== null && <span className="text-paper-muted"> · {year}</span>}
        </Fact>
      )}
      {producers.length > 0 && (
        <Fact label={t("production")}>
          {producers.slice(0, PRODUCERS_MAX).map((person, index) => (
            <Fragment key={person.artistId}>
              {index > 0 && ", "}
              <Link href={artistHref(person.name, person.artistId)} className={SECONDARY_LINK}>
                {person.creditedAs ?? person.name}
              </Link>
            </Fragment>
          ))}
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
      {versionsCount > 0 && (
        <Fact label={t("versionsLabel")}>
          <a href={versionsHref} className={SECONDARY_LINK}>
            {t("versionsCount", { count: versionsCount })} →
          </a>
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

  const noFavorites = favorites.kind === "exact" && favorites.value === 0;
  // Sin ninguna actividad ni listas, el bloque no se dibuja (openspec: modernize-song-page-phase1).
  if (ratings.count === 0 && reactions.count === 0 && noFavorites && stats.listCount === 0) return null;
  // Sin media, reacción predominante ni favoritas, las tarjetas estarían vacías: una línea.
  const sparse = ratings.averageStars === null && reactions.top === null && noFavorites;
  const counts = [
    ratings.count > 0 ? t("ratingsCount", { count: ratings.count }) : null,
    reactions.count > 0 ? t("reactionsCount", { count: reactions.count }) : null,
  ].filter(Boolean);

  // Franja compartida con el álbum (openspec: refine-song-page-phase2, D2): Valoraciones siempre, el resto solo con dato.
  const cells: CommunityCell[] = [
    ...(ratings.averageStars !== null
      ? [{ key: "average", label: tAlbum("average"), value: tAlbum("averageValue", { stars: formatStars(ratings.averageStars, locale) }) }]
      : []),
    { key: "ratings", label: tAlbum("ratings"), value: number(ratings.count) },
    ...(reactions.top
      ? [{ key: "reaction", label: t("reaction"), value: tReaction(reactions.top), detail: t("reactionsCount", { count: reactions.count }) }]
      : []),
    ...(noFavorites ? [] : [{ key: "favorites", label: t("favoritesLabel"), value: <ThresholdedTileValue count={favorites} /> }]),
  ];

  return (
    <section aria-label={tAlbum("heading")} className="flex flex-col gap-3">
      {sparse ? (
        <p className="font-data text-xs text-paper-muted">
          {[t("sparse"), ...counts].join(" · ")}
        </p>
      ) : (
        <CommunityStrip cells={cells} />
      )}
      {stats.listCount > 0 && (
        <Link href={listsHref} className={`self-start font-data text-xs ${SECONDARY_LINK}`}>
          {tAlbum("appearsInLists", { count: stats.listCount })} →
        </Link>
      )}
    </section>
  );
}

/** Acción principal del visitante: valorar lleva al inicio de sesión, en lugar del panel (como `AlbumRateInvite`). */
export function SongRateInvite() {
  const t = useTranslations("catalog.song");
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4 lg:flex-col lg:items-stretch lg:gap-2">
      <Link
        href="/auth/login"
        className="inline-flex h-11 items-center justify-center rounded-lg bg-amber px-5 font-display text-[0.9375rem] font-medium text-ink hover:bg-amber-hover"
      >
        {t("rateInvite")}
      </Link>
      <p className="hidden max-w-[44ch] font-body text-sm text-paper-muted sm:block">{t("rateInviteNote")}</p>
    </div>
  );
}
