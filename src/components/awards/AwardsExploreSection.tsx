import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SectionHeader } from "@/components/discovery/SectionHeader";
import { awardsIndexHref, ceremonyHref } from "./award-links";

// Sección "Premios" de la portada de Explorar (openspec: add-music-awards, design D6): una tarjeta por cada una de
// las últimas ceremonias cargadas y "Ver todos" al índice. Sin ceremonias no se renderiza, como las demás secciones.

interface CeremonyTile {
  awardSlug: string;
  year: number;
  edition: number;
}

export function AwardsExploreSection({ ceremonies }: { ceremonies: CeremonyTile[] }) {
  const t = useTranslations("awards");
  if (ceremonies.length === 0) return null;
  const awardName = (slug: string) => (t.has(`names.${slug}`) ? t(`names.${slug}`) : slug);

  return (
    <section id="premios" aria-labelledby="premios-heading" className="flex w-full scroll-mt-24 flex-col gap-3">
      <SectionHeader
        heading={t("exploreHeading")}
        description={t("exploreDescription")}
        seeAll={{ href: awardsIndexHref(), label: t("exploreSeeAll") }}
        headingId="premios-heading"
      />
      <ul className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {ceremonies.map((ceremony) => (
          <li key={`${ceremony.awardSlug}-${ceremony.year}`}>
            <Link
              href={ceremonyHref(ceremony.awardSlug, ceremony.year)}
              className="flex h-full flex-col gap-1 rounded-lg border border-ink-border bg-ink-surface p-4 transition-colors hover:border-amber"
            >
              <span className="font-data text-xs uppercase tracking-wider text-amber">{awardName(ceremony.awardSlug)}</span>
              <span className="font-display text-3xl text-paper">{ceremony.year}</span>
              <span className="font-data text-xs text-paper-muted">{t("edition", { edition: ceremony.edition })}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
