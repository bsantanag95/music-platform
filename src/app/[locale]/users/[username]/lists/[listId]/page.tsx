import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { z } from "zod";
import { resolveSession } from "@/services/auth/sessions";
import { getProfileByUsername } from "@/services/social/profiles";
import { getUserListDetail } from "@/services/lists/lists";
import { savedStateFor } from "@/services/lists/saved-lists";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListDetailHeader } from "@/components/lists/ListDetailHeader";
import { ListItemsView } from "@/components/lists/ListItemsView";

interface PageProps {
  params: Promise<{ username: string; listId: string }>;
}

// Detalle en modo lectura de una lista ajena visible. Mismo cuerpo de tres
// modos que el detalle propio, sin controles de gestión. Cierra los enlaces
// que Descubrir, Guardadas, el feed, los perfiles e Inicio ya apuntaban acá.
export default async function UserListDetailPage({ params }: PageProps) {
  const { username, listId } = await params;
  const t = await getTranslations("lists");
  if (!z.uuid().safeParse(listId).success) notFound();

  const session = await resolveSession();
  const viewerId = session?.user.id ?? null;

  let profile;
  try {
    profile = await getProfileByUsername(username, viewerId);
  } catch {
    notFound();
  }

  // El dueño gestiona su lista en /me/lists/[listId], no en la vista de lectura.
  if (profile.relation === "self") {
    redirect(`/${await getLocale()}/me/lists/${listId}`);
  }

  let list;
  try {
    list = await getUserListDetail(username, listId, viewerId);
  } catch {
    notFound();
  }

  const savedState = viewerId
    ? (await savedStateFor(viewerId, [listId])).get(listId)
    : undefined;

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-4 py-12">
      <div className="flex w-full max-w-3xl flex-col gap-6">
        <ListDetailHeader
          list={list}
          canManage={false}
          owner={{ username: profile.username, displayName: profile.displayName }}
          saved={savedState?.saved ?? false}
          following={savedState?.following ?? false}
          canSave={Boolean(viewerId)}
        />

        {list.items.length === 0 ? (
          <EmptyState title={t("noItems")} description={t("readEmptyItems")} />
        ) : (
          <ListItemsView items={list.items} entityType={list.entityType} />
        )}
      </div>
    </main>
  );
}
