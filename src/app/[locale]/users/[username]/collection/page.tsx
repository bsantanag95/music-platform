import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { parseCollectionFilters } from "@/lib/api/collection-filters";
import { resolveSession } from "@/services/auth/sessions";
import { getProfileByUsername } from "@/services/social/profiles";
import { listProfileCollection } from "@/services/collection/collection";
import type { CollectionFilters } from "@/services/collection/types";
import { CollectionShelf } from "@/components/collection/CollectionShelf";
import { redirectIfRenamed } from "@/services/profiles/renamed-redirect";

type SearchParams = Record<string, string | string[] | undefined>;

interface PageProps {
  params: Promise<{ username: string }>;
  searchParams: Promise<SearchParams>;
}

// Los filtros llegan en la URL (el "Ver los N" de un artista en el estante del
// perfil abre esta página con `?q=<artista>`): un valor inválido se ignora en
// vez de romper una página pública enlazada desde afuera.
function readFilters(searchParams: SearchParams): CollectionFilters {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string" && value) params.set(key, value);
  }
  try {
    return parseCollectionFilters(params);
  } catch {
    return {};
  }
}

// Colección completa de un perfil, de solo lectura — el destino de "Ver toda la
// colección" y de "Ver los N" de cada artista en el estante del Nivel 2
// (`CollectionPreview`, que muestra solo los artistas de los que más copias
// tiene). Distinta de `/me/collection`: esa es la vista de gestión del propio
// dueño (editar, quitar, cambiar audiencia, lista de deseados); esta sirve a
// cualquier perfil accesible, dueño incluido, con los mismos conteos, buscador y
// filtros pero sin ninguna acción de gestión. Mismo criterio de acceso que el
// resto del perfil (`profile.accessible` + la matriz de audiencia de
// `listProfileCollection`).
export default async function ProfileCollectionPage({ params, searchParams }: PageProps) {
  const { username } = await params;
  const t = await getTranslations("collection");
  const tUsers = await getTranslations("users");

  const session = await resolveSession();
  const viewerId = session?.user.id ?? null;

  let profile;
  try {
    profile = await getProfileByUsername(username, viewerId);
  } catch {
    await redirectIfRenamed(username, "/collection");
    notFound();
  }

  const filters = readFilters(await searchParams);
  const initial = profile.accessible
    ? await listProfileCollection(username, viewerId, 1, 20, filters)
    : null;

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
          <CollectionShelf initial={initial} initialFilters={filters} readOnly username={profile.username} />
        )}
      </div>
    </main>
  );
}
