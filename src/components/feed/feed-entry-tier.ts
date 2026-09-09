import type { FeedEntry } from "@/lib/api/schemas";

/**
 * Tier de intención de una entrada del feed (openspec: rework-feed-tiers,
 * reemplaza el criterio binario "con texto / sola presencia"):
 *
 *   1 Expresivo         — comentario · escucha con nota · reseña · evento de lista
 *   2 Señal de opinión  — rating de ÁLBUM · favorito de ÁLBUM
 *   3 Presencia cotidiana — rating de canción · favorito de canción/artista · escucha sin nota
 *   4 Ambiente          — seguir artista/usuario · colección (todavía NO llega al feed)
 *
 * El tier depende del tipo Y del objetivo: el mismo rating pesa distinto sobre
 * un álbum que sobre una canción.
 */
export function feedEntryTier(entry: FeedEntry): 1 | 2 | 3 | 4 {
  switch (entry.kind) {
    case "comment":
    case "review":
    case "list":
      return 1;
    case "listen":
      return hasNote(entry) ? 1 : 3;
    case "rating":
      return entry.target.type === "release-group" ? 2 : 3;
    case "favorite":
      return entry.targetType === "release-group" ? 2 : 3;
  }
}

function hasNote(entry: Extract<FeedEntry, { kind: "listen" }>): boolean {
  return entry.body != null && entry.body.trim() !== "";
}

/**
 * ¿La entrada se renderiza como cita (borde izquierdo, texto indentado)?
 * Las tres formas expresivas con prosa: comentario, escucha con nota, reseña.
 * Un evento de lista es tier 1 pero fila de título, no cita.
 */
export function isFeedEntryQuote(entry: FeedEntry): boolean {
  if (entry.kind === "comment" || entry.kind === "review") return true;
  if (entry.kind === "listen") return hasNote(entry);
  return false;
}
