import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { artistHref } from "@/lib/catalog-links";
import type { ConcertEntryDto } from "@/lib/api/schemas";
import { formatConcertDate, formatConcertPlace, groupConcertsByYear } from "./concert-format";

// Conciertos agrupados por año (openspec: add-my-concerts): la usan Mis conciertos (con acciones por fila) y la página
// de un perfil (solo lectura). Cada fila: artista, fecha con su precisión, lugar, gira, nota y el enlace al setlist.

interface ConcertYearListProps {
  entries: readonly ConcertEntryDto[];
  /** Acciones de la fila (solo en la página del dueño). */
  renderActions?: (entry: ConcertEntryDto) => ReactNode;
  /** Muestra la audiencia de cada registro que no es público (solo para el dueño). */
  showAudience?: boolean;
}

export function ConcertYearList({ entries, renderActions, showAudience = false }: ConcertYearListProps) {
  const t = useTranslations("concerts");
  const locale = useLocale();

  return (
    <div className="flex flex-col gap-8">
      {groupConcertsByYear(entries).map((group) => (
        <section key={group.year} aria-labelledby={`concerts-${group.year}`} className="flex flex-col gap-2">
          <h2 id={`concerts-${group.year}`} className="flex items-baseline gap-3 border-b border-ink-border pb-1">
            <span className="font-display text-xl text-paper">{t("yearHeading", { year: group.year })}</span>
            <span className="font-data text-xs text-paper-muted">{t("yearCount", { count: group.entries.length })}</span>
          </h2>
          <ul className="flex flex-col divide-y divide-ink-border">
            {group.entries.map((entry) => {
              const place = formatConcertPlace(entry, locale);
              return (
                <li key={entry.id} className="flex items-start gap-4 py-3">
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                      <Link
                        href={artistHref(entry.artist.name, entry.artist.id)}
                        className="font-display text-base text-paper hover:underline"
                      >
                        {entry.artist.name}
                      </Link>
                      <span className="font-data text-xs text-paper-muted">{formatConcertDate(entry.eventDate, locale)}</span>
                      {showAudience && entry.audience !== "public" && (
                        <span className="font-data text-xs text-paper-muted">· {t(`audience.${entry.audience}`)}</span>
                      )}
                    </div>
                    {place && <p className="font-body text-sm text-paper">{place}</p>}
                    {entry.tour && <p className="font-body text-sm text-paper-muted">{entry.tour}</p>}
                    {entry.note && <p className="font-body text-sm italic text-paper-muted">{entry.note}</p>}
                    {entry.concertId && (
                      // Concierto compartido enlazado (openspec: add-shared-concerts-phase1); el id pelado redirige al slug.
                      <Link href={`/concert/${entry.concertId}`} className="self-start font-data text-xs text-paper-muted hover:text-paper">
                        {t("shared.linked")} →
                      </Link>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {entry.setlistfmUrl && (
                      <a
                        href={entry.setlistfmUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded border border-ink-border px-2.5 py-1 font-data text-xs uppercase tracking-wide text-paper-muted transition-colors hover:border-amber hover:text-paper"
                      >
                        {t("row.setlist")}
                        <span aria-hidden> ↗</span>
                      </a>
                    )}
                    {renderActions?.(entry)}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
