import { getTranslations } from "next-intl/server";
import { requirePageUser } from "@/services/auth/page-auth";
import { listFollowers } from "@/services/social/following";
import { UserList } from "@/components/social/UserList";

export default async function FollowersPage() {
  const t = await getTranslations("users");
  const user = await requirePageUser();
  const { users } = await listFollowers(user.id, 1, 50);

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-4 py-12">
      <h1 className="font-display text-2xl text-paper">{t("followersTitle")}</h1>
      <UserList users={users} variant="followers" />
    </main>
  );
}