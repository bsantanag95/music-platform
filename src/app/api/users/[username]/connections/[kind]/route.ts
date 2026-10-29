import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { resolveSession } from "@/services/auth/sessions";
import { getProfileByUsername } from "@/services/social/profiles";
import { followersOf, listConnectionsPage, type ConnectionsKind } from "@/services/social/following";
import { relationsFor } from "@/services/social/relations";
import { countSharedAlbums } from "@/services/profiles/affinity";
import {
  defaultConnectionSort,
  parseConnectionSegment,
  parseConnectionSort,
} from "@/services/social/connection-filters";

const KINDS: readonly ConnectionsKind[] = ["followers", "following"];

// Página de Seguidores / Seguidos de un perfil (openspec: refine-connections-page-phase1, D2;
// redesign-connections-toolbar, D1): la primera de un filtro nuevo o la siguiente de "Mostrar más" (`cursor`).
// `segment` solo aplica al dueño. Sin acceso al perfil: lista vacía, mismo criterio que la página y que
// `mutual-followers`.
export const GET = withErrorHandling(
  async (request: NextRequest, context: { params: Promise<{ username: string; kind: string }> }) => {
    const { username, kind } = await context.params;
    if (!(KINDS as readonly string[]).includes(kind)) {
      throw new ApiError("VALIDATION_ERROR", 400, "El listado no es válido");
    }
    const searchParams = new URL(request.url).searchParams;
    const sortParam = searchParams.get("sort");
    const sort = parseConnectionSort(sortParam);
    if (sortParam && !sort) throw new ApiError("VALIDATION_ERROR", 400, "El orden no es válido");

    const session = await resolveSession();
    const viewerId = session?.user.id ?? null;
    const profile = await getProfileByUsername(username, viewerId);
    if (!profile.accessible) return NextResponse.json({ users: [], hasNext: false, nextCursor: null, total: 0 });

    const isOwn = profile.relation === "self";
    const page = await listConnectionsPage(profile.id, kind as ConnectionsKind, {
      q: searchParams.get("q") ?? "",
      sort: sort ?? defaultConnectionSort(kind as ConnectionsKind, isOwn),
      segment: isOwn ? (parseConnectionSegment(searchParams.get("segment")) ?? "all") : "all",
      cursor: searchParams.get("cursor") || null,
    });
    const ids = page.users.map((user) => user.id);
    const [relations, followsViewer, shared] = await Promise.all([
      relationsFor(viewerId, ids),
      followersOf(viewerId, ids),
      countSharedAlbums(viewerId, ids),
    ]);
    return NextResponse.json({
      ...page,
      users: page.users.map((user) => ({
        ...user,
        relation: relations.get(user.id) ?? "none",
        followsYou: followsViewer.has(user.id),
        // Bajo el umbral, o con bloqueo, no hay cifra (enrich-connections-rows, D2).
        sharedAlbums: relations.get(user.id) === "blocked" ? null : (shared.get(user.id) ?? null),
      })),
    });
  },
);
