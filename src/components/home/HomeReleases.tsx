import { getLocale, getTranslations } from "next-intl/server";
import { ReleaseRail } from "./ReleaseRail";
import type { HomeRelease } from "@/services/home/home";

// Apartado de Inicio "Lanzamientos recientes / Próximos lanzamientos": server
// component que resuelve i18n y delega el riel/flechas a ReleaseRail. Los
// datos salen del calendario de lanzamientos (ListenBrainz, ver
// docs/05-features/home.md).
export async function HomeReleases({ releases }: { releases: HomeRelease[] }) {
  if (releases.length === 0) return null;

  const [t, locale] = await Promise.all([getTranslations("home"), getLocale()]);

  return (
    <ReleaseRail
      releases={releases}
      locale={locale}
      title={t("releasesTitle")}
      todayLabel={t("releasesToday")}
      upcomingPrefix={t("releasesUpcomingPrefix")}
      upcomingBadge={t("releasesUpcomingBadge")}
      badgeLabels={{ announced: t("releasesAnnouncedBadge"), featured: t("releasesFeaturedBadge") }}
      prevLabel={t("releasesPrev")}
      nextLabel={t("releasesNext")}
    />
  );
}
