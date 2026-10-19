import { useTranslations } from "next-intl";
import { RailScroller } from "@/components/discovery/RailScroller";
import { SectionHeader } from "@/components/discovery/SectionHeader";
import type { AwardSubjectKind } from "@/db/schema";
import type { CategoryHistoryEntry, NominationView } from "@/services/awards/read";
import { historyYearAnchor } from "./category-leaders";
import { NomineeVisual } from "./NominationItem";

// "Ganadores por año" del historial de una categoría (openspec: redesign-category-history): la carátula (o la foto) del
// ganador de cada ceremonia en una sola fila, de la más reciente a la más antigua. Es lo que más se busca en un historial y
// antes había que bajar tarjeta por tarjeta para verlo. Cada año salta a su detalle, más abajo en la misma página.

function titleAndArtist(nomination: NominationView): { title: string; artist: string | null } {
  const subject = nomination.subject;
  if (subject?.kind === "release_group") return { title: subject.album.title, artist: subject.album.artistName };
  if (subject?.kind === "recording") return { title: subject.title, artist: subject.artistName };
  if (subject?.kind === "artist") return { title: subject.name, artist: null };
  return { title: nomination.text, artist: nomination.credit };
}

export function CategoryWinnersTimeline({ entries, subjectKind }: { entries: CategoryHistoryEntry[]; subjectKind: AwardSubjectKind }) {
  const t = useTranslations("awards");
  const years = entries.flatMap((entry) => {
    const winners = entry.nominations.filter((n) => n.won);
    const [first] = winners;
    return first ? [{ year: entry.ceremony.year, winner: first, ties: winners.length - 1 }] : [];
  });
  if (years.length < 2) return null;

  return (
    <section aria-labelledby="ganadores-por-anio" className="flex w-full flex-col gap-3">
      <RailScroller labelledBy="ganadores-por-anio" header={<SectionHeader heading={t("winnersByYear")} headingId="ganadores-por-anio" />}>
        {years.map(({ year, winner, ties }) => {
          const { title, artist } = titleAndArtist(winner);
          return (
            <li key={year} className="w-[40%] shrink-0 snap-start sm:w-[calc((100%-3rem)/4)] lg:w-[calc((100%-5rem)/6)]">
              <a href={`#${historyYearAnchor(year)}`} className="group flex flex-col gap-1.5">
                <span className="font-display text-2xl leading-none tabular-nums text-paper transition-colors group-hover:text-amber">
                  {year}
                </span>
                <span className="block overflow-hidden rounded-md ring-1 ring-ink-border transition-[box-shadow] group-hover:ring-amber group-focus-visible:ring-amber">
                  <NomineeVisual nomination={winner} size="aspect-square w-full" person={subjectKind === "artist"} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-display text-sm text-paper">{title}</span>
                  {artist ? <span className="block truncate font-data text-xs text-paper-muted">{artist}</span> : null}
                  {ties > 0 ? <span className="block font-data text-[0.65rem] text-paper-muted">{t("tiedWinners", { count: ties })}</span> : null}
                </span>
              </a>
            </li>
          );
        })}
      </RailScroller>
    </section>
  );
}
