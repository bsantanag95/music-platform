import { eq } from "drizzle-orm";
import { db } from "@/db";
import { releaseGroup } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import { getDiscographyMarks, type DiscographyListMembership } from "./artist-discography-view";

// Marcas del usuario sobre un disco, para el menú de acciones fuera de la discografía del
// artista (openspec: extend-album-quick-actions, design D2): se piden al abrir el menú en vez
// de sumar consultas a la carga de cada página. Reutiliza las consultas por lote de la
// discografía con un solo id.

export interface ReleaseGroupMarks {
  listened: boolean;
  stars: number | null;
  detailedScore: number | null;
  favorite: boolean;
  pending: boolean;
  lists: DiscographyListMembership[];
}

export async function getReleaseGroupMarks(userId: string, releaseGroupId: string): Promise<ReleaseGroupMarks> {
  const [exists] = await db.select({ id: releaseGroup.id }).from(releaseGroup).where(eq(releaseGroup.id, releaseGroupId)).limit(1);
  if (!exists) throw new ApiError("ALBUM_NOT_FOUND", 404, "Álbum no encontrado");
  const marks = await getDiscographyMarks(userId, [releaseGroupId]);
  return {
    listened: marks.listened.includes(releaseGroupId),
    stars: marks.stars[releaseGroupId] ?? null,
    detailedScore: marks.detailedScores[releaseGroupId] ?? null,
    favorite: marks.favorites.includes(releaseGroupId),
    pending: marks.pending.includes(releaseGroupId),
    lists: marks.lists[releaseGroupId] ?? [],
  };
}
