import type { SocialTargetType } from "@/lib/api/schemas";
import { isFavorited } from "@/services/favorites/favorites";
import { getOwnRatingRow, resolveSocialTarget } from "@/services/social";
import { isWantToListen } from "@/services/want-to-listen/want-to-listen";

// Marcas del usuario sobre un artista, álbum o canción (openspec: add-header-quick-actions,
// design D5). Las pide el diálogo de acciones rápidas del Header antes de marcar: favorito y
// Pendiente alternan al hacer POST, así que hay que conocer el estado para no quitar una marca
// por accidente. Más chico que `getReleaseGroupMarks`, que solo cubre discos.

export interface TargetMarks {
  favorite: boolean;
  /** `null` para canciones: Pendiente solo admite artista y álbum. */
  pending: boolean | null;
  stars: number | null;
  detailedScore: number | null;
}

export async function getTargetMarks(userId: string, type: SocialTargetType, id: string): Promise<TargetMarks> {
  const target = await resolveSocialTarget(type, id);
  const [favorite, pending, own] = await Promise.all([
    isFavorited({ type, id }, userId),
    type === "recording" ? Promise.resolve(null) : isWantToListen({ type, id }, userId),
    getOwnRatingRow(target, userId),
  ]);
  return {
    favorite,
    pending,
    stars: own ? Number(own.stars) : null,
    detailedScore: own?.detailedScore ?? null,
  };
}
