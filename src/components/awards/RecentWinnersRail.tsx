import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { RailScroller } from "@/components/discovery/RailScroller";
import { SectionHeader } from "@/components/discovery/SectionHeader";
import { albumHref } from "@/lib/catalog-links";
import type { RecentHeadlineWinner } from "@/services/awards/read";
import { awardsIndexHref, ceremonyHref } from "./award-links";
import { NomineeVisual } from "./NominationItem";

// "Ganadores recientes" del hub `/awards` (openspec: enrich-awards-hub): el ganador destacado de las últimas ceremonias de cada
// premio, para entrar directo a la música y no solo a la ceremonia. Riel de una fila, como los de Explorar: quince carátulas en
// grilla ocupaban tres pantallas. Cada carátula abre el álbum (si está en el catálogo) y lleva su cartela, premio y año; sin
// álbum en el catálogo, abre la ceremonia. Sin ganadores no se renderiza.
//
// Con sesión (openspec: add-awards-personal-progress) suma la relación de la persona: cuántos álbumes ganadores escuchó, una
// marca en cada carátula (Escuchado o Pendiente) y el filtro "Te faltan", que deja solo los que no escuchó.

/** Parámetro de búsqueda del filtro "Te faltan" (`/awards?ganadores=faltan`). */
export const MISSING_WINNERS_PARAM = "ganadores";
export const MISSING_WINNERS_VALUE = "faltan";

export interface WinnersPersonal {
  heard: Set<string>;
  pending: Set<string>;
  /** Álbumes ganadores distintos del muro (con álbum en el catálogo). */
  total: number;
  /** Cuántos de ellos escuchó o valoró. */
  heardCount: number;
  /** El filtro "Te faltan" está activo: `winners` ya viene filtrado. */
  missingOnly: boolean;
}

function Check() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-3">
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}

function Progress({ personal }: { personal: WinnersPersonal }) {
  const t = useTranslations("awards");
  const { total, heardCount, missingOnly } = personal;
  const missing = total - heardCount;
  const percent = total > 0 ? Math.round((heardCount / total) * 100) : 0;
  const pill = (active: boolean) =>
    `inline-flex items-center rounded-full border px-3 py-1 font-data text-xs transition-colors focus-visible:border-amber ${
      active ? "border-amber bg-ink-surface text-paper" : "border-ink-border text-paper-muted hover:border-paper-muted/60 hover:text-paper"
    }`;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-ink-border bg-ink-surface/60 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="font-body text-sm text-paper">
          {missing === 0 ? t("winnersProgressAll", { total }) : t("winnersProgress", { heard: heardCount, total })}
        </p>
        <span
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={heardCount}
          aria-label={t("winnersProgressLabel")}
          className="block h-1 w-full max-w-sm overflow-hidden rounded-full bg-ink-border"
        >
          <span className="block h-full rounded-full bg-petrol" style={{ width: `${percent}%` }} />
        </span>
      </div>
      {missing > 0 ? (
        <nav aria-label={t("winnersFilterLabel")} className="flex shrink-0 gap-1.5">
          <Link href={awardsIndexHref()} scroll={false} aria-current={missingOnly ? undefined : "page"} className={pill(!missingOnly)}>
            {t("winnersFilterAll")}
          </Link>
          <Link
            href={{ pathname: awardsIndexHref(), query: { [MISSING_WINNERS_PARAM]: MISSING_WINNERS_VALUE } }}
            scroll={false}
            aria-current={missingOnly ? "page" : undefined}
            className={pill(missingOnly)}
          >
            {t("winnersFilterMissing", { count: missing })}
          </Link>
        </nav>
      ) : null}
    </div>
  );
}

export function RecentWinnersRail({ winners, personal }: { winners: RecentHeadlineWinner[]; personal?: WinnersPersonal | null }) {
  const t = useTranslations("awards");
  // Con el filtro activo el riel puede quedar vacío (ya escuchó todos): la sección sigue, con el progreso.
  if (winners.length === 0 && !personal?.missingOnly) return null;
  const awardName = (slug: string) => (t.has(`names.${slug}`) ? t(`names.${slug}`) : slug);

  const header = (
    <div className="flex flex-col gap-3">
      <SectionHeader heading={t("recentWinnersHeading")} description={t("recentWinnersDescription")} headingId="ganadores-recientes" />
      {personal && personal.total > 0 ? <Progress personal={personal} /> : null}
    </div>
  );

  return (
    <section aria-labelledby="ganadores-recientes" className="flex w-full scroll-mt-24 flex-col gap-3">
      {winners.length === 0 ? (
        header
      ) : (
        <RailScroller labelledBy="ganadores-recientes" header={header}>
          {winners.map((entry) => {
            const subject = entry.winner.subject;
            const album = subject?.kind === "release_group" ? subject.album : null;
            const href = album ? albumHref(album.artistName, album.title, album.id) : ceremonyHref(entry.awardSlug, entry.year);
            const credit = album ? album.artistName : entry.winner.credit;
            const mark = album && personal ? (personal.heard.has(album.id) ? "heard" : personal.pending.has(album.id) ? "pending" : null) : null;
            return (
              <li
                key={`${entry.awardSlug}-${entry.year}`}
                className="w-[40%] shrink-0 snap-start sm:w-[calc((100%-3rem)/4)] lg:w-[calc((100%-5rem)/6)] xl:w-[calc((100%-6rem)/7)]"
              >
                <Link href={href} className="group flex flex-col gap-1.5">
                  <span className="relative block overflow-hidden rounded-md ring-1 ring-ink-border transition-[box-shadow] group-hover:ring-amber group-focus-visible:ring-amber">
                    <NomineeVisual nomination={entry.winner} size="aspect-square w-full" />
                    {mark ? (
                      <span
                        className={`absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded bg-ink/85 px-1.5 py-0.5 font-data text-[0.65rem] backdrop-blur-sm ${
                          mark === "heard" ? "text-paper" : "text-paper-muted"
                        }`}
                      >
                        {mark === "heard" ? <Check /> : null}
                        {mark === "heard" ? t("winnerHeard") : t("winnerPending")}
                      </span>
                    ) : null}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-display text-sm text-paper transition-colors group-hover:text-amber">
                      {album?.title ?? entry.winner.text}
                    </span>
                    {credit ? <span className="block truncate font-data text-xs text-paper-muted">{credit}</span> : null}
                    <span className="block truncate font-data text-[0.65rem] uppercase tracking-wide text-petrol">
                      {t("ceremonyTitle", { award: awardName(entry.awardSlug), year: entry.year })}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </RailScroller>
      )}
    </section>
  );
}
