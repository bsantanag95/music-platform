import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { parsePagination } from "@/lib/api/pagination";
import { parseCollectionFilters } from "@/lib/api/collection-filters";
import { resolveSession } from "@/services/auth/sessions";
import { listProfileCollection } from "@/services/collection/collection";
import { getProfileByUsername } from "@/services/social/profiles";

export const GET = withErrorHandling(
  async (request: NextRequest, context: { params: Promise<{ username: string }> }) => {
    const { username } = await context.params;
    const { searchParams } = new URL(request.url);
    const { page, pageSize } = parsePagination(searchParams);
    const filters = parseCollectionFilters(searchParams);
    const session = await resolveSession();
    let viewerId = session?.user.id ?? null;

    // "Cómo te ven": si el dueño previsualiza su propio perfil como anónimo,
    // la paginación cliente debe seguir tratándolo así en cada refetch — si
    // no, esta ruta resuelve su sesión real (dueño → relation "self") y
    // desbloquea lo de audiencia "seguidores" que la carga inicial había
    // ocultado. Solo se honra para el propio dueño: no baja el acceso de
    // nadie más, así que no hace falta protegerlo más allá de eso.
    if (viewerId && searchParams.get("preview") === "1") {
      const owner = await getProfileByUsername(username, viewerId);
      if (owner.relation === "self") viewerId = null;
    }

    const result = await listProfileCollection(username, viewerId, page, pageSize, filters);
    return NextResponse.json(result);
  },
);
