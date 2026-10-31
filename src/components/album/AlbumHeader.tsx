import { Fragment } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { albumHref, artistHref } from "@/lib/catalog-links";
import type { AlbumArtistCredit } from "@/services/catalog/album-detail";
import {
  STAR_VALUES,
  type AlbumCommunityStats,
  type ThresholdedCount,
} from "@/services/catalog/album-community-shared";
import { formatDuration, formatReleaseDate, formatStars, isUpcomingRelease, summarizeDurations } from "./album-format";
import { SECONDARY_LINK } from "@/components/ui/segmented";

// Cabecera de la página de álbum (openspec: redesign-album-page): identidad, ficha técnica
// y bloque de comunidad. Componentes sin estado: se renderizan en el servidor y se testean
// con el proveedor de next-intl.

type WorkCategory = "studio" | "compilation" | "live_other" | "single_ep";

interface AlbumIdentityProps {
  title: string;
  category: WorkCategory;
  artists: AlbumArtistCredit[];
}

export function AlbumIdentity({ title, category, artists }: AlbumIdentityProps) {
  const t = useTranslations("catalog.album");
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <p className="font-data text-xs uppercase tracking-wider text-paper-muted">
        {t(`workType.${category}`)}
      </p>
      <h1 className="font-display text-2xl leading-tight text-paper [overflow-wrap:anywhere] sm:text-4xl">
        {title}
      </h1>
      {artists.length > 0 && (
        <p className="font-body text-base text-paper sm:text-lg">
          {artists.map((artist, index) => (
            <Fragment key={artist.id}>
              <Link href={artistHref(artist.name, artist.id)} className="text-amber hover:text-amber-hover hover:underline">
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

interface AlbumFactsProps {
  releaseGroupId: string;
  firstReleaseDate: string | null;
  firstReleaseYear: number | null;
  tracks: { durationSec: number | null }[];
  editionLabel: string;
  /** Pestaña Ediciones visible: la fila Edición enlaza a ella. */
  editionsAvailable: boolean;
  /** Sello de la edición representativa, cuando el catálogo lo conoce. */
  label?: string | null;
}

/** Etiqueta legible de `release.edition_label` (`standard`, `original` o la desambiguación de MusicBrainz). */
function useEditionName(editionLabel: string): string {
  const t = useTranslations("catalog.album.facts");
  if (editionLabel === "standard") return t("editionStandard");
  if (editionLabel === "original") return t("editionOriginal");
  return editionLabel;
}

function FactRows({
  releaseGroupId,
  firstReleaseDate,
  firstReleaseYear,
  tracks,
  editionLabel,
  editionsAvailable,
  label,
}: AlbumFactsProps) {
  const t = useTranslations("catalog.album.facts");
  const locale = useLocale();
  const release = formatReleaseDate(firstReleaseDate, firstReleaseYear, locale);
  const durations = summarizeDurations(tracks);
  const total = formatDuration(durations.totalSeconds);
  const editionName = useEditionName(editionLabel);

  return (
    <>
      {release && (
        <div className="contents">
          <dt className="font-data text-xs text-paper-muted">{t("release")}</dt>
          <dd className="font-body text-sm text-paper">
            {isUpcomingRelease(firstReleaseDate) ? (
              t.rich("releaseUpcoming", {
                date: () => <time dateTime={firstReleaseDate ?? undefined}>{release}</time>,
              })
            ) : (
              <time dateTime={firstReleaseDate ?? String(firstReleaseYear)}>{release}</time>
            )}
          </dd>
        </div>
      )}
      {durations.trackCount > 0 && (
        <div className="contents">
          <dt className="font-data text-xs text-paper-muted">{t("duration")}</dt>
          <dd className="font-body text-sm text-paper">
            {t("durationValue", {
              tracks: durations.trackCount,
              total: durations.partial ? t("durationPartial", { total }) : total,
            })}
            {durations.partial && <span className="sr-only"> ({t("durationPartialHint")})</span>}
          </dd>
        </div>
      )}
      <div className="contents">
        <dt className="font-data text-xs text-paper-muted">{t("edition")}</dt>
        <dd className="font-body text-sm text-paper">
          {editionName}
          {editionsAvailable && (
            <>
              {" · "}
              <Link href={`${albumHref(null, "", releaseGroupId)}/editions`} className={SECONDARY_LINK}>
                {t("seeEditions")}
              </Link>
            </>
          )}
        </dd>
      </div>
      {label && (
        <div className="contents">
          <dt className="font-data text-xs text-paper-muted">{t("label")}</dt>
          <dd className="font-body text-sm text-paper">{label}</dd>
        </div>
      )}
    </>
  );
}

const factsGrid = "grid grid-cols-[max-content_minmax(0,1fr)] items-baseline gap-x-4 gap-y-1.5";

/**
 * Ficha técnica: abierta en cualquier ancho, como la del artista (openspec: refine-album-page-phase2, D4); cuatro
 * filas cortas no justifican plegarse en móvil. Solo se renderizan las filas con dato.
 */
export function AlbumFacts(props: AlbumFactsProps) {
  const t = useTranslations("catalog.album.facts");
  return (
    <dl aria-label={t("heading")} className={factsGrid}>
      <FactRows {...props} />
    </dl>
  );
}

function useThresholdedValue() {
  const t = useTranslations("catalog.album.community");
  const locale = useLocale();
  return (count: ThresholdedCount, lower = false) =>
    count.kind === "fewer"
      ? t(lower ? "fewerLower" : "fewer", { threshold: count.threshold })
      : new Intl.NumberFormat(locale).format(count.value);
}

/**
 * Valor principal de una tarjeta para un conteo con umbral: "<5" compacto a la vista, con
 * el texto completo ("menos de 5") para lectores de pantalla y al pasar el puntero.
 */
export function ThresholdedTileValue({ count }: { count: ThresholdedCount }) {
  const t = useTranslations("catalog.album.community");
  const locale = useLocale();
  if (count.kind !== "fewer") return <>{new Intl.NumberFormat(locale).format(count.value)}</>;
  return (
    <span title={t("fewer", { threshold: count.threshold })}>
      <span aria-hidden="true">{t("fewerShort", { threshold: count.threshold })}</span>
      <span className="sr-only">{t("fewer", { threshold: count.threshold })}</span>
    </span>
  );
}

export function StatTile({ label, value, detail }: { label: string; value: React.ReactNode; detail?: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded border border-ink-border bg-ink-surface px-3 py-2">
      <span className="font-data text-xs text-paper-muted">{label}</span>
      <span className="font-display text-lg text-paper">{value}</span>
      {detail && <span className="font-data text-xs text-paper-muted">{detail}</span>}
    </div>
  );
}

function RatingHistogram({ histogram }: { histogram: number[] }) {
  const t = useTranslations("catalog.album.community");
  const locale = useLocale();
  const max = Math.max(...histogram, 1);
  const summary = STAR_VALUES.map((stars, index) =>
    t("histogramItem", { stars: formatStars(stars, locale), count: histogram[index] ?? 0 }),
  ).join(", ");

  return (
    <figure className="flex flex-col gap-1">
      <div role="img" aria-label={`${t("histogramLabel")}: ${summary}`} className="flex h-10 items-end gap-0.5">
        {histogram.map((count, index) => (
          <span
            key={STAR_VALUES[index]}
            className="flex-1 rounded-t-sm bg-amber/70"
            style={{ height: `${Math.max((count / max) * 100, count > 0 ? 6 : 2)}%` }}
          />
        ))}
      </div>
      <figcaption className="flex justify-between font-data text-xs text-paper-muted" aria-hidden="true">
        <span>{t("histogramMin")}</span>
        <span>{t("histogramMax")}</span>
      </figcaption>
    </figure>
  );
}

interface CommunityStatsProps {
  stats: AlbumCommunityStats;
  listsHref: string;
}

/** Celda de la franja de comunidad: la cifra arriba y la etiqueta debajo, como en el artista (`ArtistCommunity`). */
function Stat({ label, value, detail }: { label: string; value: React.ReactNode; detail?: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 px-3 py-2.5 sm:px-4">
      {/* La cifra va primero a la vista; en el DOM el `dt` sigue antes del `dd`, como pide `<dl>`. */}
      <dt className="order-2 font-data text-xs text-paper-muted">{label}</dt>
      <dd className="order-1 font-display text-xl leading-tight text-paper tabular-nums">{value}</dd>
      {detail ? <dd className="order-3 font-data text-xs text-paper-muted">{detail}</dd> : null}
    </div>
  );
}

const STRIP_COLUMNS = { 2: "grid-cols-2", 3: "grid-cols-3" } as const;

/**
 * Bloque de comunidad (openspec: refine-album-page-phase2, D1): una franja dividida como la del artista, en cualquier
 * ancho. La Media solo existe con media (umbral de 5) y los detalles en cero se omiten: con poca actividad, tres
 * tarjetas de "—", "Sin reseñas" y "0 lo buscan" eran ruido.
 */
export function CommunityStats({ stats, listsHref }: CommunityStatsProps) {
  const t = useTranslations("catalog.album.community");
  const locale = useLocale();
  const thresholded = useThresholdedValue();
  const number = (value: number) => new Intl.NumberFormat(locale).format(value);
  const { ratings } = stats;
  const hasAverage = ratings.averageStars !== null;
  const hasSeekers = !(stats.seekers.kind === "exact" && stats.seekers.value === 0);

  return (
    <section aria-label={t("heading")} className="flex flex-col gap-3">
      <dl
        className={`grid ${STRIP_COLUMNS[hasAverage ? 3 : 2]} divide-x divide-ink-border rounded border border-ink-border bg-ink-surface`}
      >
        {hasAverage && (
          <Stat label={t("average")} value={t("averageValue", { stars: formatStars(ratings.averageStars ?? 0, locale) })} />
        )}
        <Stat
          label={t("ratings")}
          value={number(ratings.count)}
          detail={stats.reviewCount > 0 ? t("reviewCount", { count: stats.reviewCount }) : undefined}
        />
        <Stat
          label={t("collectors")}
          value={<ThresholdedTileValue count={stats.collectors} />}
          detail={hasSeekers ? t("seekers", { value: thresholded(stats.seekers, true) }) : undefined}
        />
      </dl>
      {stats.listCount > 0 && (
        <Link href={listsHref} className={`self-start font-data text-xs ${SECONDARY_LINK}`}>
          {t("appearsInLists", { count: stats.listCount })} →
        </Link>
      )}
      {ratings.histogram && (
        <div className="hidden sm:block">
          <RatingHistogram histogram={ratings.histogram} />
        </div>
      )}
    </section>
  );
}
