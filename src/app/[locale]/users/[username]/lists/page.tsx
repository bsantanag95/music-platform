import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveSession } from "@/services/auth/sessions";
import { getProfileByUsername } from "@/services/social/profiles";
import { listUserLists } from "@/services/lists/lists";
import { ListsList } from "@/components/lists/ListsList";

interface PageProps {
  params: Promise<{ username: string }>;
}

// Todas las listas de un perfil, de solo lectura — el destino de la
// tarjeta-puerta "Ver las N listas" del riel del Nivel 2 (`ListsCarousel`, que
// muestra solo las primeras con las fijadas por el dueño al frente). Distinta
// de `/me/lists`: esa es la vista de gestión del propio dueño (crear, fijar,
// editar, borrar, audiencia); esta sirve a cualquier perfil accesible, dueño
// incluido, con buscador, tipo y orden pero sin ninguna acción de gestión.
// Mismo criterio de acceso que el resto del perfil (`profile.accessible` + la
// matriz de audiencia de `listUserLists`).
export default async function ProfileListsPage({ params }: PageProps) {
  const { username } = await params;
  const t = await getTranslations("lists");
  const tUsers = await getTranslations("users");

  const session = await resolveSession();
  const viewerId = session?.user.id ?? null;

  let profile;
  try {
    profile = await getProfileByUsername(username, viewerId);
  } catch {
    notFound();
  }

  const initial = profile.accessible ? await listUserLists(username, viewerId, 1, 20) : null;

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-4 py-12">
      <div className="flex w-full max-w-3xl flex-col gap-6">
        <Link href={`/users/${profile.username}`} className="font-data text-xs text-paper-muted hover:text-paper">
          @{profile.username}
        </Link>
        <h1 className="font-display text-2xl text-paper">{t("title")}</h1>
        {initial === null ? (
          <p className="font-body text-sm text-paper-muted">{tUsers("connections.privateNotice")}</p>
        ) : (
          <ListsList initial={initial} username={profile.username} />
        )}
      </div>
    </main>
  );
}
