import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { GenreChips } from "@/components/genres/GenreChips";
import { getArtistGenres } from "@/services/genres/display";
import { getArtistAwards } from "@/services/awards/artist-awards";
import { artistHref } from "@/lib/catalog-links";
import { ArtistCommunity, hasCommunity } from "@/components/artist/ArtistCommunity";
import { ArtistFacts, ArtistFollowInvite, ArtistIdentity, ArtistPhotoCredit, ArtistPortrait } from "@/components/artist/ArtistHeader";
import { ArtistStage } from "@/components/artist/ArtistStage";
import { stageBackdrop, stageCovers, stagePortrait } from "@/components/artist/artist-stage";
import { ArtistRelationPanel } from "@/components/artist/ArtistRelationPanel";
import { ArtistTabs } from "@/components/artist/ArtistTabs";
import { ARTIST_TABS_ANCHOR, lineupFact, lineupTabOf } from "@/components/artist/lineup-fact";
import { itemListsHref } from "@/components/lists/lists-shared";
import { Comments } from "@/components/social/Comments";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ShareAction } from "@/components/share/ShareAction";
import { DISCOGRAPHY_MIN_DISCS } from "@/lib/laminas/discography";
import { parseCatalogSegment } from "@/lib/slug";
import type { ReleaseGroupCategory } from "@/lib/api/schemas";
import { scheduleArtistProfileRefresh } from "@/services/catalog/artist-profile-sync";
import type { ProfileLocale } from "@/services/catalog/artist-profile-read";
import { listComments, resolveSocialTarget } from "@/services/social";
import {
  loadArtist,
  loadCanModerate,
  loadCommunityStats,
  loadDiscography,
  loadDiscographyLaminaHref,
  loadLineup,
  loadPersonalState,
  loadProfile,
  loadSession,
} from "../artist-data";
import { withClientMessages } from "@/i18n/client-messages";
import { buildShareMetadata } from "@/services/share/metadata";

// Layout común de la página de artista (openspec: redesign-artist-page, design D1): la portada, la barra de pestañas y
// los comentarios se renderizan una vez; cada pestaña es un segmento propio. La portada (openspec:
// modernize-artist-page-phase1) va a todo el ancho con el fondo de carátulas, el retrato, la identidad, la ficha y la
// acción principal: «Seguir a {artista}» sin sesión o el panel «Tu relación» con sesión, en una columna a la derecha.

interface ArtistLayoutProps {
  children: ReactNode;
  params: Promise<{ id: string }>;
}

type ArtistType = "person" | "group" | "various" | "unknown";

export async function generateMetadata({ params }: ArtistLayoutProps): Promise<Metadata> {
  const { id } = await params;
  const parsed = parseCatalogSegment(id);
  if (!parsed) return {};
  const artist = await loadArtist(parsed.id);
  return artist ? { title: artist.name, ...(await buildShareMetadata("artist", parsed.id, await getLocale())) } : {};
}

async function ArtistLayout({ children, params }: ArtistLayoutProps) {
  const { id } = await params;
  const parsed = parseCatalogSegment(id);
  if (!parsed) notFound();
  const artist = await loadArtist(parsed.id);
  if (!artist) notFound();

  const t = await getTranslations("catalog.artist");
  const tCommon = await getTranslations("common");
  const locale = (await getLocale()) as ProfileLocale;
  const type = (["person", "group", "various", "unknown"].includes(artist.type) ? artist.type : "unknown") as ArtistType;

  // La ficha y Wikimedia se actualizan en segundo plano cada 30 días (enrich-artist-profile).
  scheduleArtistProfileRefresh(artist);
  const session = await loadSession();
  const userId = session?.user.id ?? null;
  const socialTarget = await resolveSocialTarget("artist", artist.id);

  const [discography, profile, stats, personal, lineup, comments, canModerate, artistGenres, awards] = await Promise.all([
    loadDiscography(artist.id),
    loadProfile(artist.id, locale),
    loadCommunityStats(artist.id),
    userId ? loadPersonalState(userId, artist.id) : Promise.resolve(null),
    loadLineup(artist.id),
    listComments(socialTarget, 1, 20, userId),
    userId ? loadCanModerate(userId) : Promise.resolve(false),
    getArtistGenres(artist.id),
    getArtistAwards(artist.id),
  ]);
  if (!profile) notFound();

  const fact = lineupFact(lineup, artist.id, artist.name);
  const awardsFact =
    awards.ceremonies.length > 0
      ? {
          wins: awards.wins,
          nominations: awards.nominations,
          inductions: awards.inductions,
          href: `${artistHref(artist.name, artist.id)}/awards#${ARTIST_TABS_ANCHOR}`,
        }
      : null;
  const discographyHref =
    session && (personal?.rated?.count ?? 0) >= DISCOGRAPHY_MIN_DISCS ? await loadDiscographyLaminaHref(session.user.username, session.user.id, artist.id) : null;
  const categoryLabels = {
    studio: t("categories.studio"),
    single_ep: t("categories.single_ep"),
    compilation: t("categories.compilation"),
    live_other: t("categories.live_other"),
  } satisfies Record<ReleaseGroupCategory, string>;

  const covers = stageCovers(discography);
  const backdrop = stageBackdrop(covers);
  const portrait = stagePortrait(profile.photo !== null, covers, discography?.bestRatedId ?? null, artist.name);
  const frame = "mx-auto w-full max-w-[88rem] px-4 sm:px-8 xl:px-12";

  return (
    <main className="flex min-h-screen w-full flex-col">
      <ArtistStage backdrop={backdrop} credit={<ArtistPhotoCredit photo={portrait.kind === "photo" ? profile.photo : null} />}>
        <div className={`${frame} flex min-h-[min(56vh,500px)] flex-col justify-between gap-7 pb-9 pt-6`}>
          <Breadcrumbs
            items={[{ label: tCommon("home"), href: "/" }, { label: artist.name }]}
            action={<ShareAction kind="artist" refId={artist.id} />}
          />
          <header className="grid grid-cols-1 items-end gap-7 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="flex min-w-0 flex-col items-start gap-4 sm:flex-row sm:items-end sm:gap-6">
              <ArtistPortrait name={artist.name} photo={profile.photo} portrait={portrait} />
              <div className="flex min-w-0 flex-1 flex-col gap-4">
                <ArtistIdentity name={artist.name} description={profile.description} />
                <ArtistFacts
                  type={type}
                  name={artist.name}
                  profile={profile}
                  firstMainYear={discography?.firstMainYear ?? null}
                  lineup={fact}
                  awards={awardsFact}
                  genres={artistGenres.genres.length > 0 ? <GenreChips genres={artistGenres.genres} /> : null}
                  community={
                    hasCommunity(stats) ? <ArtistCommunity stats={stats} listsHref={itemListsHref({ type: "artist", id: artist.id })} /> : null
                  }
                />
              </div>
            </div>
            {userId ? (
              <ArtistRelationPanel
                artistId={artist.id}
                artistName={artist.name}
                state={personal}
                discographyHref={discographyHref}
                categoryLabels={categoryLabels}
              />
            ) : (
              <ArtistFollowInvite name={artist.name} />
            )}
          </header>
        </div>
      </ArtistStage>

      <div className={`${frame} flex flex-col gap-8 pb-12 pt-2`}>
        {/* Alturas de las barras fijas: el encabezado del sitio y las pestañas (openspec: refine-artist-page-phase2, D4). */}
        <div
          id={ARTIST_TABS_ANCHOR}
          className="flex scroll-mt-[var(--site-header-h)] flex-col gap-6 [--artist-sticky-top:calc(var(--site-header-h)+var(--artist-tabs-h))] [--artist-tabs-h:2.375rem] [--site-header-h:3.625rem]"
        >
          <ArtistTabs
            artistId={artist.id}
            artistName={artist.name}
            hasBiography={profile.summary !== null}
            hasAwards={awards.ceremonies.length > 0}
            lineupTab={lineupTabOf(lineup)}
            hasConcerts={type === "group" || type === "person"}
          />
          {children}
        </div>

        <div className="w-full max-w-3xl">
          <Comments
            target="artist"
            targetId={artist.id}
            initial={comments}
            authenticated={Boolean(userId)}
            userId={userId ?? undefined}
            canModerate={canModerate}
            topics
          />
        </div>
      </div>
    </main>
  );
}

export default withClientMessages("(catalog)/artist/[id]/(tabs)/layout", ArtistLayout);
