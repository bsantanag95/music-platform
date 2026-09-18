import { getTranslations } from "next-intl/server";
import { listUserDiary } from "@/services/diary/diary";
import { listUserFavorites } from "@/services/favorites/favorites";
import { listUserLists } from "@/services/lists/lists";
import { listProfileCollection } from "@/services/collection/collection";
import { getTasteFingerprint } from "@/services/profiles/stats";
import { getShowcase } from "@/services/profiles/showcase";
import {
  getAlbumFavorites,
  getProfileAlbumFavorites,
} from "@/services/profiles/album-favorites";
import { getProfileInRotation } from "@/services/profiles/in-rotation";
import { getProfileReviews } from "@/services/profiles/reviews";
import { listProfileFollowedArtists } from "@/services/profiles/exploration";
import { getProfileRecency } from "@/services/profiles/recency";
import { getProfileAffinity } from "@/services/profiles/affinity";
import { getProfileRatingHighlights } from "@/services/rating-highlights/rating-highlights";
import { countPendingFollowRequests } from "@/services/social/following";
import type { ProfileView } from "@/services/profiles/profile-view";
import { ProfileAffinity } from "@/components/profiles/ProfileAffinity";
import { OwnerHubPanel } from "@/components/profiles/OwnerHubPanel";
import { OwnerIdentityEditor } from "@/components/profiles/OwnerIdentityEditor";
import { OwnerLinksEditor } from "@/components/profiles/OwnerLinksEditor";
import { OwnerShowcaseEditor } from "@/components/profiles/OwnerShowcaseEditor";
import { OwnerAlbumFavoritesEditor } from "@/components/profiles/OwnerAlbumFavoritesEditor";
import { OwnerIdentityCardEditor } from "@/components/profiles/OwnerIdentityCardEditor";
import { FingerprintSummary } from "@/components/profiles/FingerprintSummary";
import { AlbumFavorites } from "@/components/profiles/AlbumFavorites";
import { ProfileReviews } from "@/components/profiles/ProfileReviews";
import { RatingHighlights } from "@/components/profiles/RatingHighlights";
import { InRotation } from "@/components/profiles/InRotation";
import { ExploreSection } from "@/components/profiles/ExploreSection";
import { PinnedShowcase } from "@/components/profiles/PinnedShowcase";
import { IdentityCard } from "@/components/profiles/IdentityCard";
import { ProfileLevel3Links } from "@/components/profiles/ProfileLevel3Links";
import { ProfileRail } from "@/components/profiles/ProfileRail";
import { ProfileRecency } from "@/components/profiles/ProfileRecency";
import { DiaryList } from "@/components/diary/DiaryList";
import { FavoritesWall } from "@/components/favorites/FavoritesWall";
import { ListsList } from "@/components/lists/ListsList";
import { CollectionShelf } from "@/components/collection/CollectionShelf";

// Secciones asíncronas del perfil, cada una envuelta por su propio <Suspense>
// en `page.tsx` para que nada bloquee la Placa. Un estante colapsa cuando no
// tiene contenido visible y el visitante no es el dueño (spec social-profiles,
// "Estante de contenido vacío"); el dueño ve el estante vacío para agregar.

export interface SectionProps {
  username: string;
  viewerId: string | null;
  isOwn: boolean;
}

function EmptyRailForOwner({ label, message }: { label: string; message: string }) {
  return (
    <ProfileRail label={label}>
      <p className="font-body text-sm text-paper-muted">{message}</p>
    </ProfileRail>
  );
}

export async function HubSection({ ownerId, username }: { ownerId: string; username: string }) {
  return <OwnerHubPanel username={username} pendingRequests={await countPendingFollowRequests(ownerId)} />;
}

export async function OwnerEditors({ profile }: { profile: ProfileView }) {
  const [showcase, albumFavorites] = await Promise.all([
    getShowcase(profile.id),
    getAlbumFavorites(profile.id, ["private", "followers", "public"]),
  ]);
  return (
    <section className="flex w-full max-w-2xl flex-col gap-6 rounded-lg border border-ink-border bg-ink-surface p-6">
      <OwnerIdentityCardEditor initial={showcase.identityCard} />
      <OwnerIdentityEditor
        initial={{
          bio: profile.bio,
          pronouns: profile.pronouns,
          location: profile.location,
          timezone: profile.timezone,
        }}
      />
      <OwnerLinksEditor initialLinks={profile.links} />
      <OwnerShowcaseEditor initial={showcase} />
      <OwnerAlbumFavoritesEditor initial={albumFavorites} identityCard={showcase.identityCard} />
    </section>
  );
}

// La sección de identidad cultural: los álbumes que definen a esta persona,
// arriba de los destacados. Se rinde en los niveles autorizado y dueño; el
// componente colapsa si el conjunto visible está vacío
// (spec profile-album-identity). Recibe `ownerId` además de username/viewerId
// para poder excluir el álbum definitorio (openspec: rework-user-profile) —
// ese vive en la Tarjeta de Identidad, no se repite acá.
export async function AlbumFavoritesSection({
  username,
  viewerId,
  ownerId,
}: Omit<SectionProps, "isOwn"> & { ownerId: string }) {
  const [albums, { identityCard }] = await Promise.all([
    getProfileAlbumFavorites(username, viewerId),
    getShowcase(ownerId),
  ]);
  return <AlbumFavorites albums={albums} identityCard={identityCard} />;
}

// "Reseñas": las reseñas de álbum más recientes del dueño. Clúster de
// identidad cultural — se rinde en los niveles autorizado y dueño, después de
// los destacados y antes de "En rotación". Automática, no curada.
// `getProfileReviews` devuelve null (y la sección no aparece) sin acceso o sin
// reseñas (spec profile-reviews).
export async function FeaturedReviewsSection({
  username,
  viewerId,
}: Omit<SectionProps, "isOwn">) {
  return <ProfileReviews data={await getProfileReviews(username, viewerId)} />;
}

// "En rotación": qué está sonando últimamente, derivado del diario. Se rinde
// en los niveles autorizado y dueño, entre los destacados y la huella de
// gusto. `getProfileInRotation` devuelve null (y la sección no aparece) sin
// acceso o sin actividad que alcance el umbral (spec profile-in-rotation).
export async function InRotationSection({
  username,
  viewerId,
}: Omit<SectionProps, "isOwn">) {
  const data = await getProfileInRotation(username, viewerId);
  return data ? <InRotation data={data} /> : null;
}

// "Exploración": los artistas que el dueño sigue, en el Nivel 2. Único
// momento visualmente "alto" del perfil (openspec: rework-user-profile) — de
// ahí que además reciba el subconjunto de artistas seguidos en común con el
// visitante (ya calculado por el bloque de afinidad, `cache()` evita la
// doble consulta) para marcarlos con la insignia "tú también". No aparece si
// el dueño no sigue a ningún artista (spec artist-following).
export async function ExplorationSection({
  username,
  viewerId,
}: Omit<SectionProps, "isOwn">) {
  const [artists, affinity] = await Promise.all([
    listProfileFollowedArtists(username, viewerId),
    getProfileAffinity(username, viewerId),
  ]);
  const sharedArtistIds = affinity
    ? new Set(affinity.sharedFollowedArtists.map((entity) => entity.id))
    : undefined;
  return <ExploreSection artists={artists} sharedArtistIds={sharedArtistIds} />;
}

// Tarjeta de Identidad — Nivel 1 (openspec: rework-user-profile): el artista y
// el álbum marcados "me define" entre los destacados, más el himno. Sustituye
// al antiguo `AnthemSection` en la barra lateral: el himno solo ya no alcanza
// para representar "quién es esta persona" en el primer vistazo.
export async function IdentityCardSection({ ownerId }: { ownerId: string }) {
  const { identityCard } = await getShowcase(ownerId);
  return <IdentityCard identityCard={identityCard} />;
}

export async function PinnedSection({ ownerId }: { ownerId: string }) {
  const { pinned, identityCard } = await getShowcase(ownerId);
  return pinned.length > 0 ? <PinnedShowcase pinned={pinned} identityCard={identityCard} /> : null;
}

// "Valoraciones destacadas" — Nivel 2 (spec `rating-highlights`): curaduría
// consciente, visible más allá de la relación de seguimiento del visitante.
export async function RatingHighlightsSection({
  username,
  viewerId,
}: Omit<SectionProps, "isOwn">) {
  const highlights = await getProfileRatingHighlights(username, viewerId);
  return <RatingHighlights highlights={highlights} />;
}

// Resumen cualitativo de la huella de gusto — Nivel 1-2 (spec
// `taste-fingerprint`, "Resumen cualitativo"): hasta 3 frases, sin gráficos.
// La huella completa (curvas, crestas) vive en /users/[username]/fingerprint.
export async function FingerprintSummarySection({
  username,
  viewerId,
}: Omit<SectionProps, "isOwn">) {
  const fingerprint = await getTasteFingerprint(username, viewerId);
  if (!fingerprint) return null;
  return <FingerprintSummary summary={fingerprint.summary} />;
}

export async function RecencySection({ username, viewerId }: Omit<SectionProps, "isOwn">) {
  return <ProfileRecency at={await getProfileRecency(username, viewerId)} />;
}

export async function AffinitySection({ username, viewerId }: Omit<SectionProps, "isOwn">) {
  const affinity = await getProfileAffinity(username, viewerId);
  if (!affinity) return null;
  return <ProfileAffinity affinity={affinity} />;
}

export async function DiaryRail({ username, viewerId, isOwn }: SectionProps) {
  const t = await getTranslations("users");
  const tDiary = await getTranslations("diary");
  const initial = await listUserDiary(username, viewerId, 1, 20);
  if (initial.entries.length === 0) {
    return isOwn ? <EmptyRailForOwner label={t("diaryTitle")} message={t("railEmptyOwn")} /> : null;
  }
  return (
    <ProfileRail id="diario" label={t("diaryTitle")} count={initial.entries.length}>
      <DiaryList
        initial={initial}
        readOnly
        empty={{ title: tDiary("profileEmptyTitle"), description: tDiary("profileEmptyDescription") }}
      />
    </ProfileRail>
  );
}

export async function FavoritesRail({ username, viewerId, isOwn }: SectionProps) {
  const t = await getTranslations("users");
  const initial = await listUserFavorites(username, viewerId, 1, 20);
  if (initial.favorites.length === 0) {
    return isOwn ? (
      <EmptyRailForOwner label={t("favoritesTitle")} message={t("railEmptyOwn")} />
    ) : null;
  }
  return (
    <ProfileRail id="favoritos" label={t("favoritesTitle")} count={initial.favorites.length}>
      <FavoritesWall initial={initial} readOnly username={username} />
    </ProfileRail>
  );
}

export async function ListsRail({ username, viewerId, isOwn }: SectionProps) {
  const t = await getTranslations("users");
  const tLists = await getTranslations("lists");
  const initial = await listUserLists(username, viewerId, 1, 20);
  if (initial.lists.length === 0) {
    return isOwn ? <EmptyRailForOwner label={t("listsTitle")} message={t("railEmptyOwn")} /> : null;
  }
  return (
    <ProfileRail id="listas" label={t("listsTitle")} count={initial.lists.length}>
      <ListsList
        initial={initial}
        username={username}
        empty={{ title: tLists("profileEmptyTitle"), description: tLists("profileEmptyDescription") }}
      />
    </ProfileRail>
  );
}

export async function CollectionRail({ username, viewerId, isOwn }: SectionProps) {
  const t = await getTranslations("users");
  const initial = await listProfileCollection(username, viewerId, 1, 20);
  if (initial.entries.length === 0) {
    return isOwn ? (
      <EmptyRailForOwner label={t("collectionTitle")} message={t("railEmptyOwn")} />
    ) : null;
  }
  return (
    <ProfileRail id="coleccion" label={t("collectionTitle")} count={initial.entries.length}>
      <CollectionShelf initial={initial} readOnly username={username} />
    </ProfileRail>
  );
}

// Puertas al Nivel 3 (spec `social-profiles`): comprueba livianamente qué
// estantes tienen contenido para no enlazar a un ancla vacía. Independiente
// y con su propio <Suspense> en `page.tsx`, igual que el resto de las
// secciones — no bloquea ni depende de los estantes que referencia.
export async function Level3LinksSection({ username, viewerId }: Omit<SectionProps, "isOwn">) {
  const [diary, favorites, lists, collection, fingerprint] = await Promise.all([
    listUserDiary(username, viewerId, 1, 1),
    listUserFavorites(username, viewerId, 1, 1),
    listUserLists(username, viewerId, 1, 1),
    listProfileCollection(username, viewerId, 1, 1),
    getTasteFingerprint(username, viewerId),
  ]);

  return (
    <ProfileLevel3Links
      username={username}
      has={{
        diary: diary.entries.length > 0,
        favorites: favorites.favorites.length > 0,
        lists: lists.lists.length > 0,
        collection: collection.entries.length > 0,
      }}
      hasFingerprint={Boolean(fingerprint)}
    />
  );
}
