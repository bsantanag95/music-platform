import { countFollowedFollowersOf, countSharedAlbums } from "@/services/profiles/affinity";
import type { YouFollowState } from "./following";
import type { UserSummary } from "./types";

type RequestRow = UserSummary & { requestedAt: string; youFollow: YouFollowState };

// Señales para decidir sobre cada solicitud recibida (openspec: enrich-follow-requests-context, D2): cuántas personas
// que sigues siguen a quien pide (solo la cifra) y discos en común (desde el umbral de `countSharedAlbums`). Una
// consulta por señal para toda la página; lo usan la bandeja y el modo cursor del endpoint.
export async function withFollowRequestContext<P extends { users: RequestRow[] }>(ownerId: string, page: P) {
  const ids = page.users.map((user) => user.id);
  const [followed, shared] = await Promise.all([
    countFollowedFollowersOf(ownerId, ids),
    countSharedAlbums(ownerId, ids),
  ]);
  return {
    ...page,
    users: page.users.map((user) => ({
      ...user,
      followedByYourFollows: followed.get(user.id) ?? 0,
      sharedAlbums: shared.get(user.id) ?? null,
    })),
  };
}
