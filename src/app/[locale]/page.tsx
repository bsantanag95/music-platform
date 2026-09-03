import { getTranslations } from "next-intl/server";
import { CommunityActivity } from "@/components/home/CommunityActivity";
import { PublicLists } from "@/components/home/PublicLists";
import { FeedPreview } from "@/components/home/FeedPreview";
import { OnboardingPrompt } from "@/components/home/OnboardingPrompt";
import { QuickLinks } from "@/components/home/QuickLinks";
import { AnonHero } from "@/components/home/AnonHero";
import { HowItWorks } from "@/components/home/HowItWorks";
import { AnonCta } from "@/components/home/AnonCta";
import { getCurrentUser } from "@/services/auth/authorization";
import { listFollowing } from "@/services/social/following";
import {
  listCommunityActivity,
  listFollowingFeedPreview,
  listPublicLists,
  listRecentCoverArt,
} from "@/services/home/home";

export default async function Home() {
  const t = await getTranslations("common");
  const tHome = await getTranslations("home");
  const user = await getCurrentUser();

  const [communityActivity, publicLists, recentCoverArt] = await Promise.all([
    listCommunityActivity(user?.id ?? null),
    listPublicLists(user?.id ?? null),
    user ? Promise.resolve<string[]>([]) : listRecentCoverArt(),
  ]);

  const heroCovers = user
    ? []
    : Array.from(
        new Set([
          ...recentCoverArt,
          ...communityActivity
            .map((entry) => entry.target.coverThumbUrl)
            .filter((url): url is string => Boolean(url)),
        ]),
      );

  let hasFollows = false;
  let feedPreviewEntries: Awaited<ReturnType<typeof listFollowingFeedPreview>> =
    [];
  if (user) {
    const following = await listFollowing(user.id, 1, 1);
    hasFollows = following.users.length > 0;
    if (hasFollows) {
      feedPreviewEntries = await listFollowingFeedPreview(user.id);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center gap-12 overflow-x-clip px-4 py-12">
      {user ? (
        <>
          <div className="flex flex-col items-center gap-6 text-center">
            <h1 className="font-display text-3xl text-paper">{t("appName")}</h1>
            <p className="font-body text-paper-muted">{t("tagline")}</p>
          </div>
          <QuickLinks />
          {hasFollows ? (
            <FeedPreview entries={feedPreviewEntries} />
          ) : (
            <OnboardingPrompt />
          )}
        </>
      ) : (
        <AnonHero covers={heroCovers} />
      )}

      <CommunityActivity
        entries={communityActivity}
        withCover={!user}
        subtitle={user ? undefined : tHome("communityActivitySubtitle")}
      />
      <PublicLists entries={publicLists} withCover={!user} />

      {user && communityActivity.length === 0 && publicLists.length === 0 && (
        <p className="max-w-md text-center font-body text-sm text-paper-muted">
          {tHome("noCommunityContentYet")}
        </p>
      )}

      {!user && (
        <>
          <HowItWorks />
          <AnonCta />
        </>
      )}
    </main>
  );
}
