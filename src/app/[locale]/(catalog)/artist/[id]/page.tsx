import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ensureArtistMemberships, getArtistById, getArtistMemberships } from "@/services/catalog/ingest-artist";
import { findOrIngestDiscography } from "@/services/catalog/ingest-discography";
import { ArtistHeader } from "@/components/catalog/ArtistHeader";
import { AlbumGrid } from "@/components/catalog/AlbumGrid";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { isValidUuid } from "@/lib/validation";
import type { ReleaseGroupRow } from "@/db/schema";
import type { Artist, ReleaseGroup, ReleaseGroupCategory } from "@/lib/api/schemas";
import { ArtistMemberships } from "@/components/catalog/ArtistMemberships";
import { Comments } from "@/components/social/Comments";
import { MarkAsListened } from "@/components/diary/MarkAsListened";
import { FavoriteButton } from "@/components/favorites/FavoriteButton";
import { FollowArtistButton } from "@/components/catalog/FollowArtistButton";
import { AddToListButton } from "@/components/lists/AddToListButton";
import { ShowInListsButton } from "@/components/lists/ShowInListsButton";
import { ViewAllListsLink } from "@/components/lists/ViewAllListsLink";
import { resolveSession } from "@/services/auth/sessions";
import { getUserPermissions } from "@/services/auth/authorization";
import { listComments, resolveSocialTarget } from "@/services/social";
import { isFollowingArtist } from "@/services/social/artist-following";
import { isFavorited } from "@/services/favorites/favorites";

interface ArtistPageProps {
  params: Promise<{ id: string }>;
}

// `generateMetadata` y `page` resuelven el mismo artista en el mismo request.
// `React.cache` deduplica la consulta (getArtistById → DB, y enriquecimiento
// contra MusicBrainz solo ocurre una vez aunque la primera llamada lo deje
// en un tipo distinto de 'unknown').
const getArtistCached = cache(async (id: string) => getArtistById(id));

// Genera el <title> con el nombre del artista (dato de MusicBrainz, no se
// traduce). El resto de la página usa las etiquetas del namespace `artist`.
export async function generateMetadata({ params }: ArtistPageProps): Promise<Metadata> {
  const { id } = await params;
  if (!isValidUuid(id)) return {};
  const artist = await getArtistCached(id);
  return artist ? { title: artist.name } : {};
}

export default async function ArtistPage({ params }: ArtistPageProps) {
  const { id } = await params;
  const t = await getTranslations("catalog");
  const tCommon = await getTranslations("common");

  if (!isValidUuid(id)) notFound();

  // `getArtistById` enriquece artistas stub (`type='unknown'`) contra
  // MusicBrainz antes de devolverlos; si el id no existe devuelve null.
  const artist = await getArtistCached(id);
  if (!artist) notFound();

  await ensureArtistMemberships(artist);
  const session = await resolveSession();
  const canModerate = session?.user
    ? (await getUserPermissions(session.user.id)).includes("moderation.suspend_social")
    : false;
  const [releaseGroups, memberships, following, favorited] = await Promise.all([
    findOrIngestDiscography(artist),
    getArtistMemberships(artist),
    session ? isFollowingArtist(session.user.id, artist.id) : Promise.resolve(false),
    session ? isFavorited({ type: "artist", id: artist.id }, session.user.id) : Promise.resolve(false),
  ]);
  // La página de artista ya no expone rating de estrellas (openspec:
  // rebalance-catalog-detail-pages, D7): solo se cargan las notas de la
  // comunidad. El modelo sigue aceptando ratings de artista; la página no.
  const socialTarget = await resolveSocialTarget("artist", artist.id);
  const comments = await listComments(socialTarget);

  const typeLabel = t(`artist.typeLabels.${artist.type as Artist["type"]}`);
  const categoryLabels = {
    studio: t("artist.categories.studio"),
    single_ep: t("artist.categories.single_ep"),
    compilation: t("artist.categories.compilation"),
    live_other: t("artist.categories.live_other"),
  } satisfies Record<ReleaseGroupCategory, string>;

  // Los servicios devuelven filas de la base; el perfil las mapea al
  // contrato del frontend (createdAt como ISO string, categoría acotada
  // al enum que el CHECK de la tabla ya garantiza).
  const albums: ReleaseGroup[] = releaseGroups.map((rg: ReleaseGroupRow) => ({
    id: rg.id,
    mbid: rg.mbid,
    title: rg.title,
    category: rg.category as ReleaseGroupCategory,
    firstReleaseDate: rg.firstReleaseDate,
    firstReleaseYear: rg.firstReleaseYear,
    createdAt: rg.createdAt.toISOString(),
  }));

  return (
    <main className="flex min-h-screen flex-col items-start gap-8 px-4 py-12">
      <Breadcrumbs
        items={[
          { label: tCommon("home"), href: "/" },
          { label: artist.name },
        ]}
      />
      <ArtistHeader
        artist={artist}
        typeLabel={typeLabel}
        noPhotoAlt={t("artist.noPhotoAlt")}
      />
      {/* Discografía-forward (openspec: rebalance-catalog-detail-pages, D6):
          la obra es lo primero, antes de acciones, membresías y notas. */}
      <AlbumGrid
        releaseGroups={albums}
        categoryLabels={categoryLabels}
        discographyHeading={t("artist.discographyHeading")}
        coverLabel={t("artist.albumCoverLabel")}
        authenticated={Boolean(session?.user.id)}
      />
      <div className="flex flex-col items-start gap-3">
        <FollowArtistButton
          artistId={artist.id}
          authenticated={Boolean(session?.user.id)}
          initialFollowing={following}
        />
        <MarkAsListened target={{ type: "artist", id: artist.id }} authenticated={Boolean(session?.user.id)} />
        <FavoriteButton target={{ type: "artist", id: artist.id }} authenticated={Boolean(session?.user.id)} initialActive={favorited} />
        <AddToListButton target={{ type: "artist", id: artist.id }} authenticated={Boolean(session?.user.id)} />
        <ShowInListsButton target={{ type: "artist", id: artist.id }} authenticated={Boolean(session?.user.id)} />
        <ViewAllListsLink target={{ type: "artist", id: artist.id }} />
      </div>
      <ArtistMemberships
        memberships={memberships}
        heading={artist.type === "group" ? t("artist.membersHeading") : t("artist.membershipsHeading")}
        roleLabel={t("artist.memberRole")}
        periodLabel={t("artist.memberPeriod")}
        openPeriod={t("artist.memberPeriodOpen")}
        unknownPeriod={t("artist.memberPeriodUnknown")}
      />
      <div className="w-full max-w-3xl">
        <Comments
          target="artist"
          targetId={artist.id}
          initial={comments}
          authenticated={Boolean(session?.user.id)}
          userId={session?.user.id}
          canModerate={canModerate}
          variant="notes"
        />
      </div>
    </main>
  );
}
