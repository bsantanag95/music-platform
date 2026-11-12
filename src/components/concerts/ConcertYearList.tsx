import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { artistHref } from "@/lib/catalog-links";
import type { ConcertEntryDto } from "@/lib/api/schemas";
import { formatConcertDate, formatConcertPlace, formatConcertShortDate, groupConcertsByYear } from "./concert-format";
import { CONCERT_BADGE, CONCERT_ROW, CONCERT_ROW_DATE, CONCERT_SECTION_HEADING, ConcertAudienceIcon } from "./concert-ui";

// Conciertos agrupados por año (openspec: add-my-concerts): la usan Mis conciertos (con acciones por fila) y la página
// de un perfil (solo lectura). Misma anatomía de fila que la pestaña del artista (`concert-ui`): la fecha corta en su
// columna (el año ya está en el encabezado), el artista como título, y debajo el lugar, la gira, la nota y los enlaces
// (el concierto compartido y el setlist) en una sola línea de datos.

interface ConcertYearListProps {
  entries: readonly ConcertEntryDto[];
  /** Acciones de la fila (solo en la página del dueño). */
  renderActions?: (entry: ConcertEntryDto) => ReactNode;
  /**
   * Muestra la audiencia de cada registro que no es público (solo para el dueño): Seguidores como un ícono discreto, con el
   * nombre al pasar el cursor, y Privado con su nombre. Repetida en cada fila, la etiqueta "SEGUIDORES" no informaba nada.
   */
  showAudience?: boolean;
  /** Abre la edición de un registro sin lugar (solo para el dueño): la fila ofrece "Agregar lugar". */
  onAddPlace?: (entry: ConcertEntryDto) => void;
}

const META_LINK = "text-paper-muted underline-offset-2 transition-colors hover:text-paper hover:underline";

export function ConcertYearList({ entries, renderActions, showAudience = false, onAddPlace }: ConcertYearListProps) {
  const t = useTranslations("concerts");
  const locale = useLocale();

  return (
    <div className="flex flex-col gap-8">
      {groupConcertsByYear(entries).map((group) => (
        <section key={group.year} aria-labelledby={`concerts-${group.year}`} className="flex flex-col gap-1">
          <h2 id={`concerts-${group.year}`} className={CONCERT_SECTION_HEADING}>
            <span className="font-display text-xl tabular-nums text-paper">{t("yearHeading", { year: group.year })}</span>
            <span className="font-data text-xs text-paper-muted">{t("yearCount", { count: group.entries.length })}</span>
          </h2>
          <ul className="flex flex-col divide-y divide-ink-border/70">
            {group.entries.map((entry) => {
              const place = formatConcertPlace(entry, locale);
              const actions = renderActions?.(entry);
              return (
                <li key={entry.id} className={CONCERT_ROW}>
                  <time dateTime={entry.eventDate} title={formatConcertDate(entry.eventDate, locale)} className={CONCERT_ROW_DATE}>
                    {formatConcertShortDate(entry.eventDate, locale)}
                  </time>
                  <div className={`flex min-w-0 flex-col gap-1 ${actions ? "" : "col-span-2"}`}>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <Link
                        href={artistHref(entry.artist.name, entry.artist.id)}
                        className="font-display text-base leading-snug text-paper underline-offset-4 hover:underline"
                      >
                        {entry.artist.name}
                      </Link>
                      {showAudience && entry.audience === "private" && (
                        <span className={`inline-flex items-center gap-1 ${CONCERT_BADGE}`}>
                          <ConcertAudienceIcon audience="private" />
                          {t("audience.private")}
                        </span>
                      )}
                      {showAudience && entry.audience === "followers" && (
                        <span title={t("audience.followers")} className="inline-flex text-paper-muted/70">
                          <ConcertAudienceIcon audience="followers" />
                          <span className="sr-only">{t("audience.followers")}</span>
                        </span>
                      )}
                    </div>
                    {place ? (
                      <p className="font-body text-sm text-paper">{place}</p>
                    ) : onAddPlace ? (
                      // Sin lugar la fila quedaba en el puro nombre; el dato también hace falta para compartir el concierto.
                      <p className="font-data text-xs text-paper-muted">
                        {t("row.noPlace")} ·{" "}
                        <button type="button" onClick={() => onAddPlace(entry)} className={`${META_LINK} underline`}>
                          {t("row.addPlace")}
                        </button>
                      </p>
                    ) : null}
                    {entry.tour && <p className="font-body text-sm text-paper-muted">{entry.tour}</p>}
                    {entry.note && <p className="max-w-prose text-pretty font-body text-sm italic text-paper-muted">{entry.note}</p>}
                    {(entry.concertId || entry.setlistfmUrl) && (
                      <p className="flex flex-wrap gap-x-4 gap-y-0.5 pt-0.5 font-data text-xs">
                        {entry.concertId && (
                          // Concierto compartido enlazado (openspec: add-shared-concerts-phase1); el id pelado redirige al slug.
                          <Link href={`/concert/${entry.concertId}`} className={META_LINK}>
                            {t("shared.linked")} →
                          </Link>
                        )}
                        {entry.setlistfmUrl && (
                          <a href={entry.setlistfmUrl} target="_blank" rel="noopener noreferrer" className={META_LINK}>
                            {t("row.setlist")}
                            <span aria-hidden> ↗</span>
                          </a>
                        )}
                      </p>
                    )}
                  </div>
                  {actions && <div className="-mr-1 flex shrink-0 items-center pl-3 sm:pl-0">{actions}</div>}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
