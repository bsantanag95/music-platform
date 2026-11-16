import type { Metadata } from "next";
import { cache, Suspense, type ReactNode } from "react";
import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { getProfileView } from "@/services/profiles/profile-view";
import { buildProfileShareMetadata } from "@/services/share/metadata";
import { ShareAction } from "@/components/share/ShareAction";
import { getMutualFollowersPreview, mutualFollowersHint } from "@/services/profiles/affinity";
import { resolveSession } from "@/services/auth/sessions";
import { getUserPermissions } from "@/services/auth/authorization";
import { ProfileHeader } from "@/components/profiles/ProfileHeader";
import { PrivateProfileCard } from "@/components/profiles/PrivateProfileCard";
import { ViewAsBanner } from "@/components/profiles/ViewAsBanner";
import { OwnerEditProvider } from "@/components/profiles/OwnerEditProvider";
import { OwnerProfileBar } from "@/components/profiles/OwnerProfileBar";
import {
  AffinitySection,
  AnchorsSection,
  ConcertsRail,
  FavoritesRail,
  EditablePlaca,
  HeaderBackdropSection,
  IdentityCardSection,
  IdentityStripSection,
  InRotationSection,
  ListsCollectionRow,
  RecencySection,
  ReviewsDiaryRow,
  SettingsCardSection,
  StartRow,
} from "./sections";
import { redirectIfRenamed } from "@/services/profiles/renamed-redirect";
import { withClientMessages } from "@/i18n/client-messages";

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
  // Los metadatos de compartir se calculan siempre como anónimo (spec share-metadata), aunque el título use la
  // vista de quien visita.
  const share = await buildProfileShareMetadata(username, await getLocale());
  try {
    const profile = await getProfileViewCached(username, session?.user.id ?? null);
    return { title: profile.displayName ?? profile.username, ...share };
  } catch {
    return share;
  }
}

async function UserProfilePage({ params, searchParams }: UserProfilePageProps) {
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
  // Guardar/Seguir y Seguir mi progreso: solo para quien tiene sesión y no es el dueño (ni lo simula).
  const canAct = authenticated && !isOwn && !previewing;

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
          <ShareAction kind="profile" username={profile.username} />
        </div>
      </main>
    );
  }

  // Dueño y visitante autorizado comparten la misma composición estructural
  // (spec `social-profiles`, "Composición visual única para dueño y visitante
  // autorizado" y "Cabecera del perfil"; openspec: redesign-user-profile-phase1):
  // una cabecera a todo el ancho con la identidad, las acciones y la Tarjeta de
  // Identidad; la barra de anclas fija; la franja de identidad y el resto en
  // niveles de profundidad, todo a lo ancho del contenedor, sin columna lateral.
  // Las capas propias del dueño (barra con el interruptor "Editar perfil" y
  // acceso a Ajustes, lápices por bloque) se superponen a esa misma estructura,
  // no la reemplazan: hasta que el dueño activa el modo edición, su perfil se ve
  // igual que el de un visitante (spec `profile-edit-mode`).
  const mutualFollowers = effectiveViewerId
    ? await getMutualFollowersPreview(profile.username, effectiveViewerId)
    : null;

  const header = (
    <ProfileHeader
      profile={profile}
      authenticated={authenticated}
      preview={previewing}
      canModerate={canModerate}
      mutualFollowers={mutualFollowers}
      wrapDetails={isOwn ? (details) => (
              <EditablePlaca profile={profile} className="min-w-0">
                {details}
              </EditablePlaca>
            ) : undefined}
      backdrop={
        <Suspense fallback={null}>
          <HeaderBackdropSection ownerId={profile.id} />
        </Suspense>
      }
      share={
        // Compartir el perfil (add-share-foundation): la imagen y el enlace son siempre los de un anónimo.
        <Suspense fallback={null}>
          <ShareAction kind="profile" username={profile.username} />
        </Suspense>
      }
      extras={
        <>
          <Suspense fallback={null}>
            <AffinitySection username={section.username} viewerId={effectiveViewerId} />
          </Suspense>
          <Suspense fallback={null}>
            <RecencySection username={section.username} viewerId={effectiveViewerId} />
          </Suspense>
          {/* Tarjeta de Ajustes del dueño, con su bandeja de solicitudes (spec social-profiles, "Panel del dueño"). */}
          {isOwn && (
            <div className="w-full max-w-sm">
              <Suspense fallback={null}>
                <SettingsCardSection ownerId={profile.id} />
              </Suspense>
            </div>
          )}
        </>
      }
      identity={
        <Suspense fallback={<SectionFallback />}>
          <IdentityCardSection ownerId={profile.id} isOwn={isOwn} />
        </Suspense>
      }
    />
  );

  const content = (
    <>
      {/* Nivel 1: la cabecera —quién es y qué la define— y la franja de identidad. */}
      {header}
      <Suspense fallback={null}>
        <AnchorsSection username={section.username} viewerId={effectiveViewerId} />
      </Suspense>

      <div className="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-12 px-4 pt-8 xl:px-6">
        <Suspense fallback={null}>
          <IdentityStripSection profile={profile} viewerId={effectiveViewerId} />
        </Suspense>

        {/* Nivel 2 en filas (openspec: redesign-user-profile-phase2): cada sección enlaza su
            vista completa de Nivel 3 desde el título; no hay bloque de enlaces al final. */}
        <Streamed>
          <InRotationSection username={section.username} viewerId={effectiveViewerId} />
        </Streamed>
        <Streamed>
          <StartRow ownerId={profile.id} {...section} />
        </Streamed>
        <Streamed>
          <ReviewsDiaryRow {...section} />
        </Streamed>
        <Streamed>
          <FavoritesRail {...section} />
        </Streamed>
        <Streamed>
          <ListsCollectionRow {...section} canAct={canAct} />
        </Streamed>
        <Streamed>
          <ConcertsRail {...section} />
        </Streamed>
      </div>
    </>
  );

  return (
    // Alturas de la cabecera del sitio y de la barra de anclas: la barra queda fija debajo de la
    // primera y los estantes reservan las dos al saltar a su ancla.
    <main className="flex min-h-screen flex-col pb-12 [--profile-anchors-h:2.875rem] [--site-header-h:3.625rem]">
      {previewing && (
        <div className="mx-auto w-full max-w-7xl px-4 pt-6 xl:px-6">
          <ViewAsBanner username={profile.username} />
        </div>
      )}
      {isOwn ? (
        // Solo el dueño real (no en previsualización) recibe el modo edición.
        <OwnerEditProvider>
          <div className="mx-auto w-full max-w-7xl px-4 pt-6 xl:px-6">
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

export default withClientMessages("users/[username]/page", UserProfilePage);
