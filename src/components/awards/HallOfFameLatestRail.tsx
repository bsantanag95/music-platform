import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { RailScroller } from "@/components/discovery/RailScroller";
import { SectionHeader } from "@/components/discovery/SectionHeader";
import type { HallOfFameClass } from "@/services/awards/read";
import { hallHref } from "./award-links";
import { NomineeVisual, subjectHref, titleAndArtist } from "./NominationItem";

// Riel con todas las incorporaciones de la última clase de un salón, para el índice `/hall-of-fame` (openspec:
// add-hall-of-fame-page, design D3; es el que tuvo la sección de Explorar antes de pasar a tarjetas). Cada tarjeta enlaza a su ficha
// cuando está en el catálogo y, si no, es solo texto. Las canciones muestran la carátula de su disco ancla (`NomineeVisual`).

const CARD = "w-[44%] shrink-0 snap-start sm:w-[calc((100%-2rem)/3)] lg:w-[calc((100%-4rem)/5)] xl:w-[calc((100%-5rem)/6)]";

export function HallOfFameLatestRail({ hall }: { hall: HallOfFameClass }) {
  const t = useTranslations("awards");
  const name = t.has(`names.${hall.awardSlug}`) ? t(`names.${hall.awardSlug}`) : hall.awardSlug;
  const headingId = `salon-${hall.awardSlug}-heading`;

  return (
    <section id={`salon-${hall.awardSlug}`} aria-labelledby={headingId} className="flex w-full scroll-mt-24 flex-col gap-3">
      <RailScroller
        labelledBy={headingId}
        header={
          <SectionHeader
            heading={name}
            description={`${t("hall.latestClass", { year: hall.year })} · ${t("hall.recordingCount", { count: hall.inductees.length })}`}
            seeAll={{ href: hallHref(hall.awardSlug), label: t("hall.exploreSeeAllClasses") }}
            headingId={headingId}
          />
        }
      >
        {hall.inductees.map((nomination) => {
          const { title, artist } = titleAndArtist(nomination);
          const href = subjectHref(nomination);
          const body = (
            <>
              <NomineeVisual nomination={nomination} size="aspect-square w-full" />
              <span className="flex min-w-0 flex-col">
                <span className="line-clamp-2 font-display text-sm text-paper transition-colors group-hover:text-amber">{title}</span>
                {artist ? <span className="truncate font-data text-xs text-paper-muted">{artist}</span> : null}
              </span>
            </>
          );
          return (
            <li key={nomination.id} className={CARD}>
              {href ? (
                <Link href={href} className="group flex flex-col gap-2">
                  {body}
                </Link>
              ) : (
                <div className="group flex flex-col gap-2">{body}</div>
              )}
            </li>
          );
        })}
      </RailScroller>
    </section>
  );
}
