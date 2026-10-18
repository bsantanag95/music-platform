import { useTranslations } from "next-intl";
import { SectionHeader } from "@/components/discovery/SectionHeader";
import type { LatestCeremony } from "@/services/awards/read";
import { awardsIndexHref } from "./award-links";
import { AwardTileGrid } from "./AwardTile";

// Sección "Premios" de la portada de Explorar (openspec: add-music-awards, design D6; add-four-music-awards, design D6):
// una tarjeta por premio, con su ceremonia más reciente, y "Ver todos" al hub. Sin ceremonias no se renderiza, como las
// demás secciones.

export function AwardsExploreSection({ ceremonies }: { ceremonies: LatestCeremony[] }) {
  const t = useTranslations("awards");
  if (ceremonies.length === 0) return null;

  return (
    <section id="premios" aria-labelledby="premios-heading" className="flex w-full scroll-mt-24 flex-col gap-3">
      <SectionHeader
        heading={t("exploreHeading")}
        description={t("exploreDescription")}
        seeAll={{ href: awardsIndexHref(), label: t("exploreSeeAll") }}
        headingId="premios-heading"
      />
      <AwardTileGrid ceremonies={ceremonies} />
    </section>
  );
}
