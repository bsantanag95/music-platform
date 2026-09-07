import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getProfileView } from "@/services/profiles/profile-view";
import { mutualFollowersHint } from "@/services/profiles/affinity";
import { resolveSession } from "@/services/auth/sessions";
import { listUserDiary } from "@/services/diary/diary";
import { listUserFavorites } from "@/services/favorites/favorites";
import { listUserLists } from "@/services/lists/lists";
import { listProfileCollection } from "@/services/collection/collection";
import { Placa } from "@/components/profiles/Placa";
import { PrivateThreshold } from "@/components/profiles/PrivateThreshold";
import { OwnerIdentityEditor } from "@/components/profiles/OwnerIdentityEditor";
import { OwnerLinksEditor } from "@/components/profiles/OwnerLinksEditor";
import { TasteFingerprint } from "@/components/profiles/TasteFingerprint";
import { getTasteFingerprint } from "@/services/profiles/stats";
import { DiaryList } from "@/components/diary/DiaryList";
import { FavoritesWall } from "@/components/favorites/FavoritesWall";
import { ListsList } from "@/components/lists/ListsList";
import { CollectionShelf } from "@/components/collection/CollectionShelf";

interface UserProfilePageProps {
  params: Promise<{ username: string }>;
}

const getProfileViewCached = cache(async (username: string, viewerId: string | null) =>
  getProfileView(username, viewerId),
);

async function ProfileDiary({ username, viewerId }: { username: string; viewerId: string | null }) {
  const t = await getTranslations("diary");
  const initial = await listUserDiary(username, viewerId, 1, 20);
  return (
    <DiaryList
      initial={initial}
      readOnly
      empty={{ title: t("profileEmptyTitle"), description: t("profileEmptyDescription") }}
    />
  );
}

async function ProfileFavorites({ username, viewerId }: { username: string; viewerId: string | null }) {
  const initial = await listUserFavorites(username, viewerId, 1, 20);
  return <FavoritesWall initial={initial} readOnly username={username} />;
}

async function ProfileCollection({
  username,
  viewerId,
}: {
  username: string;
  viewerId: string | null;
}) {
  const initial = await listProfileCollection(username, viewerId, 1, 20);
  return <CollectionShelf initial={initial} readOnly username={username} />;
}

async function ProfileLists({ username, viewerId }: { username: string; viewerId: string | null }) {
  const t = await getTranslations("lists");
  const initial = await listUserLists(username, viewerId, 1, 20);
  return (
    <ListsList
      initial={initial}
      username={username}
      empty={{ title: t("profileEmptyTitle"), description: t("profileEmptyDescription") }}
    />
  );
}

export async function generateMetadata({ params }: UserProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const session = await resolveSession();
  try {
    const profile = await getProfileViewCached(username, session?.user.id ?? null);
    return { title: profile.displayName ?? profile.username };
  } catch {
    return {};
  }
}

export default async function UserProfilePage({ params }: UserProfilePageProps) {
  const { username } = await params;
  const t = await getTranslations("users");
  const session = await resolveSession();
  const viewerId = session?.user.id ?? null;

  let profile;
  try {
    profile = await getProfileViewCached(username, viewerId);
  } catch {
    notFound();
  }

  const isOwn = profile.relation === "self";
  const lockedOut = !profile.accessible && !isOwn;
  const mutualFollowers =
    lockedOut && viewerId ? await mutualFollowersHint(viewerId, profile.id) : 0;
  const fingerprint =
    profile.accessible || isOwn ? await getTasteFingerprint(profile.username, viewerId) : null;

  return (
    <main className="flex min-h-screen flex-col items-start gap-8 px-4 py-12">
      <Placa profile={profile} authenticated={Boolean(session)} />

      {isOwn && (
        <nav aria-label={t("ownProfile")} className="flex w-full max-w-2xl flex-wrap gap-2 font-data text-sm">
          <Link href="/me/followers" className="text-paper-muted transition-colors hover:text-paper">
            {t("followersTitle")}
          </Link>
          <Link href="/me/following" className="text-paper-muted transition-colors hover:text-paper">
            {t("followingTitle")}
          </Link>
          <Link href="/me/follow-requests" className="text-paper-muted transition-colors hover:text-paper">
            {t("requestsTitle")}
          </Link>
          <Link href="/me/blocks" className="text-paper-muted transition-colors hover:text-paper">
            {t("blocksTitle")}
          </Link>
          <Link href="/me/settings" className="text-paper-muted transition-colors hover:text-paper">
            {t("profileVisibilityLabel")}
          </Link>
        </nav>
      )}

      {isOwn && (
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
        </section>
      )}

      {lockedOut && (
        <PrivateThreshold
          username={profile.username}
          relation={profile.relation}
          authenticated={Boolean(session)}
          ownerId={profile.id}
          mutualFollowers={mutualFollowers}
        />
      )}

      {fingerprint && <TasteFingerprint fingerprint={fingerprint} />}

      {(profile.accessible || isOwn) && (
        <>
          <section className="flex w-full max-w-2xl flex-col gap-4">
            <h2 className="font-display text-xl text-paper">{t("diaryTitle")}</h2>
            <ProfileDiary username={profile.username} viewerId={viewerId} />
          </section>

          <section className="flex w-full max-w-2xl flex-col gap-4">
            <h2 className="font-display text-xl text-paper">{t("favoritesTitle")}</h2>
            <ProfileFavorites username={profile.username} viewerId={viewerId} />
          </section>

          <section className="flex w-full max-w-2xl flex-col gap-4">
            <h2 className="font-display text-xl text-paper">{t("listsTitle")}</h2>
            <ProfileLists username={profile.username} viewerId={viewerId} />
          </section>

          <section className="flex w-full max-w-2xl flex-col gap-4">
            <h2 className="font-display text-xl text-paper">{t("collectionTitle")}</h2>
            <ProfileCollection username={profile.username} viewerId={viewerId} />
          </section>
        </>
      )}
    </main>
  );
}
