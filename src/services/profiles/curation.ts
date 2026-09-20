import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { listenEntryHighlight, ratingHighlight, userListPin } from "@/db/schema";

// Conteos de la curaduría que no salen de los datos de los editores: listas
// fijadas, valoraciones destacadas y entradas de diario destacadas. Los conteos
// de Destacados y Álbumes favoritos los aportan `getShowcase` y
// `getAlbumFavorites`, que la pantalla ya carga para sus editores. Alimenta la
// pantalla Curaduría del área de ajustes (spec owner-settings).
export interface CurationSummary {
  pinnedLists: number;
  ratingHighlights: number;
  diaryHighlights: number;
}

export async function getCurationSummary(userId: string): Promise<CurationSummary> {
  const [lists, ratings, diary] = await Promise.all([
    db.select({ total: count() }).from(userListPin).where(eq(userListPin.ownerId, userId)),
    db.select({ total: count() }).from(ratingHighlight).where(eq(ratingHighlight.userId, userId)),
    db.select({ total: count() }).from(listenEntryHighlight).where(eq(listenEntryHighlight.userId, userId)),
  ]);

  return {
    pinnedLists: lists[0]?.total ?? 0,
    ratingHighlights: ratings[0]?.total ?? 0,
    diaryHighlights: diary[0]?.total ?? 0,
  };
}
