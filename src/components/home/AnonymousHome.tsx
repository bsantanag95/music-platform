import { CommunityActivity } from "@/components/home/CommunityActivity";
import { PublicLists } from "@/components/home/PublicLists";
import { AnonHero } from "@/components/home/AnonHero";
import { HowItWorks } from "@/components/home/HowItWorks";
import { HomeReleases } from "@/components/home/HomeReleases";
import { PopularComments } from "@/components/home/PopularComments";
import { AnonCta } from "@/components/home/AnonCta";
import {
  listCommunityActivity,
  listHomeReleases,
  listPopularComments,
  listPublicLists,
  listRecentCoverArt,
} from "@/services/home/home";

// Inicio del visitante anónimo: hero visual + propuesta de valor + carrusel de
// funcionalidades + CTA de registro, con los bloques de la comunidad como
// prueba social en layout compacto. Ver docs/05-features/home.md.
export async function AnonymousHome() {
  // Prueba social, no contenido central: top-N más corto y layout compacto.
  const previewLimit = 6;

  const [communityActivity, publicLists, recentCoverArt, popularComments, homeReleases] =
    await Promise.all([
      listCommunityActivity(null, previewLimit),
      listPublicLists(null, previewLimit),
      listRecentCoverArt(),
      listPopularComments(),
      listHomeReleases(),
    ]);

  const heroCovers = Array.from(
    new Set([
      ...recentCoverArt,
      ...communityActivity
        .map((entry) => entry.target.coverThumbUrl)
        .filter((url): url is string => Boolean(url)),
    ]),
  );

  return (
    <main className="flex min-h-screen flex-col items-center gap-12 overflow-x-clip px-4 py-12">
      <AnonHero covers={heroCovers} />

      <div className="grid w-full max-w-3xl gap-8 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        <CommunityActivity entries={communityActivity} />
        <PublicLists entries={publicLists} />
      </div>

      <PopularComments comments={popularComments} />

      <HomeReleases releases={homeReleases} />

      <HowItWorks />
      <AnonCta />
    </main>
  );
}
