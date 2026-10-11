import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { AwardCategory } from "@/components/awards/AwardCategory";
import { awardsIndexHref, categoryHistoryHref, ceremonyHref } from "@/components/awards/award-links";
import { getCeremonyPage } from "@/services/awards/read";

// Página de una ceremonia cerrada (openspec: add-music-awards, design D5): campo general primero, luego las
// categorías de género; el ganador destacado en cada una. Sin requests externos al renderizar.

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
  const tiers = [
    { tier: "general" as const, label: t("tierGeneral") },
    { tier: "genre" as const, label: t("tierGenre") },
  ];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col items-start gap-10 px-4 py-12">
      <div className="flex w-full flex-col gap-6">
        <Breadcrumbs
          items={[
            { label: tCommon("home"), href: "/" },
            { label: t("heading"), href: awardsIndexHref() },
            { label: String(page.ceremony.year) },
          ]}
        />
        <header className="flex max-w-3xl flex-col gap-2">
          <p className="font-data text-xs uppercase tracking-wider text-amber">{t("ceremonyKicker")}</p>
          <h1 className="font-display text-4xl text-paper">{title}</h1>
          <p className="font-data text-sm text-paper-muted">
            {t("edition", { edition: page.ceremony.edition })} · {t("heldOn", { date })}
          </p>
        </header>

        {page.ceremonies.length > 1 ? (
          <nav aria-label={t("otherCeremonies")} className="flex flex-wrap gap-1.5">
            {[...page.ceremonies].reverse().map((ceremony) => {
              const current = ceremony.year === page.ceremony.year;
              return (
                <Link
                  key={ceremony.year}
                  href={ceremonyHref(page.awardSlug, ceremony.year)}
                  aria-current={current ? "page" : undefined}
                  className={`inline-flex rounded-md px-2.5 py-1 font-data text-xs transition-colors ${
                    current
                      ? "bg-ink-surface text-paper ring-1 ring-inset ring-amber"
                      : "text-paper-muted hover:bg-ink-surface hover:text-paper"
                  }`}
                >
                  {ceremony.year}
                </Link>
              );
            })}
          </nav>
        ) : null}
      </div>

      {tiers.map(({ tier, label }) => {
        const categories = page.categories.filter((c) => c.tier === tier);
        if (categories.length === 0) return null;
        return (
          <section key={tier} aria-labelledby={`tier-${tier}`} className="flex w-full flex-col gap-4">
            <h2 id={`tier-${tier}`} className="font-display text-2xl text-paper">
              {label}
            </h2>
            <div className={`grid w-full gap-4 ${tier === "general" ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2"}`}>
              {categories.map((category) => (
                <AwardCategory
                  key={category.key}
                  name={category.name}
                  coverage={category.coverage}
                  honors={category.honors}
                  nominations={category.nominations}
                  link={{ href: categoryHistoryHref(page.awardSlug, category.key), label: t("categoryHistory") }}
                />
              ))}
            </div>
          </section>
        );
      })}
    </main>
  );
}
