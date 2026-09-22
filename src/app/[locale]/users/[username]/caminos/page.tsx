import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveSession } from "@/services/auth/sessions";
import { getProfileByUsername } from "@/services/social/profiles";
import { listVisibleCaminos } from "@/services/camino/camino";
import { CaminoProfileCard } from "@/components/camino/CaminoProfileCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { redirectIfRenamed } from "@/services/profiles/renamed-redirect";

interface PageProps {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ page?: string }>;
}

const PAGE_SIZE = 20;

// Caminos completos de un perfil, de solo lectura — destino de "Ver los N
// Caminos" del estante del Nivel 2 (`CaminosRail`). Sin buscador/filtros por
// ahora (mismo punto de partida que `/users/[username]/diary`): agregar si
// hay un pedido concreto. Distinta de `/me/caminos` (gestión propia).
export default async function ProfileCaminosPage({ params, searchParams }: PageProps) {
  const { username } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const t = await getTranslations("camino");
  const tUsers = await getTranslations("users");

  const session = await resolveSession();
  const viewerId = session?.user.id ?? null;

  let profile;
  try {
    profile = await getProfileByUsername(username, viewerId);
  } catch {
    await redirectIfRenamed(username, "/caminos");
    notFound();
  }

  const result = profile.accessible
    ? await listVisibleCaminos(username, viewerId, page, PAGE_SIZE)
    : null;
  const canTrack = profile.relation !== "self" && Boolean(viewerId);

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-4 py-12">
      <div className="flex w-full max-w-3xl flex-col gap-6">
        <Link href={`/users/${profile.username}`} className="font-data text-xs text-paper-muted hover:text-paper">
          @{profile.username}
        </Link>
        <h1 className="font-display text-2xl text-paper">{t("pageTitle")}</h1>

        {result === null ? (
          <p className="font-body text-sm text-paper-muted">{tUsers("connections.privateNotice")}</p>
        ) : result.caminos.length === 0 ? (
          <EmptyState title={t("pageTitle")} description={t("profileEmpty")} />
        ) : (
          <>
            <ul className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
              {result.caminos.map((camino) => (
                <li key={camino.id}>
                  <CaminoProfileCard camino={camino} username={profile.username} canTrack={canTrack} />
                </li>
              ))}
            </ul>
            <nav className="flex items-center justify-between font-data text-xs text-paper-muted">
              {page > 1 ? (
                <Link href={`/users/${profile.username}/caminos?page=${page - 1}`} className="hover:text-paper">
                  ← {t("prevPage")}
                </Link>
              ) : (
                <span />
              )}
              {result.totalCount > page * PAGE_SIZE ? (
                <Link href={`/users/${profile.username}/caminos?page=${page + 1}`} className="hover:text-paper">
                  {t("nextPage")} →
                </Link>
              ) : (
                <span />
              )}
            </nav>
          </>
        )}
      </div>
    </main>
  );
}
