import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { FacetRow } from "@/components/discovery/FacetRow";
import { ceremonyHref } from "@/components/awards/award-links";
import { listAwards } from "@/services/awards/read";

// Índice de premios (openspec: add-music-awards, design D5; redesign-awards-pages). Con un solo premio no hay nada que
// indexar —la ceremonia ya trae la navegación por años—: redirige a su ceremonia más reciente. Con varios, lista cada premio
// con sus ceremonias como chips de año.

interface AwardsIndexProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: AwardsIndexProps): Promise<Metadata> {
  await params;
  const t = await getTranslations("awards");
  return { title: t("pageTitle") };
}

export default async function AwardsIndexPage({ params }: AwardsIndexProps) {
  const { locale } = await params;
  const awards = await listAwards();

  const [only] = awards;
  if (awards.length === 1 && only?.ceremonies[0]) {
    redirect({ href: ceremonyHref(only.slug, only.ceremonies[0].year), locale });
  }

  const t = await getTranslations("awards");
  const tCommon = await getTranslations("common");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col items-start gap-8 px-4 py-12">
      <div className="flex w-full flex-col gap-6">
        <Breadcrumbs items={[{ label: tCommon("home"), href: "/" }, { label: t("heading") }]} />
        <h1 className="font-display text-4xl text-paper">{t("heading")}</h1>
      </div>

      {awards.length === 0 ? <p className="font-body text-paper-muted">{t("emptyIndex")}</p> : null}

      {awards.map((award) => (
        <section key={award.slug} aria-labelledby={`award-${award.slug}`} className="flex w-full flex-col gap-3">
          <h2 id={`award-${award.slug}`} className="font-display text-2xl text-paper">
            {t.has(`names.${award.slug}`) ? t(`names.${award.slug}`) : award.slug}
          </h2>
          <FacetRow
            scroll
            facet={{
              label: t("yearRow"),
              links: award.ceremonies.map((ceremony) => ({
                key: String(ceremony.year),
                label: String(ceremony.year),
                href: ceremonyHref(award.slug, ceremony.year),
                current: false,
              })),
            }}
          />
        </section>
      ))}
    </main>
  );
}
