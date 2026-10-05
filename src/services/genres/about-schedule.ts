import { after } from "next/server";
import type { GenreRow } from "@/db/schema";
import { enrichGenreFromWikimedia, isAboutStale } from "./about-sync";

// Sincronización del texto "Sobre el género" en segundo plano (openspec: redesign-genre-page,
// capability `genre-about`, ADR 0027). Se agenda con `after()` al visitar un género cuyo texto nunca se
// sincronizó o tiene más de 30 días: la página responde de inmediato (sin texto en la primera visita) y
// un fallo de Wikimedia solo se registra, no afecta la respuesta ni la marca de sincronización.

export function scheduleGenreAboutSync(genre: Pick<GenreRow, "id" | "slug" | "kind" | "wikimediaSyncedAt">): void {
  if (genre.kind !== "style" || !isAboutStale(genre.wikimediaSyncedAt)) return;
  after(async () => {
    try {
      await enrichGenreFromWikimedia(genre.id);
    } catch (error) {
      console.error(`[genre-about] no se pudo sincronizar el texto de ${genre.slug}`, error);
    }
  });
}
