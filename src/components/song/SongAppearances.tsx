import { useFormatter, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { albumHref } from "@/lib/catalog-links";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { LazyCoverImage } from "@/components/catalog/LazyCoverImage";
import { DiscographyScroller } from "@/components/album/DiscographyScroller";
import type { ContainingAlbum, GroupedAppearances } from "@/services/catalog/recording-detail";
import { discDateValue, parseDiscDate } from "./disc-date";

// "Esta grabación aparece en" (openspec: redesign-song-page, `song-versions`; desde modernize-song-page-phase3 como franja): los
// discos que contienen esta misma grabación, en una franja desplazable de carátulas —la de la discografía del álbum—, por tipo
// de disco y fecha, con la marca "Primer lanzamiento" en el más temprano y un resumen por tipo junto al título. Sin "+N": se
// ven todos. Componente de servidor; el desplazador es de cliente.

const HEADING = "font-display text-2xl font-bold tracking-tight text-paper";

function DiscCard({ disc, year, isOriginal, category }: { disc: ContainingAlbum; year: number | null; isOriginal: boolean; category: string }) {
  const t = useTranslations("catalog.song.appearances");
  const format = useFormatter();
  const parts = parseDiscDate(disc.firstReleaseDate);
  // Mes y año si la fecha los tiene; si no, el año canónico.
  const when =
    parts?.month != null
      ? format.dateTime(discDateValue(parts), { month: "short", year: "numeric", timeZone: "UTC" })
      : (year ?? t("unknownYear"));
  const fullDate =
    parts?.day != null
      ? format.dateTime(discDateValue(parts), { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
      : null;
  const cover = disc.coverThumbUrl ? (
    <CoverThumb cover={disc.coverThumbUrl} label="" className="size-full" />
  ) : (
    <LazyCoverImage releaseGroupId={disc.releaseGroupId} coverLabel="" className="size-full" />
  );
  return (
    <li className="shrink-0">
      <Link href={albumHref(null, disc.title, disc.releaseGroupId)} className="group flex w-28 flex-col gap-1 sm:w-32">
        <span className="relative block aspect-square w-full overflow-hidden rounded-md bg-ink-surface">{cover}</span>
        {/* Dos líneas reservadas siempre, para que las fechas queden alineadas. */}
        <span className="mt-1 line-clamp-2 min-h-[2lh] font-display text-sm font-semibold leading-snug text-paper group-hover:text-amber">
          {disc.title}
        </span>
        <span className="font-data text-xs text-paper-muted">{when}</span>
        {category !== "studio" && <span className="font-data text-xs text-paper-muted">{t(`types.${category}`)}</span>}
        {isOriginal && (
          <span title={fullDate ? t("originalOn", { date: fullDate }) : undefined} className="self-start whitespace-nowrap rounded border border-ink-border px-0.5 py-0.5 font-body text-[11px] text-paper sm:px-1.5 sm:text-xs">
            {t("original")}
          </span>
        )}
      </Link>
    </li>
  );
}

interface SongAppearancesProps {
  grouped: GroupedAppearances;
  /** Año a mostrar por disco cuando la fecha no tiene mes (lo calcula el servidor). */
  years: Record<string, number | null>;
}

export function SongAppearances({ grouped, years }: SongAppearancesProps) {
  const t = useTranslations("catalog.song.appearances");
  if (grouped.groups.length === 0) return null;
  const summary = grouped.groups.map((group) => t(`counts.${group.category}`, { count: group.discs.length })).join(" · ");

  return (
    <section aria-labelledby="song-appearances" className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col items-start gap-x-6 gap-y-1 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between">
        <h2 id="song-appearances" className={HEADING}>
          {t("heading")}
        </h2>
        <p className="font-data text-xs text-paper-muted">{summary}</p>
      </div>
      <DiscographyScroller>
        {grouped.groups.flatMap((group) =>
          group.discs.map((disc) => (
            <DiscCard
              key={disc.releaseGroupId}
              disc={disc}
              year={years[disc.releaseGroupId] ?? null}
              isOriginal={disc.releaseGroupId === grouped.originalReleaseGroupId}
              category={group.category}
            />
          )),
        )}
      </DiscographyScroller>
    </section>
  );
}
