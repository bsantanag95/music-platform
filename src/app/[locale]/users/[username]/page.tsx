import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getProfileByUsername } from "@/services/social/profiles";
import { resolveSession } from "@/services/auth/sessions";
import { listUserDiary } from "@/services/diary/diary";
import { FollowButton } from "@/components/social/FollowButton";
import { BlockButton } from "@/components/social/BlockButton";
import { DiaryList } from "@/components/diary/DiaryList";

interface UserProfilePageProps {
  params: Promise<{ username: string }>;
}

const getProfileCached = cache(async (username: string, viewerId: string | null) =>
  getProfileByUsername(username, viewerId),
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

export async function generateMetadata({ params }: UserProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const session = await resolveSession();
  try {
    const profile = await getProfileCached(username, session?.user.id ?? null);
    return { title: profile.displayName ?? profile.username };
  } catch {
    return {};
  }
}

export default async function UserProfilePage({ params }: UserProfilePageProps) {
  const { username } = await params;
  const t = await getTranslations("users");
  const session = await resolveSession();

  let profile;
  try {
    profile = await getProfileCached(username, session?.user.id ?? null);
  } catch {
    notFound();
  }

  const isOwn = profile.relation === "self";

  return (
    <main className="flex min-h-screen flex-col items-start gap-8 px-4 py-12">
      <section className="flex w-full max-w-2xl flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-2xl text-paper">
              {profile.displayName ?? profile.username}
            </h1>
            <p className="font-data text-sm text-paper-muted">@{profile.username}</p>
            <p className="mt-1 font-data text-xs text-paper-muted">
              {profile.profileVisibility === "public"
                ? t("profilePublicLabel")
                : t("profilePrivateLabel")}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <FollowButton
              username={profile.username}
              relation={profile.relation}
              authenticated={Boolean(session)}
              requestId={profile.id}
            />
            {session && profile.relation !== "self" && !(profile.relation === "blocked" && !profile.blockedByMe) && (
              <BlockButton
                username={profile.username}
                blocked={profile.blockedByMe}
              />
            )}
          </div>
        </div>

        {profile.profileVisibility === "private" && !profile.accessible && (
          <p className="font-body text-sm text-paper-muted" role="status">
            {t("profilePrivateDescription")}
          </p>
        )}

        {isOwn && (
          <nav aria-label={t("ownProfile")} className="flex flex-wrap gap-2 font-data text-sm">
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
      </section>

      {(profile.accessible || isOwn) && (
        <section className="flex w-full max-w-2xl flex-col gap-4">
          <h2 className="font-display text-xl text-paper">{t("diaryTitle")}</h2>
          <ProfileDiary username={profile.username} viewerId={session?.user.id ?? null} />
        </section>
      )}
    </main>
  );
}