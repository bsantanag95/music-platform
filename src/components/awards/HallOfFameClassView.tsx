import { useLocale, useTranslations } from "next-intl";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { FacetRow } from "@/components/discovery/FacetRow";
import type { CeremonyPage } from "@/services/awards/read";
import { categoryName } from "./AwardCategory";
import { hallClassHref, hallHref, hallOfFameIndexHref } from "./award-links";
import { NominationItem } from "./NominationItem";
import { sourceSite } from "./source-site";

// Ceremonia de un salón de la fama (openspec: add-grammy-hall-of-fame, design D5; ADR 0044): "Clase de 2026", con la fecha
// de la gala y las incorporaciones por categoría. A diferencia de una competencia no hay número de edición, ganador entre
// nominados ni historia de la categoría: cada incorporación lleva "Ingresó". Los nominados que no entraron, si el salón los
// publica, van aparte; el Grammy Hall of Fame no tiene.

export function HallOfFameClassView({ page, awardName }: { page: CeremonyPage; awardName: string }) {
  const t = useTranslations("awards");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const date = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${page.ceremony.heldOn}T00:00:00Z`),
  );
  const site = sourceSite(page.sourceUrl);
  const inducted = page.categories.reduce((total, category) => total + category.nominations.filter((n) => n.won).length, 0);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col items-start gap-10 px-4 py-12">
      <div className="flex w-full flex-col gap-6">
        <Breadcrumbs
          items={[
            { label: tCommon("home"), href: "/" },
            { label: t("hall.pageHeading"), href: hallOfFameIndexHref() },
            { label: awardName, href: hallHref(page.awardSlug) },
            { label: t("hall.classTitle", { year: page.ceremony.year }) },
          ]}
        />
        <header className="flex w-full flex-col gap-2 rounded-xl border border-ink-border bg-ink-surface p-5 sm:p-8">
          <p className="font-data text-xs uppercase tracking-wider text-amber">{awardName}</p>
          <h1 className="font-display text-4xl text-paper sm:text-5xl">{t("hall.classTitle", { year: page.ceremony.year })}</h1>
          <p className="font-data text-sm text-paper-muted">
            {t("hall.recordingCount", { count: inducted })} · {t("hall.date", { date })}
          </p>
          {page.voting || site ? (
            <p className="flex flex-wrap items-center gap-x-2 font-data text-xs text-paper-muted">
              {page.voting ? <span>{t(`votingHall.${page.voting}`)}</span> : null}
              {page.voting && site ? <span aria-hidden="true">·</span> : null}
              {site && page.sourceUrl ? (
                <a href={page.sourceUrl} rel="noopener noreferrer" className="underline-offset-2 transition-colors hover:text-amber hover:underline">
                  {t("source", { site })}
                </a>
              ) : null}
            </p>
          ) : null}
        </header>

        {page.ceremonies.length > 1 ? (
          <FacetRow
            scroll
            facet={{
              label: t("hall.classYearRow"),
              links: page.ceremonies.map((ceremony) => ({
                key: String(ceremony.year),
                label: String(ceremony.year),
                href: hallClassHref(page.awardSlug, ceremony.year),
                current: ceremony.year === page.ceremony.year,
              })),
            }}
          />
        ) : null}
      </div>

      {page.categories.map((category) => {
        const inductees = category.nominations.filter((n) => n.won);
        const others = category.nominations.filter((n) => !n.won);
        const id = `categoria-${category.key}`;
        return (
          <section key={category.key} aria-labelledby={id} className="flex w-full flex-col gap-4">
            <h2 id={id} className="font-display text-2xl text-paper">
              {categoryName(category.name, locale)}
              <span className="ml-2 font-data text-sm text-paper-muted">{inductees.length}</span>
            </h2>
            <ul className="grid w-full grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              {inductees.map((nomination) => (
                <li key={nomination.id} className="min-w-0">
                  <NominationItem nomination={nomination} size="md" wonLabel={t("hall.inducted")} />
                </li>
              ))}
            </ul>
            {others.length > 0 ? (
              <ul className="grid w-full grid-cols-1 gap-x-6 gap-y-3 border-t border-ink-border pt-4 sm:grid-cols-2 lg:grid-cols-3">
                {others.map((nomination) => (
                  <li key={nomination.id} className="min-w-0">
                    <NominationItem nomination={nomination} size="sm" />
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        );
      })}
    </main>
  );
}
