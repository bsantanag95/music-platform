import type { FeedEntry } from "@/lib/api/schemas";

/**
 * Una entrada del feed es "con texto" (se muestra como bloque con aire, no
 * como una línea) cuando tiene prosa para leer: un comentario, o una escucha
 * con nota escrita no vacía.
 *
 * El resto —favoritos, eventos de lista, ratings (aunque tengan score
 * detallado) y escuchas sin nota— es de sola presencia y se muestra en una
 * sola línea. La reacción de una escucha es un tap, no texto: no promueve la
 * entrada a bloque (ver openspec/changes/redesign-feed, decisión 2).
 */
export function isFeedEntryWithText(entry: FeedEntry): boolean {
  if (entry.kind === "comment") return true;
  if (entry.kind === "listen") return entry.body != null && entry.body.trim() !== "";
  return false;
}
