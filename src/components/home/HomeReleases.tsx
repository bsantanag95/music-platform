import { getLocale, getTranslations } from "next-intl/server";
import { ReleaseSwitcher } from "./ReleaseSwitcher";
import { ReleaseTimetable } from "./ReleaseTimetable";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { PERSONAL_DEFAULT_MIN } from "@/services/home/release-calendar";
import type { HomeRelease } from "@/services/home/home";

// Apartado de Inicio «Lanzamientos recientes y próximos» como horario de dos partes (openspec:
// redesign-anon-home-phase3; con sesión, redesign-signed-in-home-phase3). Los datos salen del calendario de
// lanzamientos (ListenBrainz, ver docs/05-features/home.md).
//
// Sin sesión (`personalReleases` ausente) se muestra solo la selección popular. Con sesión se suma el
// selector «De tus artistas | Populares» (`ReleaseSwitcher`): dos vistas con orientación propia que no se
// mezclan; abre en la personal si tiene al menos `PERSONAL_DEFAULT_MIN` discos y, si no, en la popular con
// la invitación a seguir artistas.
export async function HomeReleases({
  releases,
  personalReleases,
}: {
  releases: HomeRelease[];
  personalReleases?: HomeRelease[];
}) {
  if (personalReleases !== undefined) {
    // Sin calendario (nunca sincronizado) y sin discos propios no hay nada que mostrar ni que invitar.
    if (releases.length === 0 && personalReleases.length === 0) return null;
    const personalCount = personalReleases.length;
    return (
      <ReleaseSwitcher
        personal={personalReleases}
        popular={releases}
        defaultTab={personalCount >= PERSONAL_DEFAULT_MIN ? "personal" : "popular"}
        showHint={personalCount < PERSONAL_DEFAULT_MIN}
      />
    );
  }

  if (releases.length === 0) return null;
  const [t, locale] = await Promise.all([getTranslations("home"), getLocale()]);
  return (
    <section aria-labelledby="home-releases" className="flex flex-col gap-6">
      <SectionHeading id="home-releases" title={t("releasesTitle")} description={t("releasesDescription")} />
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
