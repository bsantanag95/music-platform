import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { AwardCoverage, AwardHonors } from "@/db/schema";
import type { CategoryName, NominationView } from "@/services/awards/read";
import { NominationItem } from "./NominationItem";

// Una categoría de una ceremonia: título traducido, nota de cobertura, ganadores destacados y el resto de los
// nominados en una grilla (openspec: add-music-awards, design D5).

export function categoryName(name: CategoryName, locale: string): string {
  return locale === "en" ? name.en : name.es;
}

interface AwardCategoryProps {
  name: CategoryName;
  coverage: AwardCoverage;
  honors: AwardHonors;
  nominations: NominationView[];
  /** Título de la categoría; en la historia de una categoría es el año de la ceremonia. */
  heading?: string;
  /** Enlace junto al título (la historia de la categoría, o la ceremonia desde la historia). */
  link?: { href: string; label: string };
  headingLevel?: "h2" | "h3";
}

export function AwardCategory({ name, coverage, honors, nominations, heading, link, headingLevel = "h3" }: AwardCategoryProps) {
  const t = useTranslations("awards");
  const locale = useLocale();
  const winners = nominations.filter((n) => n.won);
  const others = nominations.filter((n) => !n.won);
  const Heading = headingLevel;

  return (
    <section className="flex w-full flex-col gap-4 rounded-lg border border-ink-border bg-ink-surface p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <Heading className="font-display text-lg text-paper">{heading ?? categoryName(name, locale)}</Heading>
        {link ? (
          <Link href={link.href} className="group inline-flex items-center gap-1 font-data text-xs text-paper-muted transition-colors hover:text-amber">
            {link.label}
            <span aria-hidden="true" className="transition-transform duration-150 group-hover:translate-x-0.5">
              →
            </span>
          </Link>
        ) : null}
      </div>
      {honors === "songwriter" ? <p className="-mt-2 font-data text-xs text-paper-muted">{t("songwriterNote")}</p> : null}

      <ul className="flex flex-col gap-3">
        {winners.map((nomination) => (
          <li key={nomination.id}>
            <NominationItem nomination={nomination} featured />
          </li>
        ))}
      </ul>

      {others.length > 0 ? (
        <div className="flex flex-col gap-2 border-t border-ink-border pt-3">
          <p className="font-data text-xs uppercase tracking-wider text-paper-muted">{t("nominees")}</p>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((nomination) => (
              <li key={nomination.id} className="min-w-0">
                <NominationItem nomination={nomination} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {coverage === "winner_only" ? <p className="font-data text-xs text-paper-muted">{t("winnerOnlyNote")}</p> : null}
    </section>
  );
}
