import type { Metadata } from "next";
import { cache, Suspense, type ReactNode } from "react";
import { notFound } from "next/navigation";
import { getProfileView } from "@/services/profiles/profile-view";
import { getMutualFollowersPreview, mutualFollowersHint } from "@/services/profiles/affinity";
import { resolveSession } from "@/services/auth/sessions";
import { getUserPermissions } from "@/services/auth/authorization";
import { Placa } from "@/components/profiles/Placa";
import { PrivateProfileCard } from "@/components/profiles/PrivateProfileCard";
import { ViewAsBanner } from "@/components/profiles/ViewAsBanner";
import { OwnerEditProvider } from "@/components/profiles/OwnerEditProvider";
import { OwnerProfileBar } from "@/components/profiles/OwnerProfileBar";
import {
  AffinitySection,
  CollectionRail,
  DiaryRail,
  ExplorationSection,
  FavoritesRail,
  FeaturedReviewsSection,
  EditablePlaca,
  FingerprintSummarySection,
  IdentityCardSection,
  InRotationSection,
  Level3LinksSection,
  ListsRail,
  PinnedSection,
  RatingHighlightsSection,
  RecencySection,
  SettingsCardSection,
} from "./sections";
import { redirectIfRenamed } from "@/services/profiles/renamed-redirect";

interface UserProfilePageProps {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ preview?: string }>;
}

const getProfileViewCached = cache(async (username: string, viewerId: string | null) =>
  getProfileView(username, viewerId),
);

function SectionFallback() {
  return <div className="h-24 w-full animate-pulse rounded-lg bg-ink-surface" />;
}

function Streamed({ children }: { children: ReactNode }) {
  return <Suspense fallback={<SectionFallback />}>{children}</Suspense>;
}

export async function generateMetadata({ params }: UserProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const session = await resolveSession();
  try {
    const profile = await getProfileViewCached(username, session?.user.id ?? null);
    return { title: profile.displayName ?? profile.username };
  } catch {
    return {};
  }
}

export default async function UserProfilePage({ params, searchParams }: UserProfilePageProps) {
  const { username } = await params;
  const { preview } = await searchParams;
  const session = await resolveSession();
  const viewerId = session?.user.id ?? null;

  let profile;
  try {
    profile = await getProfileViewCached(username, viewerId);
  } catch {
    await redirectIfRenamed(username, "");
    notFound();
  }

  // "Cómo te ven": el dueño recompone su perfil con el visitante anónimo.
  const realIsOwn = profile.relation === "self";
  const previewing = realIsOwn && preview === "1";
  if (previewing) {
    profile = await getProfileViewCached(username, null);
  }
  const effectiveViewerId = previewing ? null : viewerId;

  const isOwn = profile.relation === "self";
  const lockedOut = !profile.accessible && !isOwn;
  // En previsualización la sesión sigue activa (el dueño no dejó de estarlo);
  // el clúster de acciones se muestra inerte vía `preview`, no fingiendo
  // ausencia de sesión — eso mostraba un enlace roto a /auth/login.
  const authenticated = Boolean(session);
  const platformPermissions = session?.user ? await getUserPermissions(session.user.id) : [];
  const canModerate = platformPermissions.includes("moderation.suspend_social");
  const mutualFollowersCount =
    lockedOut && effectiveViewerId
      ? await mutualFollowersHint(effectiveViewerId, profile.id)
      : 0;
  const section = { username: profile.username, viewerId: effectiveViewerId, isOwn };

  // Perfil privado sin acceso: una sola tarjeta con la identidad extendida y el
  // estado exacto del visitante (`PrivateProfileCard`), nada más — no hay
  // contenido rico que componer para este nivel de acceso. Un dueño que
  // previsualiza su perfil privado ("cómo te ven") cae acá con la sesión
  // activa: necesita el banner para volver a su vista, igual que en la vista
  // accesible.
  if (lockedOut) {
    return (
      <main className="flex min-h-screen flex-col items-center gap-8 px-4 py-12">
        <div className="flex w-full max-w-2xl flex-col items-start gap-4">
          {previewing && <ViewAsBanner username={profile.username} />}
          <PrivateProfileCard
            profile={profile}
            authenticated={authenticated}
            mutualFollowers={mutualFollowersCount}
            preview={previewing}
            canModerate={canModerate}
          />
        </div>
      </main>
    );
  }

  // Dueño y visitante autorizado comparten la misma composición estructural
  // (spec `social-profiles`, "Composición visual única para dueño y
  // visitante autorizado"): dos columnas en escritorio, barra lateral
  // pegajosa con la identidad y las señales "quién es esta persona", columna
  // principal con la Tarjeta de Identidad y el resto en 3 niveles de
  // profundidad. Las capas propias del dueño (barra con el interruptor
  // "Editar perfil", tarjeta de Ajustes y lápices por bloque) se superponen a
  // esa misma estructura, no la reemplazan: hasta que el dueño activa el modo
  // edición, su perfil se ve igual que el de un visitante (spec
  // `profile-edit-mode`).
  const mutualFollowers = effectiveViewerId
    ? await getMutualFollowersPreview(profile.username, effectiveViewerId)
    : null;

  const placa = (
    <Placa
      profile={profile}
      authenticated={authenticated}
      preview={previewing}
      canModerate={canModerate}
      mutualFollowers={mutualFollowers}
    />
  );

  const content = (
    <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[19rem_minmax(0,1fr)] lg:gap-10">
      <aside className="flex flex-col gap-6 lg:sticky lg:top-8 lg:self-start">
        {isOwn ? <EditablePlaca profile={profile}>{placa}</EditablePlaca> : placa}
        {isOwn && (
          <Suspense fallback={<SectionFallback />}>
            <SettingsCardSection ownerId={profile.id} />
          </Suspense>
        )}
        <Suspense fallback={null}>
          <AffinitySection username={section.username} viewerId={effectiveViewerId} />
        </Suspense>
        <Suspense fallback={null}>
          <RecencySection username={section.username} viewerId={effectiveViewerId} />
        </Suspense>
      </aside>

      <div className="flex min-w-0 flex-col gap-8">
        {/* Nivel 1: la Tarjeta de Identidad — lo único que hace falta ver
            para reconocer quién es esta persona musicalmente. */}
        <Streamed>
          <IdentityCardSection ownerId={profile.id} isOwn={isOwn} />
        </Streamed>

        {/* Nivel 2: exploración curada, resumida — puertas de entrada, no
            el contenido completo. */}
        <Streamed>
          <PinnedSection ownerId={profile.id} isOwn={isOwn} />
        </Streamed>
        <Streamed>
          <RatingHighlightsSection username={section.username} viewerId={effectiveViewerId} />
        </Streamed>
        <Streamed>
          <FeaturedReviewsSection username={section.username} viewerId={effectiveViewerId} />
        </Streamed>
        <Streamed>
          <InRotationSection username={section.username} viewerId={effectiveViewerId} />
        </Streamed>
        <Suspense fallback={null}>
          <FingerprintSummarySection username={section.username} viewerId={effectiveViewerId} />
        </Suspense>
        <Streamed>
          <ExplorationSection username={section.username} viewerId={effectiveViewerId} />
        </Streamed>

        {/* Nivel 3: inmersión bajo demanda — estantes completos y el
            enlace a la huella de gusto completa. */}
        <Streamed>
          <DiaryRail {...section} />
        </Streamed>
        <Streamed>
          <FavoritesRail {...section} />
        </Streamed>
        <Streamed>
          <ListsRail {...section} />
        </Streamed>
        <Streamed>
          <CollectionRail {...section} />
        </Streamed>
        <Suspense fallback={null}>
          <Level3LinksSection username={section.username} viewerId={effectiveViewerId} />
        </Suspense>
      </div>
    </div>
  );

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-4 py-12">
      {previewing && (
        <div className="w-full max-w-5xl">
          <ViewAsBanner username={profile.username} />
        </div>
      )}
      {isOwn ? (
        // Solo el dueño real (no en previsualización) recibe el modo edición.
        <OwnerEditProvider>
          <div className="w-full max-w-5xl">
            <OwnerProfileBar username={profile.username} visibility={profile.profileVisibility} />
          </div>
          {content}
        </OwnerEditProvider>
      ) : (
        content
      )}
    </main>
  );
}
