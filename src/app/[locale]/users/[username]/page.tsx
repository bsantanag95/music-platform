import type { Metadata } from "next";
import { cache, Suspense, type ReactNode } from "react";
import { notFound } from "next/navigation";
import { getProfileView } from "@/services/profiles/profile-view";
import { mutualFollowersHint } from "@/services/profiles/affinity";
import { resolveSession } from "@/services/auth/sessions";
import { Placa } from "@/components/profiles/Placa";
import { PrivateThreshold } from "@/components/profiles/PrivateThreshold";
import { ViewAsBanner } from "@/components/profiles/ViewAsBanner";
import {
  AffinitySection,
  CollectionRail,
  DiaryRail,
  FavoritesRail,
  FingerprintSection,
  HubSection,
  ListsRail,
  OwnerEditors,
  RecencySection,
  ShowcaseSection,
} from "./sections";

interface UserProfilePageProps {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ preview?: string }>;
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

export default async function UserProfilePage({ params, searchParams }: UserProfilePageProps) {
  const { username } = await params;
  const { preview } = await searchParams;
  const session = await resolveSession();
  const viewerId = session?.user.id ?? null;

  let profile;
  try {
    profile = await getProfileViewCached(username, viewerId);
  } catch {
    notFound();
  }

  // "Cómo te ven": el dueño recompone su perfil con el visitante anónimo.
  const realIsOwn = profile.relation === "self";
  const previewing = realIsOwn && preview === "1";
  if (previewing) {
    profile = await getProfileViewCached(username, null);
  }
  const effectiveViewerId = previewing ? null : viewerId;

  const isOwn = profile.relation === "self";
  const lockedOut = !profile.accessible && !isOwn;
  const visible = profile.accessible || isOwn;
  const mutualFollowers =
    lockedOut && effectiveViewerId
      ? await mutualFollowersHint(effectiveViewerId, profile.id)
      : 0;
  const section = { username: profile.username, viewerId: effectiveViewerId, isOwn };

  return (
    <main className="flex min-h-screen flex-col items-start gap-8 px-4 py-12">
      <Placa profile={profile} authenticated={Boolean(session) && !previewing} />

      {realIsOwn && <ViewAsBanner username={profile.username} previewing={previewing} />}

      {isOwn && (
        <>
          <Suspense fallback={<SectionFallback />}>
            <HubSection ownerId={profile.id} />
          </Suspense>
          <Streamed>
            <OwnerEditors profile={profile} />
          </Streamed>
        </>
      )}

      {lockedOut && (
        <PrivateThreshold
          username={profile.username}
          relation={profile.relation}
          authenticated={Boolean(session) && !previewing}
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
            <FingerprintSection username={section.username} viewerId={effectiveViewerId} />
          </Streamed>
          <Suspense fallback={null}>
            <RecencySection username={section.username} viewerId={effectiveViewerId} />
          </Suspense>
          <Suspense fallback={null}>
            <AffinitySection username={section.username} viewerId={effectiveViewerId} />
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
