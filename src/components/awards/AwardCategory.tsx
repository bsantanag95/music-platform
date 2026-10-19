import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { AwardCoverage, AwardHonors, AwardSubjectKind } from "@/db/schema";
import type { CategoryName, NominationView } from "@/services/awards/read";
import { NominationItem } from "./NominationItem";

// Una categoría de una ceremonia (openspec: add-music-awards, design D5; redesign-awards-pages). Dos formas:
//  - `featured`: el ganador grande y todos los nominados a la vista (las categorías grandes de la ceremonia);
//  - `compact`: el nombre, el ganador con su carátula y los nominados plegados bajo "Nominados (N)" (`<details>`, cerrado
//    por defecto y sin JavaScript; `nomineesOpen` lo abre). También cada año del historial de una categoría
//    (openspec: redesign-category-history), con el año más reciente abierto. Una categoría de la que solo se registró al ganador no lleva el control y dice por qué.

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
  headingLevel?: "h2" | "h3" | "h4";
  variant?: "featured" | "compact";
  /** Qué premia la categoría: con `artist`, los nominados sin foto llevan su inicial. */
  subjectKind?: AwardSubjectKind;
  /** Ancla de la tarjeta (el año, en el historial de una categoría). */
  id?: string;
  /** En `compact`, los nominados empiezan desplegados (el año más reciente del historial). */
  nomineesOpen?: boolean;
}

export function AwardCategory({
  name,
  coverage,
  honors,
  nominations,
  heading,
  link,
  headingLevel = "h3",
  variant = "featured",
  subjectKind,
  id,
  nomineesOpen = false,
}: AwardCategoryProps) {
  const t = useTranslations("awards");
  const locale = useLocale();
  const winners = nominations.filter((n) => n.won);
  const others = nominations.filter((n) => !n.won);
  const Heading = headingLevel;
  const compact = variant === "compact";
  const person = subjectKind === "artist";

  return (
    <section id={id} className={`flex w-full scroll-mt-24 flex-col rounded-lg border border-ink-border bg-ink-surface ${compact ? "gap-3 p-3" : "gap-4 p-4"}`}>
      {/* El enlace siempre arriba a la derecha, sin saltar de línea: el que se ajusta es el título. Antes, según el ancho de
          la tarjeta, quedaba a la derecha o debajo del título. */}
      <div className="flex items-start justify-between gap-4">
        <Heading className={`min-w-0 font-display text-paper ${compact ? "text-base" : "text-lg"}`}>{heading ?? categoryName(name, locale)}</Heading>
        {link ? (
          <Link href={link.href} className="group mt-0.5 inline-flex shrink-0 items-center gap-1 whitespace-nowrap font-data text-xs text-paper-muted transition-colors hover:text-amber">
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
            <NominationItem nomination={nomination} size={compact ? "md" : "lg"} person={person} />
          </li>
        ))}
      </ul>

      {others.length > 0 ? (
        compact ? (
          <details className="group" open={nomineesOpen || undefined}>
            <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 font-data text-xs text-paper-muted transition-colors hover:text-paper focus-visible:text-paper [&::-webkit-details-marker]:hidden">
              {t("nomineesCount", { count: others.length })}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
                className="size-3.5 transition-transform group-open:rotate-180"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </summary>
            <ul className="grid grid-cols-1 gap-3 border-t border-ink-border pt-3 mt-2 sm:grid-cols-2">
              {others.map((nomination) => (
                <li key={nomination.id} className="min-w-0">
                  <NominationItem nomination={nomination} person={person} />
                </li>
              ))}
            </ul>
          </details>
        ) : (
          <div className="flex flex-col gap-2 border-t border-ink-border pt-3">
            <p className="font-data text-xs text-paper-muted">{t("nomineesCount", { count: others.length })}</p>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((nomination) => (
                <li key={nomination.id} className="min-w-0">
                  <NominationItem nomination={nomination} person={person} />
                </li>
              ))}
            </ul>
          </div>
        )
      ) : null}

      {coverage === "winner_only" ? <p className="font-data text-xs text-paper-muted">{t("winnerOnlyNote")}</p> : null}
    </section>
  );
}
