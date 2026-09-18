import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { parsePagination } from "@/lib/api/pagination";
import { resolveSession } from "@/services/auth/sessions";
import { getProfileByUsername } from "@/services/social/profiles";
import { listMutualFollowers } from "@/services/profiles/affinity";

// Listado completo para el modal de "seguidores en común" de la Placa — la
// previsualización (primer usuario + total) ya se resuelve server-side en la
// página de perfil; este endpoint solo se usa al abrir el modal. Sin sesión,
// perfil propio o sin acceso: lista vacía, mismo criterio que
// `getMutualFollowersPreview`.
export const GET = withErrorHandling(
  async (request: NextRequest, context: { params: Promise<{ username: string }> }) => {
    const { username } = await context.params;
    const { searchParams } = new URL(request.url);
    const { page, pageSize } = parsePagination(searchParams);

    const session = await resolveSession();
    const viewerId = session?.user.id ?? null;
    if (!viewerId) {
      return NextResponse.json({ users: [], totalCount: 0, page, pageSize, hasNext: false });
    }

    const profile = await getProfileByUsername(username, viewerId);
    if (
      profile.relation === "self" ||
      profile.relation === "blocked" ||
      profile.blockedByMe ||
      !profile.accessible
    ) {
      return NextResponse.json({ users: [], totalCount: 0, page, pageSize, hasNext: false });
    }

    return NextResponse.json(await listMutualFollowers(viewerId, profile.id, page, pageSize));
  },
);
