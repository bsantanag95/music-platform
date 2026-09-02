import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { SearchForm } from "@/components/catalog/SearchForm";
import { CommunityActivity } from "@/components/home/CommunityActivity";
import { PublicLists } from "@/components/home/PublicLists";
import { FeedPreview } from "@/components/home/FeedPreview";
import { OnboardingPrompt } from "@/components/home/OnboardingPrompt";
import { QuickLinks } from "@/components/home/QuickLinks";
import { getCurrentUser } from "@/services/auth/authorization";
import { listFollowing } from "@/services/social/following";
import { listCommunityActivity, listFollowingFeedPreview, listPublicLists } from "@/services/home/home";

export default async function Home() {
  const t = await getTranslations("common");
  const tHome = await getTranslations("home");
  const user = await getCurrentUser();

  const [communityActivity, publicLists] = await Promise.all([
    listCommunityActivity(user?.id ?? null),
    listPublicLists(user?.id ?? null),
  ]);

  let hasFollows = false;
  let feedPreviewEntries: Awaited<ReturnType<typeof listFollowingFeedPreview>> = [];
  if (user) {
    const following = await listFollowing(user.id, 1, 1);
    hasFollows = following.users.length > 0;
    if (hasFollows) {
      feedPreviewEntries = await listFollowingFeedPreview(user.id);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center gap-10 px-4 py-12">
      <div className="flex flex-col items-center gap-6 text-center">
        <h1 className="font-display text-3xl text-paper">{t("appName")}</h1>
        <p className="font-body text-paper-muted">{t("tagline")}</p>
        {!user && (
          <>
            <SearchForm />
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/auth/register">
                <Button variant="primary">{t("register")}</Button>
              </Link>
              <Link href="/auth/login">
                <Button variant="secondary">{t("login")}</Button>
              </Link>
            </div>
          </>
        )}
      </div>

      {user && (
        <>
          <QuickLinks />
          {hasFollows ? <FeedPreview entries={feedPreviewEntries} /> : <OnboardingPrompt />}
        </>
      )}

      <CommunityActivity entries={communityActivity} />
      <PublicLists entries={publicLists} />

      {communityActivity.length === 0 && publicLists.length === 0 && (
        <p className="max-w-md text-center font-body text-sm text-paper-muted">
          {tHome("noCommunityContentYet")}
        </p>
      )}
    </main>
  );
}
