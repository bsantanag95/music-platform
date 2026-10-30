import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { AwardCategory, categoryName } from "@/components/awards/AwardCategory";
import { awardHref, awardsIndexHref, categoryHistoryHref, ceremonyHref } from "@/components/awards/award-links";
import { categoryLeaders, historyYearAnchor } from "@/components/awards/category-leaders";
import { CategoryWinnersTimeline } from "@/components/awards/CategoryWinnersTimeline";
import { getCategoryHistory } from "@/services/awards/read";
import { withClientMessages } from "@/i18n/client-messages";

// Historial de una categoría a través de las ceremonias (openspec: add-music-awards, design D5; redesign-category-history), con
// enlaces a la categoría anterior y a la siguiente cuando se renombró, fusionó o dividió.
//
// Antes repetía la tarjeta completa de la ceremonia por cada año, con todos los nominados a la vista: seis años eran unos
// 3.500 px y para saber quién ganó cada año había que recorrerlos todos. Ahora: una cabecera con el premio, las ediciones y los
// años; "Ganadores por año" en una fila; cada año con su ganador y los nominados plegados (abierto solo el más reciente); y al
// costado, quién más se repite en la categoría y las demás categorías del premio.

interface CategoryHistoryProps {
  params: Promise<{ locale: string; award: string; key: string }>;
}

export async function generateMetadata({ params }: CategoryHistoryProps): Promise<Metadata> {
  const { locale, award, key } = await params;
  const page = await getCategoryHistory(award, key);
  if (!page) return {};
  return { title: categoryName(page.name, locale) };
}

async function CategoryHistoryPage({ params }: CategoryHistoryProps) {
  const { locale, award, key } = await params;
  const page = await getCategoryHistory(award, key);
  if (!page) notFound();
  const t = await getTranslations("awards");
  const tCommon = await getTranslations("common");
  const awardName = t.has(`names.${page.awardSlug}`) ? t(`names.${page.awardSlug}`) : page.awardSlug;
  const name = categoryName(page.name, locale);
  const relation = (href: string, text: string) => (
    <Link href={href} className="font-data text-sm text-paper-muted underline-offset-2 transition-colors hover:text-amber hover:underline">
      {text}
    </Link>
  );

  const years = page.entries.map((entry) => entry.ceremony.year);
  const newest = years[0];
  const oldest = years.at(-1);
  const summary = [
    awardName,
    years.length > 0 ? t("editionsCount", { count: years.length }) : null,
    newest !== undefined && oldest !== undefined ? (newest === oldest ? String(newest) : t("yearRange", { from: oldest, to: newest })) : null,
  ].filter(Boolean);
  const leaders = categoryLeaders(page.entries);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col items-start gap-10 px-4 py-12">
      <div className="flex w-full flex-col gap-6">
        <Breadcrumbs
          items={[
            { label: tCommon("home"), href: "/" },
            { label: t("heading"), href: awardsIndexHref() },
            { label: awardName, href: awardHref(page.awardSlug) },
            { label: name },
          ]}
        />
        <header className="flex flex-col gap-2">
          <h1 className="font-display text-4xl text-paper">{name}</h1>
          <p className="font-data text-sm text-paper-muted">{summary.join(" · ")}</p>
          {page.honors === "songwriter" ? <p className="font-data text-sm text-paper-muted">{t("songwriterNote")}</p> : null}
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {page.predecessor
              ? relation(
                  categoryHistoryHref(page.awardSlug, page.predecessor.key),
                  t("previouslyNamed", { name: categoryName(page.predecessor.name, locale) }),
                )
              : null}
            {page.successors.map((successor) => (
              <span key={successor.key}>
                {relation(
                  categoryHistoryHref(page.awardSlug, successor.key),
                  t("laterNamed", { name: categoryName(successor.name, locale) }),
                )}
              </span>
            ))}
          </div>
        </header>
      </div>

      <CategoryWinnersTimeline entries={page.entries} subjectKind={page.subjectKind} />

      <div className="grid w-full items-start gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="flex min-w-0 flex-col gap-3">
          {page.entries.map((entry, index) => (
            <AwardCategory
              key={entry.ceremony.year}
              id={historyYearAnchor(entry.ceremony.year)}
              variant="compact"
              nomineesOpen={index === 0}
              headingLevel="h2"
              heading={String(entry.ceremony.year)}
              name={page.name}
              coverage={entry.coverage}
              honors="performer"
              subjectKind={page.subjectKind}
              nominations={entry.nominations}
              link={{ href: ceremonyHref(page.awardSlug, entry.ceremony.year), label: t("ceremonyLink", { year: entry.ceremony.year }) }}
            />
          ))}
        </div>

        <aside className="flex flex-col gap-8 lg:sticky lg:top-24">
          {leaders.length > 0 ? (
            <section aria-labelledby="mas-nominados" className="flex flex-col gap-3">
              <h2 id="mas-nominados" className="font-display text-lg text-paper">
                {t("categoryLeadersHeading")}
              </h2>
              <ol className="flex flex-col divide-y divide-ink-border rounded-lg border border-ink-border bg-ink-surface">
                {leaders.map((leader) => (
                  <li key={leader.name} className="flex flex-col gap-0.5 px-3 py-2">
                    <span className="truncate font-body text-sm text-paper">{leader.name}</span>
                    <span className="font-data text-xs tabular-nums text-paper-muted">
                      {t("leaderNominations", { count: leader.nominations })}
                      {leader.wins > 0 ? (
                        <>
                          {" · "}
                          <span className="text-paper">{t("leaderWins", { count: leader.wins })}</span>
                        </>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {page.otherCategories.length > 0 ? (
            <nav aria-labelledby="otras-categorias" className="flex flex-col gap-3">
              <h2 id="otras-categorias" className="font-display text-lg text-paper">
                {t("otherCategoriesHeading", { award: awardName })}
              </h2>
              <ul className="flex max-h-[50vh] flex-col overflow-y-auto pr-1 [scrollbar-width:thin]">
                {page.otherCategories.map((category) => (
                  <li key={category.key}>
                    <Link
                      href={categoryHistoryHref(page.awardSlug, category.key)}
                      className="block truncate rounded px-2 py-1 font-body text-sm text-paper-muted transition-colors hover:bg-ink-surface hover:text-paper focus-visible:text-paper"
                    >
                      {categoryName(category.name, locale)}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </aside>
      </div>
    </main>
  );
}

export default withClientMessages("(catalog)/awards/[award]/categories/[key]/page", CategoryHistoryPage);
