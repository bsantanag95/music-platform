import { useTranslations } from "next-intl";
import { SectionHeader } from "@/components/discovery/SectionHeader";
import type { HallOfFameClass } from "@/services/awards/read";
import { hallOfFameIndexHref } from "./award-links";
import { HallOfFameTileGrid } from "./HallOfFameTile";

// Sección "Salón de la Fama" de la portada de Explorar (openspec: add-grammy-hall-of-fame, design D6; add-national-recording-registry,
// design D3; ADR 0044): como Premios, una tarjeta por salón con su última clase cerrada y "Ver todos" al índice `/hall-of-fame`; las incorporaciones
// de la clase se ven en su página. Sin clases no se renderiza, como las demás secciones.

export function HallOfFameExploreSection({ halls }: { halls: HallOfFameClass[] }) {
  const t = useTranslations("awards");
  if (halls.length === 0) return null;

  return (
    <section id="salon-de-la-fama" aria-labelledby="salon-de-la-fama-heading" className="flex w-full scroll-mt-24 flex-col gap-3">
      <SectionHeader
        heading={t("hall.exploreHeading", { count: halls.length })}
        description={t("hall.exploreDescription")}
        seeAll={{ href: hallOfFameIndexHref(), label: t("hall.exploreSeeAll") }}
        headingId="salon-de-la-fama-heading"
      />
      <HallOfFameTileGrid halls={halls} />
    </section>
  );
}
