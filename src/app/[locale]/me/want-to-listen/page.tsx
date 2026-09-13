import { getTranslations } from "next-intl/server";
import { requirePageUser } from "@/services/auth/page-auth";
import { listMyWantToListen } from "@/services/want-to-listen/want-to-listen";
import { WantToListenList } from "@/components/want-to-listen/WantToListenList";

export default async function WantToListenPage() {
  const t = await getTranslations("wantToListen");
  const user = await requirePageUser();
  const initial = await listMyWantToListen(user.id, 1, 20);

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-4 py-12">
      <h1 className="font-display text-2xl text-paper">{t("title")}</h1>
      <WantToListenList initial={initial} />
    </main>
  );
}
