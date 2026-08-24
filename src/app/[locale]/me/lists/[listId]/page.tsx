import { getTranslations } from "next-intl/server";
import { requirePageUser } from "@/services/auth/page-auth";
import { getOwnedList } from "@/services/lists/lists";
import { ListDetail } from "@/components/lists/ListDetail";
import { notFound } from "next/navigation";
import { z } from "zod";

export default async function ListDetailPage({ params }: { params: Promise<{ listId: string }> }) {
  const t = await getTranslations("lists");
  const { listId } = await params;
  if (!z.uuid().safeParse(listId).success) notFound();
  const user = await requirePageUser();
  let list;
  try {
    list = await getOwnedList(listId, user.id);
  } catch {
    notFound();
  }

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-4 py-12">
      <ListDetail initial={list} />
      <span className="sr-only">{t("title")}</span>
    </main>
  );
}