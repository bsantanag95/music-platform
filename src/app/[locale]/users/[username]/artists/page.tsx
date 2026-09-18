import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveSession } from "@/services/auth/sessions";
import { getProfileByUsername } from "@/services/social/profiles";
import { listProfileFollowedArtists } from "@/services/profiles/exploration";
import { getProfileAffinity } from "@/services/profiles/affinity";
import { ArtistTile } from "@/components/profiles/ArtistTile";

interface PageProps {
  params: Promise<{ username: string }>;
}

// Listado completo de "Exploración" (openspec: nueva capacidad, ver
// docs/05-features/user-profile.md): a diferencia de `/me/artists`
// (autogestión del propio dueño, con buscador/orden), esta es la vista de
// solo lectura de los artistas que sigue *cualquier* perfil — el destino de
// la celda "+N" de `ExploreSection` cuando hay más de 8. Mismo criterio de
// acceso que el resto del perfil (`profile.accessible`).
export default async function ProfileArtistsPage({ params }: PageProps) {
  const { username } = await params;
  const t = await getTranslations("users");

  const session = await resolveSession();
  const viewerId = session?.user.id ?? null;

  let profile;
  try {
    profile = await getProfileByUsername(username, viewerId);
  } catch {
    notFound();
  }

  const [{ artists }, affinity] = await Promise.all([
    profile.accessible
      ? listProfileFollowedArtists(username, viewerId, 1, 50)
      : Promise.resolve({ artists: [] }),
    getProfileAffinity(username, viewerId),
  ]);
  const sharedArtistIds = affinity ? new Set(affinity.sharedFollowedArtists.map((e) => e.id)) : undefined;

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-4 py-12">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <Link href={`/users/${profile.username}`} className="font-data text-xs text-paper-muted hover:text-paper">
          @{profile.username}
        </Link>
        <h1 className="font-display text-2xl text-paper">
          {t("explorationFullTitle", { name: profile.displayName ?? profile.username })}
        </h1>
        {!profile.accessible ? (
          <p className="font-body text-sm text-paper-muted">{t("connections.privateNotice")}</p>
        ) : artists.length === 0 ? (
          <p className="font-body text-sm text-paper-muted">{t("explorationFullEmpty")}</p>
        ) : (
          <ul className="grid grid-cols-3 gap-6 sm:grid-cols-4">
            {artists.map((artist) => (
              <li key={artist.id}>
                <ArtistTile artist={artist} shared={sharedArtistIds?.has(artist.id) ?? false} size="size-24" t={t} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
