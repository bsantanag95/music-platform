import { getLocale, getTranslations } from "next-intl/server";
import { ReleaseRail } from "./ReleaseRail";
import { ReleaseSwitcher } from "./ReleaseSwitcher";
import { ReleaseTimetable } from "./ReleaseTimetable";
import { HomeSectionHeading } from "./HomeSectionHeading";
import { PERSONAL_DEFAULT_MIN } from "@/services/home/release-calendar";
import type { HomeRelease } from "@/services/home/home";

// Apartado de Inicio "Lanzamientos recientes / Próximos lanzamientos": server
// component que resuelve i18n y delega el riel/flechas a ReleaseRail. Los
// datos salen del calendario de lanzamientos (ListenBrainz, ver
// docs/05-features/home.md).
//
// Sin sesión (`personalReleases` ausente) se muestra solo la selección popular. Con sesión se suma el
// selector "De tus artistas | Populares": dos vistas con orientación propia que no se mezclan; abre en
// la personal si tiene al menos `PERSONAL_DEFAULT_MIN` discos y, si no, en la popular con la invitación
// a seguir artistas.
export async function HomeReleases({
  releases,
  personalReleases,
  layout = "rail",
}: {
  releases: HomeRelease[];
  personalReleases?: HomeRelease[];
  /**
   * `timetable` (solo la portada sin sesión, redesign-anon-home-phase3): la selección anónima como
   * horario de dos partes bajo `HomeSectionHeading`. Por defecto, el riel (o el selector con sesión).
   */
  layout?: "rail" | "timetable";
}) {
  const [t, locale] = await Promise.all([getTranslations("home"), getLocale()]);

  if (layout === "timetable") {
    if (releases.length === 0) return null;
    return (
      <section aria-labelledby="home-releases" className="flex flex-col gap-6">
        <HomeSectionHeading
          id="home-releases"
          title={t("releasesTitle")}
          description={t("releasesDescription")}
        />
        <ReleaseTimetable
          releases={releases}
          locale={locale}
          labelledBy="home-releases"
          labels={{
            recent: t("releasesRecent"),
            upcoming: t("releasesUpcoming"),
            published: t("releasesPublishedBadge"),
            upcomingBadge: t("releasesUpcomingBadge"),
            showMore: (count) => t("releasesShowMore", { count }),
            showLess: t("releasesShowLess"),
          }}
        />
      </section>
    );
  }

  const railProps = {
    locale,
    title: t("releasesTitle"),
    todayLabel: t("releasesToday"),
    upcomingPrefix: t("releasesUpcomingPrefix"),
    upcomingBadge: t("releasesUpcomingBadge"),
    badgeLabels: { announced: t("releasesAnnouncedBadge") },
    prevLabel: t("releasesPrev"),
    nextLabel: t("releasesNext"),
  };

  if (personalReleases === undefined) {
    if (releases.length === 0) return null;
    return <ReleaseRail releases={releases} {...railProps} />;
  }

  // Sin calendario (nunca sincronizado) y sin discos propios no hay nada que mostrar ni que invitar.
  if (releases.length === 0 && personalReleases.length === 0) return null;

  const personalCount = personalReleases.length;
  return (
    <ReleaseSwitcher
      personal={personalReleases}
      popular={releases}
      defaultTab={personalCount >= PERSONAL_DEFAULT_MIN ? "personal" : "popular"}
      showHint={personalCount < PERSONAL_DEFAULT_MIN}
      railProps={railProps}
      tabLabels={{ personal: t("releasesTabPersonal"), popular: t("releasesTabPopular") }}
      tablistLabel={t("releasesTabsLabel")}
      hint={t("releasesFollowHint")}
      hintCta={t("releasesFollowCta")}
    />
  );
}
