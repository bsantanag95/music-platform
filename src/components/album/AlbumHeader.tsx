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
import { CommunityStrip } from "@/components/catalog/CommunityStrip";

// Cabecera de la página de álbum (openspec: redesign-album-page): identidad, ficha técnica
// y bloque de comunidad. Componentes sin estado: se renderizan en el servidor y se testean
// con el proveedor de next-intl.

type WorkCategory = "studio" | "compilation" | "live_other" | "single_ep";

interface AlbumIdentityProps {
  title: string;
  category: WorkCategory;
  artists: AlbumArtistCredit[];
  /** Año del primer lanzamiento: acompaña al tipo de obra en la línea de contexto (openspec: modernize-album-page-phase1). */
  year?: number | null;
}

export function AlbumIdentity({ title, category, artists, year = null }: AlbumIdentityProps) {
  const t = useTranslations("catalog.album");
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <p className="font-data text-xs uppercase tracking-wider text-paper/70">
        {t(`workType.${category}`)}
        {year !== null ? ` · ${year}` : null}
      </p>
      <h1 className="font-display text-[clamp(2.25rem,5.6vw,5.25rem)] font-bold leading-[0.95] tracking-[-0.04em] text-paper [overflow-wrap:anywhere]">
        {title}
      </h1>
      {artists.length > 0 && (
        <p className="font-display text-lg sm:text-xl">
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
  /** Pestaña Ediciones visible: la edición enlaza a ella con la cantidad. */
  editionsAvailable: boolean;
  /** Cantidad de ediciones conocidas, para «N ediciones →». */
  editionCount?: number;
  /** Sello de la edición representativa, cuando el catálogo lo conoce. */
  label?: string | null;
  /** Productores del disco (nivel producción de los créditos), hasta 2 (openspec: modernize-album-page-phase1). */
  producers?: { id: string; name: string }[];
  /** Fichas de géneros: abren la línea. */
  genres?: React.ReactNode;
}

/** Etiqueta legible de `release.edition_label` (`standard`, `original` o la desambiguación de MusicBrainz). */
function useEditionName(editionLabel: string): string {
  const t = useTranslations("catalog.album.facts");
  if (editionLabel === "standard") return t("editionStandard");
  if (editionLabel === "original") return t("editionOriginal");
  return editionLabel;
}

/**
 * Ficha técnica en una línea (openspec: modernize-album-page-phase1): géneros, lanzamiento, pistas y duración, sello,
 * producción y edición con «N ediciones →». Cada dato conserva su rótulo para lectores de pantalla; solo se dibujan los que
 * tienen dato.
 */
export function AlbumFacts({
  releaseGroupId,
  firstReleaseDate,
  firstReleaseYear,
  tracks,
  editionLabel,
  editionsAvailable,
  editionCount = 0,
  label,
  producers = [],
  genres,
}: AlbumFactsProps) {
  const t = useTranslations("catalog.album.facts");
  const locale = useLocale();
  const release = formatReleaseDate(firstReleaseDate, firstReleaseYear, locale);
  const durations = summarizeDurations(tracks);
  const total = formatDuration(durations.totalSeconds);
  const editionName = useEditionName(editionLabel);
  const rows: { key: string; label: string; value: React.ReactNode }[] = [];

  if (genres) rows.push({ key: "genres", label: t("genres"), value: genres });
  if (release) {
    rows.push({
      key: "release",
      label: t("release"),
      value: isUpcomingRelease(firstReleaseDate) ? (
        t.rich("releaseUpcoming", { date: () => <time dateTime={firstReleaseDate ?? undefined}>{release}</time> })
      ) : (
        <time dateTime={firstReleaseDate ?? String(firstReleaseYear)}>{release}</time>
      ),
    });
  }
  if (durations.trackCount > 0) {
    rows.push({
      key: "duration",
      label: t("duration"),
      value: (
        <>
          {t("durationValue", { tracks: durations.trackCount, total: durations.partial ? t("durationPartial", { total }) : total })}
          {durations.partial && <span className="sr-only"> ({t("durationPartialHint")})</span>}
        </>
      ),
    });
  }
  if (label) rows.push({ key: "label", label: t("label"), value: label });
  if (producers.length > 0) {
    rows.push({
      key: "producers",
      label: t("producers"),
      value: producers.slice(0, 2).map((producer, index) => (
        <Fragment key={producer.id}>
          {index > 0 ? ", " : null}
          <Link href={artistHref(producer.name, producer.id)} className="hover:text-amber hover:underline">
            {producer.name}
          </Link>
        </Fragment>
      )),
    });
  }
  rows.push({
    key: "edition",
    label: t("edition"),
    value: (
      <>
        {t("editionValue", { name: editionName })}
        {editionsAvailable && (
          <>
            {" · "}
            <Link href={`${albumHref(null, "", releaseGroupId)}/editions`} className={`whitespace-nowrap ${SECONDARY_LINK}`}>
              {editionCount > 1 ? t("editionsCount", { count: editionCount }) : t("seeEditions")} →
            </Link>
          </>
        )}
      </>
    ),
  });

  return (
    <dl aria-label={t("heading")} className="flex flex-wrap items-center gap-x-4 gap-y-2 font-data text-[0.8125rem] text-paper/80">
      {rows.map((row) => (
        <div key={row.key} data-fact={row.key} className="min-w-0">
          <dt className="sr-only">{row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Acción principal de la portada para un visitante sin sesión (openspec: modernize-album-page-phase1): en lugar del panel «Tu
 * relación», «Valorar este disco» hacia el inicio de sesión y una frase que explica para qué sirve una cuenta.
 */
export function AlbumRateInvite() {
  const t = useTranslations("catalog.album");
  return (
    <div className="flex flex-col items-start gap-2 lg:items-stretch">
      <Link
        href="/auth/login"
        className="inline-flex h-11 items-center justify-center rounded-lg bg-amber px-5 font-display text-[0.9375rem] font-medium text-ink hover:bg-amber-hover"
      >
        {t("rateInvite")}
      </Link>
      <p className="hidden max-w-[30ch] font-body text-sm text-paper/70 sm:block">{t("rateInviteNote")}</p>
    </div>
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
  // Sin ceros (openspec: modernize-album-page-phase1): cada celda en 0 se omite y, sin nada que contar, el bloque entero.
  const hasRatings = ratings.count > 0;
  const hasCollectors = !(stats.collectors.kind === "exact" && stats.collectors.value === 0);
  if (!hasAverage && !hasRatings && !hasCollectors && stats.listCount === 0 && !ratings.histogram) return null;
  const cells = [
    ...(hasAverage
      ? [{ key: "average", label: t("average"), value: t("averageValue", { stars: formatStars(ratings.averageStars ?? 0, locale) }) }]
      : []),
    ...(hasRatings
      ? [
          {
            key: "ratings",
            label: t("ratings"),
            value: number(ratings.count),
            detail: stats.reviewCount > 0 ? t("reviewCount", { count: stats.reviewCount }) : undefined,
          },
        ]
      : []),
    ...(hasCollectors
      ? [
          {
            key: "collectors",
            label: t("collectors"),
            value: <ThresholdedTileValue count={stats.collectors} />,
            detail: hasSeekers ? t("seekers", { value: thresholded(stats.seekers, true) }) : undefined,
          },
        ]
      : []),
  ];

  return (
    <section aria-label={t("heading")} className="flex flex-col gap-3">
      {cells.length > 0 && <CommunityStrip cells={cells} />}
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
