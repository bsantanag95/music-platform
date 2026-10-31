import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { GenreChips } from "@/components/genres/GenreChips";
import { getArtistGenres } from "@/services/genres/display";
import { ArtistCommunity } from "@/components/artist/ArtistCommunity";
import { ArtistFacts, ArtistIdentity, ArtistPhoto, ArtistPhotoCreditMobile, ArtistSummary } from "@/components/artist/ArtistHeader";
import { ArtistRelationPanel } from "@/components/artist/ArtistRelationPanel";
import { ArtistTabs, HiddenOnTab } from "@/components/artist/ArtistTabs";
import { ARTIST_TABS_ANCHOR, lineupFact, lineupTabOf } from "@/components/artist/lineup-fact";
import { itemListsHref } from "@/components/lists/lists-shared";
import { Comments } from "@/components/social/Comments";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
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
  loadLineup,
  loadPersonalState,
  loadProfile,
  loadSession,
} from "../artist-data";
import { withClientMessages } from "@/i18n/client-messages";

// Layout común de la página de artista (openspec: redesign-artist-page, design D1): la
// cabecera (foto, identidad, ficha, resumen, comunidad y panel "Tu relación"), la barra de
// pestañas y las notas se renderizan una vez (los integrantes tienen su pestaña, openspec:
// add-artist-members-tab); cada pestaña es un segmento
// propio. En escritorio el panel ocupa una columna lateral solo a la altura de la cabecera.

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
  return artist ? { title: artist.name } : {};
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

  const [discography, profile, stats, personal, lineup, comments, canModerate, artistGenres] = await Promise.all([
    loadDiscography(artist.id),
    loadProfile(artist.id, locale),
    loadCommunityStats(artist.id),
    userId ? loadPersonalState(userId, artist.id) : Promise.resolve(null),
    loadLineup(artist.id),
    listComments(socialTarget, 1, 20, userId),
    userId ? loadCanModerate(userId) : Promise.resolve(false),
    getArtistGenres(artist.id),
  ]);
  if (!profile) notFound();

  const fact = lineupFact(lineup, artist.id, artist.name);
  const categoryLabels = {
    studio: t("categories.studio"),
    single_ep: t("categories.single_ep"),
    compilation: t("categories.compilation"),
    live_other: t("categories.live_other"),
  } satisfies Record<ReleaseGroupCategory, string>;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:py-12">
      <Breadcrumbs items={[{ label: tCommon("home"), href: "/" }, { label: artist.name }]} />

      <header className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-stretch">
        <div className="flex min-w-0 flex-col gap-5">
          <div className="flex items-start gap-4 sm:gap-6">
            <ArtistPhoto name={artist.name} photo={profile.photo} />
            <div className="flex min-w-0 flex-1 flex-col gap-4">
              <ArtistIdentity type={type} name={artist.name} description={profile.description} />
              <GenreChips genres={artistGenres.genres} />
              <div className="hidden sm:block">
                <ArtistFacts type={type} profile={profile} firstMainYear={discography?.firstMainYear ?? null} lineup={fact} />
              </div>
            </div>
          </div>
          <ArtistPhotoCreditMobile photo={profile.photo} />
          <div className="sm:hidden">
            <ArtistFacts type={type} profile={profile} firstMainYear={discography?.firstMainYear ?? null} lineup={fact} />
          </div>
          <HiddenOnTab tab="biography">
            <ArtistSummary artistId={artist.id} artistName={artist.name} summary={profile.summary} />
          </HiddenOnTab>
          <div className="hidden lg:block">
            <ArtistCommunity stats={stats} listsHref={itemListsHref({ type: "artist", id: artist.id })} />
          </div>
        </div>
        <ArtistRelationPanel
          artistId={artist.id}
          artistName={artist.name}
          state={personal}
          categoryLabels={categoryLabels}
        />
        <div className="lg:hidden">
          <ArtistCommunity stats={stats} listsHref={itemListsHref({ type: "artist", id: artist.id })} />
        </div>
      </header>

      {/* Alturas de las barras fijas: el encabezado del sitio y las pestañas (openspec: refine-artist-page-phase2, D4). */}
      <div
        id={ARTIST_TABS_ANCHOR}
        className="flex scroll-mt-[var(--site-header-h)] flex-col gap-6 [--artist-sticky-top:calc(var(--site-header-h)+var(--artist-tabs-h))] [--artist-tabs-h:2.375rem] [--site-header-h:3.625rem]"
      >
        <ArtistTabs
          artistId={artist.id}
          artistName={artist.name}
          hasBiography={profile.summary !== null}
          lineupTab={lineupTabOf(lineup)}
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
    </main>
  );
}

export default withClientMessages("(catalog)/artist/[id]/(tabs)/layout", ArtistLayout);
