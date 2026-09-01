import { getTranslations } from "next-intl/server";
import { requirePageUser } from "@/services/auth/page-auth";
import { listOwnCollection } from "@/services/collection/collection";
import { CollectionList } from "@/components/collection/CollectionList";

export default async function CollectionPage() {
  const t = await getTranslations("collection");
  const user = await requirePageUser();
  const initial = await listOwnCollection(user.id, 1, 20);

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-4 py-12">
      <h1 className="font-display text-2xl text-paper">{t("title")}</h1>
      <CollectionList initial={initial} />
    </main>
  );
}
