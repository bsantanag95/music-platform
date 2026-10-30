import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { HallOfFameLatestRail } from "@/components/awards/HallOfFameLatestRail";
import { listHallOfFameClasses } from "@/services/awards/read";
import { withClientMessages } from "@/i18n/client-messages";

// Índice de los salones de la fama (openspec: add-hall-of-fame-page, design D3; polish-hall-of-fame-page): un bloque por salón, con
// sus datos, sus clases y las incorporaciones de la última. Antes, además, la tarjeta de cada salón repetía la última clase arriba. Sin salones, un mensaje de vacío (no redirige).

interface HallOfFameIndexProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: HallOfFameIndexProps): Promise<Metadata> {
  await params;
  const t = await getTranslations("awards");
  return { title: t("hall.hubHeading") };
}

async function HallOfFameIndexPage({ params }: HallOfFameIndexProps) {
  await params;
  const halls = await listHallOfFameClasses();
  const t = await getTranslations("awards");
  const tCommon = await getTranslations("common");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col items-start gap-12 px-4 py-12">
      <div className="flex w-full flex-col gap-6">
        <Breadcrumbs items={[{ label: tCommon("home"), href: "/" }, { label: t("hall.pageHeading") }]} />
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-4xl text-paper">{t("hall.hubHeading")}</h1>
          <p className="font-body text-sm text-paper-muted">{t("hall.exploreDescription")}</p>
        </div>
      </div>

      {halls.length === 0 ? (
        <p className="font-body text-paper-muted">{t("hall.emptyIndex")}</p>
      ) : (
        halls.map((hall) => <HallOfFameLatestRail key={hall.awardSlug} hall={hall} />)
      )}
    </main>
  );
}

export default withClientMessages("(catalog)/hall-of-fame/page", HallOfFameIndexPage);
