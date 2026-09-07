import type { Metadata } from "next";
import { cache, Suspense, type ReactNode } from "react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getProfileView } from "@/services/profiles/profile-view";
import { mutualFollowersHint } from "@/services/profiles/affinity";
import { resolveSession } from "@/services/auth/sessions";
import { Placa } from "@/components/profiles/Placa";
import { PrivateThreshold } from "@/components/profiles/PrivateThreshold";
import {
  CollectionRail,
  DiaryRail,
  FavoritesRail,
  FingerprintSection,
  ListsRail,
  OwnerEditors,
  RecencySection,
  ShowcaseSection,
} from "./sections";

interface UserProfilePageProps {
  params: Promise<{ username: string }>;
}

const getProfileViewCached = cache(async (username: string, viewerId: string | null) =>
  getProfileView(username, viewerId),
);

function SectionFallback() {
  return <div className="h-24 w-full max-w-2xl animate-pulse rounded-lg bg-ink-surface" />;
}

function Streamed({ children }: { children: ReactNode }) {
  return <Suspense fallback={<SectionFallback />}>{children}</Suspense>;
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
  const visible = profile.accessible || isOwn;
  const mutualFollowers =
    lockedOut && viewerId ? await mutualFollowersHint(viewerId, profile.id) : 0;
  const section = { username: profile.username, viewerId, isOwn };

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
        <Streamed>
          <OwnerEditors profile={profile} />
        </Streamed>
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

      {visible && (
        <>
          <Streamed>
            <ShowcaseSection ownerId={profile.id} />
          </Streamed>
          <Streamed>
            <FingerprintSection username={section.username} viewerId={viewerId} />
          </Streamed>
          <Suspense fallback={null}>
            <RecencySection username={section.username} viewerId={viewerId} />
          </Suspense>
          <Streamed>
            <DiaryRail {...section} />
          </Streamed>
          <Streamed>
            <FavoritesRail {...section} />
          </Streamed>
          <Streamed>
            <ListsRail {...section} />
          </Streamed>
          <Streamed>
            <CollectionRail {...section} />
          </Streamed>
        </>
      )}
    </main>
  );
}
