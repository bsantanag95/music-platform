import { notFound, redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { resolveSession } from "@/services/auth/sessions";
import { getProfileByUsername } from "@/services/social/profiles";
import { audiencesForProfile } from "@/services/social/visibility";
import { getUserCaminoDetail } from "@/services/camino/camino";
import { savedStateFor } from "@/services/lists/saved-lists";
import { listenedReleaseGroupIds } from "@/services/journeys/progress";
import { isValidUuid } from "@/lib/validation";
import { redirectIfRenamed } from "@/services/profiles/renamed-redirect";
import { CaminoReadView } from "@/components/camino/CaminoReadView";
import { ApiError } from "@/lib/api/errors";

interface PageProps {
  params: Promise<{ username: string; caminoId: string }>;
}

// Lectura de un Camino ajeno visible (openspec: add-camino). Ruta propia,
// separada de `/users/[username]/lists/[listId]`: un Camino no vive detrás
// de los endpoints de `lists` (Requirement "Exclusión de toda superficie
// que lea listas genéricamente" de la capability `camino`).
export default async function UserCaminoDetailPage({ params }: PageProps) {
  const { username, caminoId } = await params;
  if (!isValidUuid(caminoId)) notFound();

  const session = await resolveSession();
  const viewerId = session?.user.id ?? null;

  let profile;
  try {
    profile = await getProfileByUsername(username, viewerId);
  } catch {
    await redirectIfRenamed(username, `/caminos/${caminoId}`);
    notFound();
  }

  if (profile.relation === "self") {
    redirect(`/${await getLocale()}/me/caminos/${caminoId}`);
  }

  const audiences = audiencesForProfile(profile);

  let camino;
  try {
    camino = await getUserCaminoDetail(caminoId, profile.id, audiences);
  } catch (error) {
    if (error instanceof ApiError && error.code === "CAMINO_NOT_FOUND") notFound();
    throw error;
  }

  const savedState = viewerId ? (await savedStateFor(viewerId, [caminoId])).get(caminoId) : undefined;
  const tracking = savedState?.tracking ?? false;
  const trackingListenedIds =
    viewerId && tracking
      ? [...(await listenedReleaseGroupIds(viewerId, camino.albums.map((a) => a.id)))]
      : [];

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-4 py-12">
      <CaminoReadView
        camino={camino}
        owner={{ username: profile.username, displayName: profile.displayName }}
        tracking={tracking}
        trackingListenedIds={trackingListenedIds}
        canTrack={Boolean(viewerId)}
      />
    </main>
  );
}
