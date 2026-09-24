import { Fragment } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { AlbumArtistCredit } from "@/services/catalog/album-detail";
import {
  STAR_VALUES,
  type AlbumCommunityStats,
  type ThresholdedCount,
} from "@/services/catalog/album-community-shared";
import { formatDuration, formatReleaseDate, formatStars, summarizeDurations } from "./album-format";

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
      <h1 className="font-display text-3xl leading-tight text-paper [overflow-wrap:anywhere] sm:text-4xl">
        {title}
      </h1>
      {artists.length > 0 && (
        <p className="font-body text-lg text-paper">
          {artists.map((artist, index) => (
            <Fragment key={artist.id}>
              <Link href={`/artist/${artist.id}`} className="text-amber hover:text-amber-hover hover:underline">
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
            <time dateTime={firstReleaseDate ?? String(firstReleaseYear)}>{release}</time>
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
              <Link href={`/album/${releaseGroupId}/editions`} className="text-amber hover:underline">
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
 * Ficha técnica: siempre visible desde `sm`; en móvil, colapsable con `<details>` (sin
 * JavaScript). Solo se renderizan las filas con dato.
 */
export function AlbumFacts(props: AlbumFactsProps) {
  const t = useTranslations("catalog.album.facts");
  return (
    <>
      <dl aria-label={t("heading")} className={`hidden sm:grid ${factsGrid}`}>
        <FactRows {...props} />
      </dl>
      <details className="sm:hidden">
        <summary className="cursor-pointer font-data text-xs uppercase tracking-wider text-paper-muted">
          {t("heading")}
        </summary>
        <dl className={`mt-2 ${factsGrid}`}>
          <FactRows {...props} />
        </dl>
      </details>
    </>
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

function StatTile({ label, value, detail }: { label: string; value: string; detail?: React.ReactNode }) {
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

export function CommunityStats({ stats, listsHref }: CommunityStatsProps) {
  const t = useTranslations("catalog.album.community");
  const locale = useLocale();
  const thresholded = useThresholdedValue();
  const number = (value: number) => new Intl.NumberFormat(locale).format(value);
  const { ratings } = stats;

  const summary = [
    ratings.averageStars !== null ? t("averageValue", { stars: formatStars(ratings.averageStars, locale) }) : null,
    t("summaryRatings", { count: ratings.count }),
    stats.collectors.kind === "exact" && stats.collectors.value === 0
      ? null
      : t("summaryCollectors", { value: thresholded(stats.collectors, true) }),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section aria-label={t("heading")} className="flex flex-col gap-3">
      <p className="font-data text-sm text-paper sm:hidden">{summary}</p>
      <div className="hidden grid-cols-2 gap-2 sm:grid xl:grid-cols-4">
        <StatTile
          label={t("average")}
          value={ratings.averageStars !== null ? t("averageValue", { stars: formatStars(ratings.averageStars, locale) }) : "—"}
          detail={
            ratings.averageStars === null
              ? t("fewRatings")
              : ratings.averageDetailedScore !== null
                ? t("detailedValue", { score: Math.round(ratings.averageDetailedScore) })
                : undefined
          }
        />
        <StatTile
          label={t("ratings")}
          value={number(ratings.count)}
          detail={t("reviewCount", { count: stats.reviewCount })}
        />
        <StatTile
          label={t("collectors")}
          value={thresholded(stats.collectors)}
          detail={t("seekers", { value: thresholded(stats.seekers, true) })}
        />
        <StatTile
          label={t("lists")}
          value={number(stats.listCount)}
          detail={
            stats.listCount > 0 ? (
              <Link href={listsHref} className="text-amber hover:underline">
                {t("seeLists")}
              </Link>
            ) : undefined
          }
        />
      </div>
      {ratings.histogram && (
        <div className="hidden sm:block">
          <RatingHistogram histogram={ratings.histogram} />
        </div>
      )}
    </section>
  );
}
