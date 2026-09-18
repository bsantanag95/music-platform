import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveSession } from "@/services/auth/sessions";
import { getProfileByUsername } from "@/services/social/profiles";
import { listUserFavorites } from "@/services/favorites/favorites";
import { FavoritesWall } from "@/components/favorites/FavoritesWall";

interface PageProps {
  params: Promise<{ username: string }>;
}

// Muro completo de favoritos de un perfil (los 3 modos de vista: Detallada/
// Índice/Gráfico) — antes vivía embebido sin tope en el Nivel 2 del perfil
// (`FavoritesRail`); ahora esa sección solo muestra una previsualización de
// hasta 5 por tipo (`FavoritesPreview`) y "Ver más favoritos" trae acá.
// Distinta de `/me/favorites`: esa es la vista de gestión del propio dueño
// (buscador, selección múltiple, cambiar audiencia en lote); esta es de solo
// lectura para cualquier perfil accesible, dueño incluido — mismo `readOnly`
// que ya soportaba `FavoritesWall`, sin cambios en el componente.
export default async function ProfileFavoritesPage({ params }: PageProps) {
  const { username } = await params;
  const t = await getTranslations("favorites");
  const tUsers = await getTranslations("users");

  const session = await resolveSession();
  const viewerId = session?.user.id ?? null;

  let profile;
  try {
    profile = await getProfileByUsername(username, viewerId);
  } catch {
    notFound();
  }

  const initial = profile.accessible
    ? await listUserFavorites(username, viewerId, 1, 20)
    : { favorites: [], page: 1, pageSize: 20, hasNext: false, counts: { artist: 0, "release-group": 0, recording: 0 } };

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-4 py-12">
      <div className="flex w-full max-w-3xl flex-col gap-6">
        <Link href={`/users/${profile.username}`} className="font-data text-xs text-paper-muted hover:text-paper">
          @{profile.username}
        </Link>
        <h1 className="font-display text-2xl text-paper">{t("title")}</h1>
        {!profile.accessible ? (
          <p className="font-body text-sm text-paper-muted">{tUsers("connections.privateNotice")}</p>
        ) : (
          <FavoritesWall initial={initial} readOnly username={profile.username} />
        )}
      </div>
    </main>
  );
}
