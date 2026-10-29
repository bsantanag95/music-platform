import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { resolveSession } from "@/services/auth/sessions";
import { getProfileByUsername } from "@/services/social/profiles";
import { listConnectionsPage, type ConnectionsKind } from "@/services/social/following";
import { relationsFor } from "@/services/social/relations";

const KINDS: readonly ConnectionsKind[] = ["followers", "following"];

// Página siguiente de Seguidores / Seguidos de un perfil para "Mostrar más" (openspec:
// refine-connections-page-phase1, D2). Cursor `after` = último `username` cargado. Sin acceso al perfil: lista vacía,
// mismo criterio que la página y que `mutual-followers`.
export const GET = withErrorHandling(
  async (request: NextRequest, context: { params: Promise<{ username: string; kind: string }> }) => {
    const { username, kind } = await context.params;
    if (!(KINDS as readonly string[]).includes(kind)) {
      throw new ApiError("VALIDATION_ERROR", 400, "El listado no es válido");
    }
    const after = new URL(request.url).searchParams.get("after") || null;

    const session = await resolveSession();
    const viewerId = session?.user.id ?? null;
    const profile = await getProfileByUsername(username, viewerId);
    if (!profile.accessible) return NextResponse.json({ users: [], hasNext: false });

    const { users, hasNext } = await listConnectionsPage(profile.id, kind as ConnectionsKind, { after });
    const relations = await relationsFor(viewerId, users.map((user) => user.id));
    return NextResponse.json({
      users: users.map((user) => ({ ...user, relation: relations.get(user.id) ?? "none" })),
      hasNext,
    });
  },
);
