import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { RailScroller } from "@/components/discovery/RailScroller";
import { SectionHeader } from "@/components/discovery/SectionHeader";
import type { HallOfFameClass } from "@/services/awards/read";
import { hallClassHref, hallHref } from "./award-links";
import { NomineeVisual, subjectHref, titleAndArtist } from "./NominationItem";

// Un salón en el índice `/hall-of-fame` (openspec: add-hall-of-fame-page, design D3; polish-hall-of-fame-page): cabecera con el
// nombre, los años, cuántas clases hay y quién decide, las clases como enlaces, y el riel con todas las incorporaciones de la
// última. Antes el índice mostraba la tarjeta del salón (con ocho carátulas de la última clase) y, debajo, este riel con la misma
// clase: la información salía dos veces. Cada tarjeta enlaza a su ficha cuando está en el catálogo y, si no, es solo texto. Sin
// carátula lleva la portada tipográfica, no la silueta del disco.

const CARD = "w-[44%] shrink-0 snap-start sm:w-[calc((100%-2rem)/3)] lg:w-[calc((100%-4rem)/5)] xl:w-[calc((100%-5rem)/6)]";

export function HallOfFameLatestRail({ hall }: { hall: HallOfFameClass }) {
  const t = useTranslations("awards");
  const name = t.has(`names.${hall.awardSlug}`) ? t(`names.${hall.awardSlug}`) : hall.awardSlug;
  const headingId = `salon-${hall.awardSlug}-heading`;
  const oldest = hall.years.at(-1) ?? hall.year;
  const facts = [
    oldest === hall.year ? String(oldest) : t("yearRange", { from: oldest, to: hall.year }),
    t("hall.hubClasses", { count: hall.years.length }),
    hall.voting ? t(`votingHall.${hall.voting}`) : null,
  ].filter(Boolean);

  const header = (
    <div className="flex flex-col gap-3">
      <SectionHeader
        heading={name}
        description={facts.join(" · ")}
        seeAll={{ href: hallHref(hall.awardSlug), label: t("hall.exploreSeeAllClasses") }}
        headingId={headingId}
      />
      <nav aria-label={t("hall.classesOf", { award: name })} className="flex flex-wrap items-center gap-1.5">
        {hall.years.map((year) => {
          const current = year === hall.year;
          return (
            <Link
              key={year}
              href={hallClassHref(hall.awardSlug, year)}
              aria-current={current ? "page" : undefined}
              className={`inline-flex rounded-full border px-3 py-1 font-data text-xs tabular-nums transition-colors focus-visible:border-amber ${
                current ? "border-amber bg-ink-surface text-paper" : "border-ink-border text-paper-muted hover:border-paper-muted/60 hover:text-paper"
              }`}
            >
              {year}
            </Link>
          );
        })}
        <span className="ml-1 font-data text-xs text-paper-muted">
          {t("hall.latestClass", { year: hall.year })} · {t("hall.recordingCount", { count: hall.inductees.length })}
        </span>
      </nav>
    </div>
  );

  return (
    <section id={`salon-${hall.awardSlug}`} aria-labelledby={headingId} className="flex w-full scroll-mt-24 flex-col gap-3">
      <RailScroller labelledBy={headingId} header={header}>
        {hall.inductees.map((nomination) => {
          const { title, artist } = titleAndArtist(nomination);
          const href = subjectHref(nomination);
          const body = (
            <>
              <NomineeVisual nomination={nomination} size="aspect-square w-full" typeCover />
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
