import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ceremonyHref } from "@/components/awards/award-links";
import { AwardTileGrid } from "@/components/awards/AwardTile";
import { listLatestCeremoniesByAward } from "@/services/awards/read";

// Hub de premios (openspec: add-music-awards, design D5; redesign-awards-pages; add-four-music-awards, design D7). Con un solo
// premio no hay nada que elegir —la ceremonia ya trae la navegación por años—: redirige a su ceremonia más reciente. Con varios,
// una tarjeta por premio (la misma de Explorar), de la ceremonia más reciente a la más antigua.

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
  const ceremonies = await listLatestCeremoniesByAward();

  const [only] = ceremonies;
  if (ceremonies.length === 1 && only) {
    redirect({ href: ceremonyHref(only.awardSlug, only.year), locale });
  }

  const t = await getTranslations("awards");
  const tCommon = await getTranslations("common");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col items-start gap-8 px-4 py-12">
      <div className="flex w-full flex-col gap-6">
        <Breadcrumbs items={[{ label: tCommon("home"), href: "/" }, { label: t("heading") }]} />
        <h1 className="font-display text-4xl text-paper">{t("heading")}</h1>
      </div>

      {ceremonies.length === 0 ? <p className="font-body text-paper-muted">{t("emptyIndex")}</p> : <AwardTileGrid ceremonies={ceremonies} />}
    </main>
  );
}
