import { getTranslations } from "next-intl/server";
import { listUserDiary } from "@/services/diary/diary";
import { listUserFavorites } from "@/services/favorites/favorites";
import { listUserLists } from "@/services/lists/lists";
import { listProfileCollection } from "@/services/collection/collection";
import { getTasteFingerprint } from "@/services/profiles/stats";
import { getShowcase } from "@/services/profiles/showcase";
import { getProfileRecency } from "@/services/profiles/recency";
import { getProfileAffinity } from "@/services/profiles/affinity";
import { countPendingFollowRequests } from "@/services/social/following";
import type { ProfileView } from "@/services/profiles/profile-view";
import { ProfileAffinity } from "@/components/profiles/ProfileAffinity";
import { OwnerHubPanel } from "@/components/profiles/OwnerHubPanel";
import { OwnerIdentityEditor } from "@/components/profiles/OwnerIdentityEditor";
import { OwnerLinksEditor } from "@/components/profiles/OwnerLinksEditor";
import { OwnerShowcaseEditor } from "@/components/profiles/OwnerShowcaseEditor";
import { TasteFingerprint } from "@/components/profiles/TasteFingerprint";
import { PinnedShowcase } from "@/components/profiles/PinnedShowcase";
import { AnthemStrip } from "@/components/profiles/AnthemStrip";
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

export async function HubSection({ ownerId }: { ownerId: string }) {
  return <OwnerHubPanel pendingRequests={await countPendingFollowRequests(ownerId)} />;
}

export async function OwnerEditors({ profile }: { profile: ProfileView }) {
  const showcase = await getShowcase(profile.id);
  return (
    <section className="flex w-full max-w-2xl flex-col gap-6 rounded-lg border border-ink-border bg-ink-surface p-6">
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
    </section>
  );
}

// El showcase (destacados + himno) se compone en dos secciones para el layout
// de dos columnas de la vista pública: los destacados van en la columna
// principal, el himno en la barra lateral. `getShowcase` está memoizada por
// request, así que no hay doble consulta.
export async function ShowcaseSection({ ownerId }: { ownerId: string }) {
  const showcase = await getShowcase(ownerId);
  if (showcase.pinned.length === 0 && !showcase.anthem) return null;
  return (
    <>
      {showcase.pinned.length > 0 && <PinnedShowcase pinned={showcase.pinned} />}
      {showcase.anthem && <AnthemStrip anthem={showcase.anthem} />}
    </>
  );
}

export async function PinnedSection({ ownerId }: { ownerId: string }) {
  const { pinned } = await getShowcase(ownerId);
  return pinned.length > 0 ? <PinnedShowcase pinned={pinned} /> : null;
}

export async function AnthemSection({ ownerId }: { ownerId: string }) {
  const { anthem } = await getShowcase(ownerId);
  return anthem ? <AnthemStrip anthem={anthem} /> : null;
}

export async function FingerprintSection({ username, viewerId }: Omit<SectionProps, "isOwn">) {
  const fingerprint = await getTasteFingerprint(username, viewerId);
  if (!fingerprint) return null;
  return <TasteFingerprint fingerprint={fingerprint} />;
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
    <ProfileRail label={t("diaryTitle")} count={initial.entries.length}>
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
    <ProfileRail label={t("favoritesTitle")} count={initial.favorites.length}>
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
    <ProfileRail label={t("listsTitle")} count={initial.lists.length}>
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
    <ProfileRail label={t("collectionTitle")} count={initial.entries.length}>
      <CollectionShelf initial={initial} readOnly username={username} />
    </ProfileRail>
  );
}
