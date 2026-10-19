import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { SectionHeader } from "@/components/discovery/SectionHeader";
import { PopularChart, type PopularChartItem } from "@/components/discovery/PopularChart";
import { ceremonyHref } from "@/components/awards/award-links";
import { GROUP_AWARDS_ON_HUB, groupAwards } from "@/components/awards/award-groups";
import { AwardTileGrid } from "@/components/awards/AwardTile";
import {
  MISSING_WINNERS_PARAM,
  MISSING_WINNERS_VALUE,
  RecentWinnersRail,
  type WinnersPersonal,
} from "@/components/awards/RecentWinnersRail";
import { artistHref } from "@/lib/catalog-links";
import { getCurrentUser } from "@/services/auth/authorization";
import { getWinnerMarks, missingWinners, winnerAlbumIds } from "@/services/awards/personal";
import { HallOfFameTileGrid } from "@/components/awards/HallOfFameTile";
import {
  listHallOfFameClasses,
  listLatestCeremoniesByAward,
  listMostAwardedArtists,
  listRecentHeadlineWinners,
} from "@/services/awards/read";

// Hub de premios (openspec: add-music-awards, design D5; redesign-awards-pages; add-four-music-awards, design D7;
// enrich-awards-hub). Con un solo premio no hay nada que elegir —la ceremonia ya trae la navegación por años—: redirige a su
// ceremonia más reciente. Con varios: una tarjeta por premio (la de Explorar, con años, ceremonias, quién vota y atajos a las
// ediciones anteriores), el muro "Ganadores recientes" y el ranking "Los más premiados", que cruza todos los premios y es lo
// único que no se ve desde ninguna ceremonia. Con sesión, los ganadores recientes suman la relación de la persona con ellos
// (openspec: add-awards-personal-progress): cuántos escuchó, su marca en cada carátula y el filtro "Te faltan".

interface AwardsIndexProps {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

/** Ceremonias por premio en el muro "Ganadores recientes" (con cinco premios, tres filas de cinco). */
const RECENT_WINNERS_PER_AWARD = 3;
/** Filas del ranking "Los más premiados": el n.º 1 grande y nueve a su lado, como "Popular ahora". */
const MOST_AWARDED_LIMIT = 10;
/** Por debajo de tres artistas el ranking no dice nada: no se muestra. */
const MOST_AWARDED_MIN_ROWS = 3;

export async function generateMetadata({ params }: AwardsIndexProps): Promise<Metadata> {
  await params;
  const t = await getTranslations("awards");
  return { title: t("pageTitle") };
}

export default async function AwardsIndexPage({ params, searchParams }: AwardsIndexProps) {
  const { locale } = await params;
  const query = (await searchParams) ?? {};
  const [ceremonies, halls] = await Promise.all([listLatestCeremoniesByAward(), listHallOfFameClasses()]);

  const [only] = ceremonies;
  if (ceremonies.length === 1 && only) {
    redirect({ href: ceremonyHref(only.awardSlug, only.year), locale });
  }

  const t = await getTranslations("awards");
  const tCommon = await getTranslations("common");
  const awardName = (slug: string) => (t.has(`names.${slug}`) ? t(`names.${slug}`) : slug);

  const [recentWinners, mostAwarded] =
    ceremonies.length > 0
      ? await Promise.all([listRecentHeadlineWinners(RECENT_WINNERS_PER_AWARD), listMostAwardedArtists(MOST_AWARDED_LIMIT)])
      : [[], []];
  const user = recentWinners.length > 0 ? await getCurrentUser() : null;
  let personal: WinnersPersonal | null = null;
  let shownWinners = recentWinners;
  if (user) {
    const albumIds = winnerAlbumIds(recentWinners);
    const marks = await getWinnerMarks(user.id, albumIds);
    const heardCount = albumIds.filter((id) => marks.heard.has(id)).length;
    const missingOnly = query[MISSING_WINNERS_PARAM] === MISSING_WINNERS_VALUE;
    personal = { ...marks, total: albumIds.length, heardCount, missingOnly };
    if (missingOnly) shownWinners = missingWinners(recentWinners, marks.heard);
  }
  const ceremonyTotal = ceremonies.reduce((sum, c) => sum + c.years.length, 0);
  const chartItems: PopularChartItem[] = mostAwarded.map((entry) => ({
    id: entry.id,
    href: artistHref(entry.name, entry.id),
    title: entry.name,
    subtitle: entry.awardSlugs.map(awardName).join(" · "),
    image: { src: entry.photoUrl, shape: "round" },
    figure: t("winsCount", { count: entry.wins }),
  }));

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col items-start gap-12 px-4 py-12">
      <div className="flex w-full flex-col gap-6">
        <Breadcrumbs items={[{ label: tCommon("home"), href: "/" }, { label: t("heading") }]} />
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-4xl text-paper">{t("heading")}</h1>
          {ceremonies.length > 0 ? (
            <p className="font-data text-sm text-paper-muted">
              {t("hubStats", { awards: ceremonies.length, ceremonies: ceremonyTotal })}
            </p>
          ) : null}
        </div>
      </div>

      {ceremonies.length === 0 && halls.length === 0 ? (
        <p className="font-body text-paper-muted">{t("emptyIndex")}</p>
      ) : ceremonies.length === 0 ? null : GROUP_AWARDS_ON_HUB ? (
        groupAwards(ceremonies).map(({ group, awards }) => (
          <section key={group} aria-labelledby={`grupo-${group}`} className="flex w-full flex-col gap-3">
            <h2 id={`grupo-${group}`} className="font-display text-xl text-paper">
              {t(`groups.${group}`)}
            </h2>
            <AwardTileGrid ceremonies={awards} detailed />
          </section>
        ))
      ) : (
        <AwardTileGrid ceremonies={ceremonies} detailed />
      )}

      <RecentWinnersRail winners={shownWinners} personal={personal} />

      {chartItems.length >= MOST_AWARDED_MIN_ROWS ? (
        <section aria-labelledby="mas-premiados" className="flex w-full flex-col gap-4">
          <SectionHeader heading={t("mostAwardedHeading")} description={t("mostAwardedDescription")} headingId="mas-premiados" />
          <PopularChart items={chartItems} label={t("mostAwardedHeading")} />
        </section>
      ) : null}

      {halls.length > 0 ? (
        <section id="salones-de-la-fama" aria-labelledby="salones-de-la-fama-heading" className="flex w-full scroll-mt-24 flex-col gap-3">
          <SectionHeader heading={t("hall.hubHeading")} description={t("hall.exploreDescription")} headingId="salones-de-la-fama-heading" />
          <HallOfFameTileGrid halls={halls} />
        </section>
      ) : null}
    </main>
  );
}
