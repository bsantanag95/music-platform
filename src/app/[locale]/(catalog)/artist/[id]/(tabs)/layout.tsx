import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArtistMemberships } from "@/components/catalog/ArtistMemberships";
import { ArtistCommunity } from "@/components/artist/ArtistCommunity";
import { ArtistFacts, ArtistIdentity, ArtistPhoto, ArtistPhotoCreditMobile, ArtistSummary } from "@/components/artist/ArtistHeader";
import { ArtistRelationPanel } from "@/components/artist/ArtistRelationPanel";
import { ArtistTabs } from "@/components/artist/ArtistTabs";
import { itemListsHref } from "@/components/lists/lists-shared";
import { Comments } from "@/components/social/Comments";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { isValidUuid } from "@/lib/validation";
import type { ReleaseGroup, ReleaseGroupCategory } from "@/lib/api/schemas";
import { getArtistMemberships } from "@/services/catalog/ingest-artist";
import { readArtistDiscography } from "@/services/catalog/ingest-discography";
import { isCoverResolved } from "@/services/catalog/cover-resolution";
import { scheduleArtistProfileRefresh } from "@/services/catalog/artist-profile-sync";
import type { ProfileLocale } from "@/services/catalog/artist-profile-read";
import { listComments, resolveSocialTarget } from "@/services/social";
import {
  loadArtist,
  loadCanModerate,
  loadCommunityStats,
  loadDiscography,
  loadPersonalState,
  loadProfile,
  loadSession,
} from "../artist-data";

// Layout común de la página de artista (openspec: redesign-artist-page, design D1): la
// cabecera (foto, identidad, ficha, resumen, comunidad y panel "Tu relación"), la barra de
// pestañas, los integrantes y las notas se renderizan una vez; cada pestaña es un segmento
// propio. En escritorio el panel ocupa una columna lateral solo a la altura de la cabecera.

interface ArtistLayoutProps {
  children: ReactNode;
  params: Promise<{ id: string }>;
}

type ArtistType = "person" | "group" | "various" | "unknown";

export async function generateMetadata({ params }: ArtistLayoutProps): Promise<Metadata> {
  const { id } = await params;
  if (!isValidUuid(id)) return {};
  const artist = await loadArtist(id);
  return artist ? { title: artist.name } : {};
}

export default async function ArtistLayout({ children, params }: ArtistLayoutProps) {
  const { id } = await params;
  if (!isValidUuid(id)) notFound();
  const artist = await loadArtist(id);
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

  const [discography, profile, stats, personal, memberships, comments, canModerate] = await Promise.all([
    loadDiscography(artist.id),
    loadProfile(artist.id, locale),
    loadCommunityStats(artist.id),
    userId ? loadPersonalState(userId, artist.id) : Promise.resolve(null),
    getArtistMemberships(artist),
    listComments(socialTarget),
    userId ? loadCanModerate(userId) : Promise.resolve(false),
  ]);
  if (!profile) notFound();

  // Discografía propia en el formato del modal de inicio del recorrido (solo con sesión y sin
  // recorrido: es lo único que la usa).
  const journeyAlbums: ReleaseGroup[] =
    personal && !personal.journey
      ? (await readArtistDiscography(artist.id))
          .filter((row) => row.creditRole === "primary")
          .map((row) => ({
            id: row.id,
            mbid: row.mbid,
            title: row.title,
            category: row.category as ReleaseGroupCategory,
            firstReleaseDate: row.firstReleaseDate,
            firstReleaseYear: row.firstReleaseYear,
            createdAt: row.createdAt.toISOString(),
            coverThumbUrl: row.coverThumbUrl,
            coverResolved: isCoverResolved(row),
          }))
      : [];
  const categoryLabels = {
    studio: t("categories.studio"),
    single_ep: t("categories.single_ep"),
    compilation: t("categories.compilation"),
    live_other: t("categories.live_other"),
  } satisfies Record<ReleaseGroupCategory, string>;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:py-12">
      <Breadcrumbs items={[{ label: tCommon("home"), href: "/" }, { label: artist.name }]} />

      <header className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
        <div className="flex min-w-0 flex-col gap-5">
          <div className="flex items-start gap-4 sm:gap-6">
            <ArtistPhoto name={artist.name} photo={profile.photo} />
            <div className="flex min-w-0 flex-1 flex-col gap-4">
              <ArtistIdentity type={type} name={artist.name} description={profile.description} />
              <div className="hidden sm:block">
                <ArtistFacts type={type} profile={profile} firstMainYear={discography?.firstMainYear ?? null} />
              </div>
            </div>
          </div>
          <ArtistPhotoCreditMobile photo={profile.photo} />
          <div className="sm:hidden">
            <ArtistFacts type={type} profile={profile} firstMainYear={discography?.firstMainYear ?? null} />
          </div>
          <ArtistSummary artistId={artist.id} summary={profile.summary} />
          <div className="hidden lg:block">
            <ArtistCommunity stats={stats} listsHref={itemListsHref({ type: "artist", id: artist.id })} />
          </div>
        </div>
        <ArtistRelationPanel
          artistId={artist.id}
          artistName={artist.name}
          state={personal}
          journeyAlbums={journeyAlbums}
          categoryLabels={categoryLabels}
        />
        <div className="lg:hidden">
          <ArtistCommunity stats={stats} listsHref={itemListsHref({ type: "artist", id: artist.id })} />
        </div>
      </header>

      <div className="flex flex-col gap-6">
        <ArtistTabs artistId={artist.id} hasBiography={profile.summary !== null} />
        {children}
      </div>

      <ArtistMemberships
        memberships={memberships}
        heading={artist.type === "group" ? t("membersHeading") : t("membershipsHeading")}
        roleLabel={t("memberRole")}
        periodLabel={t("memberPeriod")}
        openPeriod={t("memberPeriodOpen")}
        unknownPeriod={t("memberPeriodUnknown")}
      />

      <div className="w-full max-w-3xl">
        <Comments
          target="artist"
          targetId={artist.id}
          initial={comments}
          authenticated={Boolean(userId)}
          userId={userId ?? undefined}
          canModerate={canModerate}
          variant="notes"
        />
      </div>
    </main>
  );
}
