import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { RailScroller } from "@/components/discovery/RailScroller";
import { SectionHeader } from "@/components/discovery/SectionHeader";
import type { HallOfFameClass } from "@/services/awards/read";
import { awardHref } from "./award-links";
import { NomineeVisual, subjectHref, titleAndArtist } from "./NominationItem";

// Sección "Salón de la Fama" de la portada de Explorar (openspec: add-grammy-hall-of-fame, design D6; ADR 0044): por cada
// salón con al menos una clase cerrada, un riel con todas las incorporaciones de su última clase y "Ver todas las clases".
// Sin clases no se renderiza, como las demás secciones. Cada tarjeta enlaza a su ficha cuando está en el catálogo y, si no,
// es solo texto. Las canciones muestran la carátula de su disco ancla (`NomineeVisual`).

const CARD = "w-[44%] shrink-0 snap-start sm:w-[calc((100%-2rem)/3)] lg:w-[calc((100%-4rem)/5)] xl:w-[calc((100%-5rem)/6)]";

export function HallOfFameExploreSection({ halls }: { halls: HallOfFameClass[] }) {
  const t = useTranslations("awards");
  if (halls.length === 0) return null;
  const awardName = (slug: string) => (t.has(`names.${slug}`) ? t(`names.${slug}`) : slug);

  return (
    <section id="salon-de-la-fama" aria-labelledby="salon-de-la-fama-heading" className="flex w-full scroll-mt-24 flex-col gap-8">
      {halls.map((hall, index) => (
        <RailScroller
          key={hall.awardSlug}
          labelledBy={index === 0 ? "salon-de-la-fama-heading" : undefined}
          header={
            <SectionHeader
              heading={halls.length === 1 ? t("hall.exploreHeading") : awardName(hall.awardSlug)}
              description={`${awardName(hall.awardSlug)} · ${t("hall.latestClass", { year: hall.year })} · ${t("hall.recordingCount", {
                count: hall.inductees.length,
              })}`}
              seeAll={{ href: awardHref(hall.awardSlug), label: t("hall.exploreSeeAll") }}
              headingId={index === 0 ? "salon-de-la-fama-heading" : undefined}
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
      ))}
    </section>
  );
}
