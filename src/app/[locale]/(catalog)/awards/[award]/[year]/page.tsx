import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ExploreJumpNav } from "@/components/discovery/ExploreJumpNav";
import { FacetRow } from "@/components/discovery/FacetRow";
import { AwardCategory } from "@/components/awards/AwardCategory";
import { awardHref, categoryHistoryHref, ceremonyHref } from "@/components/awards/award-links";
import { splitFeatured } from "@/components/awards/featured-categories";
import { groupByField } from "@/components/awards/group-by-field";
import { AWARD_CATEGORY_TIERS } from "@/db/schema";
import { getCeremonyPage } from "@/services/awards/read";

// Página de una ceremonia cerrada (openspec: add-music-awards, design D5; redesign-awards-pages): campo general primero, luego
// por álbum y por género. Las cuatro categorías grandes van destacadas (ganador grande y todos los nominados); el resto, como
// filas compactas con los nominados plegados. Sin requests externos al renderizar.

interface CeremonyPageProps {
  params: Promise<{ locale: string; award: string; year: string }>;
}

async function load(params: CeremonyPageProps["params"]) {
  const { locale, award, year } = await params;
  const page = /^\d{4}$/.test(year) ? await getCeremonyPage(award, Number(year)) : null;
  return { locale, page };
}

export async function generateMetadata({ params }: CeremonyPageProps): Promise<Metadata> {
  const { page } = await load(params);
  if (!page) return {};
  const t = await getTranslations("awards");
  const award = t.has(`names.${page.awardSlug}`) ? t(`names.${page.awardSlug}`) : page.awardSlug;
  return { title: t("ceremonyTitle", { award, year: page.ceremony.year }) };
}

export default async function CeremonyPage({ params }: CeremonyPageProps) {
  const { locale, page } = await load(params);
  if (!page) notFound();
  const t = await getTranslations("awards");
  const tCommon = await getTranslations("common");
  const award = t.has(`names.${page.awardSlug}`) ? t(`names.${page.awardSlug}`) : page.awardSlug;
  const title = t("ceremonyTitle", { award, year: page.ceremony.year });
  const date = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${page.ceremony.heldOn}T00:00:00Z`),
  );
  // Orden de presentación (`AWARD_CATEGORY_TIERS`); un nivel sin categorías en esta ceremonia se omite.
  const labels = { general: t("tierGeneral"), album: t("tierAlbum"), genre: t("tierGenre") } as const;
  const tiers = AWARD_CATEGORY_TIERS.map((tier) => ({
    tier,
    label: labels[tier],
    categories: page.categories.filter((c) => c.tier === tier),
  })).filter(({ categories }) => categories.length > 0);

  // Navegación interna: los niveles general y por álbum y, en lugar del nivel por género, cada uno de sus campos.
  const jumpItems = tiers.flatMap(({ tier, label, categories }) =>
    tier === "genre"
      ? groupByField(categories)
          .filter((group) => group.field !== null)
          .map((group) => ({ id: `field-${group.field}`, label: t(`fields.${group.field}`) }))
      : [{ id: `tier-${tier}`, label }],
  );

  const category = (item: (typeof page.categories)[number], headingLevel: "h3" | "h4", variant: "featured" | "compact") => (
    <AwardCategory
      key={item.key}
      name={item.name}
      coverage={item.coverage}
      honors={item.honors}
      nominations={item.nominations}
      headingLevel={headingLevel}
      variant={variant}
      link={{ href: categoryHistoryHref(page.awardSlug, item.key), label: t("categoryHistory") }}
    />
  );
  // `items-start`: abrir los nominados de una fila no estira a la de al lado.
  const compactGrid = "grid w-full grid-cols-1 items-start gap-3 lg:grid-cols-2 xl:grid-cols-3";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col items-start gap-10 px-4 py-12">
      <div className="flex w-full flex-col gap-6">
        <Breadcrumbs
          items={[
            { label: tCommon("home"), href: "/" },
            { label: award, href: awardHref(page.awardSlug) },
            { label: String(page.ceremony.year) },
          ]}
        />
        <header className="flex max-w-3xl flex-col gap-2">
          <h1 className="font-display text-4xl text-paper">{title}</h1>
          <p className="font-data text-sm text-paper-muted">
            {t("edition", { edition: page.ceremony.edition })} · {t("heldOn", { date })}
          </p>
        </header>

        <div className="flex w-full flex-col gap-2.5">
          {page.ceremonies.length > 1 ? (
            <FacetRow
              scroll
              facet={{
                label: t("yearRow"),
                links: page.ceremonies.map((ceremony) => ({
                  key: String(ceremony.year),
                  label: String(ceremony.year),
                  href: ceremonyHref(page.awardSlug, ceremony.year),
                  current: ceremony.year === page.ceremony.year,
                })),
              }}
            />
          ) : null}
          <ExploreJumpNav label={t("jumpLabel")} items={jumpItems} />
        </div>
      </div>

      {tiers.map(({ tier, label, categories }) => (
        <section key={tier} id={`tier-${tier}`} aria-labelledby={`tier-${tier}-title`} className="flex w-full scroll-mt-24 flex-col gap-4">
          <h2 id={`tier-${tier}-title`} className="font-display text-2xl text-paper">
            {label}
          </h2>
          {tier === "general" ? (
            (() => {
              const { featured, rest } = splitFeatured(categories);
              return (
                <>
                  <div className="grid w-full grid-cols-1 gap-4">{featured.map((item) => category(item, "h3", "featured"))}</div>
                  {rest.length > 0 ? <div className={compactGrid}>{rest.map((item) => category(item, "h3", "compact"))}</div> : null}
                </>
              );
            })()
          ) : tier === "genre" ? (
            groupByField(categories).map((group) => (
              <div key={group.field ?? "none"} className="flex flex-col gap-3">
                {group.field ? (
                  <h3 id={`field-${group.field}`} className="scroll-mt-24 font-display text-xl text-paper">
                    {t(`fields.${group.field}`)}
                  </h3>
                ) : null}
                <div className={compactGrid}>{group.items.map((item) => category(item, "h4", "compact"))}</div>
              </div>
            ))
          ) : (
            <div className={compactGrid}>{categories.map((item) => category(item, "h3", "compact"))}</div>
          )}
        </section>
      ))}
    </main>
  );
}
