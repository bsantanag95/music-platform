import { useLocale, useTranslations } from "next-intl";
import type { ConcertEntryDto, ConcertTotals } from "@/lib/api/schemas";
import {
  earliestConcertDate,
  formatConcertDate,
  mostSeenArtist,
} from "./concert-format";

// Resumen de Mis conciertos (openspec: redesign-my-concerts): las cifras primero y la etiqueta debajo (conciertos,
// artistas, ciudades y países, sin las que están en cero) y una línea con desde cuándo y el artista más visto.

export function ConcertsSummary({
  totals,
  entries,
  complete,
}: {
  totals: ConcertTotals;
  entries: readonly ConcertEntryDto[];
  /** Están todos los registros (no hay filtro ni tope): solo entonces "desde" y "el más visto" son ciertos. */
  complete: boolean;
}) {
  const t = useTranslations("concerts");
  const locale = useLocale();
  const stats = (
    [
      ["concerts", totals.concerts],
      ["artists", totals.artists],
      ["cities", totals.cities],
      ["countries", totals.countries],
    ] as const
  ).filter(([, value]) => value > 0);
  const earliest = complete ? earliestConcertDate(entries) : null;
  const top = complete ? mostSeenArtist(entries) : null;

  return (
    <section aria-label={t("summary.label")} className="flex flex-col gap-2">
      <dl className="grid grid-cols-2 overflow-hidden rounded-lg border border-ink-border bg-ink-surface sm:grid-cols-4">
        {stats.map(([key, value]) => (
          <div
            key={key}
            className="flex flex-col gap-0.5 border-ink-border px-4 py-3 [&:nth-child(n+3)]:border-t sm:[&:nth-child(n+2)]:border-l sm:[&:nth-child(n+3)]:border-t-0 [&:nth-child(even)]:border-l"
          >
            <dt className="order-2 font-data text-xs text-paper-muted">
              {t(`summary.${key}`, { count: value })}
            </dt>
            <dd className="order-1 font-display text-2xl leading-tight tabular-nums text-paper">
              {value}
            </dd>
          </div>
        ))}
      </dl>
      {(earliest || top) && (
        <p className="font-data text-xs text-paper-muted">
          {[
            earliest
              ? t("summary.since", {
                  date: formatConcertDate(earliest, locale),
                })
              : null,
            top
              ? t("summary.mostSeen", {
                  artist: top.artist.name,
                  count: top.count,
                })
              : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}
    </section>
  );
}
