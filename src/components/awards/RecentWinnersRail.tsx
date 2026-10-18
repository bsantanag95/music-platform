import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { RailScroller } from "@/components/discovery/RailScroller";
import { SectionHeader } from "@/components/discovery/SectionHeader";
import { albumHref } from "@/lib/catalog-links";
import type { RecentHeadlineWinner } from "@/services/awards/read";
import { ceremonyHref } from "./award-links";
import { NomineeVisual } from "./NominationItem";

// "Ganadores recientes" del hub `/awards` (openspec: enrich-awards-hub): el ganador destacado de las últimas ceremonias de cada
// premio, para entrar directo a la música y no solo a la ceremonia. Riel de una fila, como los de Explorar: quince carátulas en
// grilla ocupaban tres pantallas. Cada carátula abre el álbum (si está en el catálogo) y lleva su cartela, premio y año; sin
// álbum en el catálogo, abre la ceremonia. Sin ganadores no se renderiza.

export function RecentWinnersRail({ winners }: { winners: RecentHeadlineWinner[] }) {
  const t = useTranslations("awards");
  if (winners.length === 0) return null;
  const awardName = (slug: string) => (t.has(`names.${slug}`) ? t(`names.${slug}`) : slug);

  return (
    <section aria-labelledby="ganadores-recientes" className="flex w-full flex-col gap-3">
      <RailScroller
        labelledBy="ganadores-recientes"
        header={
          <SectionHeader heading={t("recentWinnersHeading")} description={t("recentWinnersDescription")} headingId="ganadores-recientes" />
        }
      >
        {winners.map((entry) => {
          const subject = entry.winner.subject;
          const album = subject?.kind === "release_group" ? subject.album : null;
          const href = album ? albumHref(album.artistName, album.title, album.id) : ceremonyHref(entry.awardSlug, entry.year);
          const credit = album ? album.artistName : entry.winner.credit;
          return (
            <li
              key={`${entry.awardSlug}-${entry.year}`}
              className="w-[40%] shrink-0 snap-start sm:w-[calc((100%-3rem)/4)] lg:w-[calc((100%-5rem)/6)] xl:w-[calc((100%-6rem)/7)]"
            >
              <Link href={href} className="group flex flex-col gap-1.5">
                <span className="block overflow-hidden rounded-md ring-1 ring-ink-border transition-[box-shadow] group-hover:ring-amber group-focus-visible:ring-amber">
                  <NomineeVisual nomination={entry.winner} size="aspect-square w-full" />
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
    </section>
  );
}
