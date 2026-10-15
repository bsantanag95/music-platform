import { ceremonyHref } from "@/components/awards/award-links";
import { ceremonyContext, type WonCategory } from "@/services/awards/collection-context";
import { AWARD_NAMES } from "../titles";
import { ref } from "./keys";
import { emptyContext, type CollectionPresenter, type MessageRef } from "./types";

// Presentador de Premios (`grammy-winners`; openspec: add-collection-presenters): cada disco dice las categorías que
// ganó, la cabecera cuenta qué ceremonia es y cuándo se entregó, y enlaza a su página. No numera: el orden es por
// categoría y un "1" haría creer que ese disco ganó más que los demás.

/** Cuántas categorías nombra la cartela de un disco; el resto va como «+N». */
const MAX_NAMED = 2;

/** La cartela de un disco: las categorías que ganó, las generales primero (ya vienen ordenadas). */
export function wonNote(won: WonCategory[]): MessageRef | null {
  if (won.length === 0) return null;
  const [a, b] = won;
  if (won.length === 1) return ref("awardsWon1", { a: a!.name });
  if (won.length === MAX_NAMED) return ref("awardsWon2", { a: a!.name, b: b!.name });
  return ref("awardsWonMore", { a: a!.name, b: b!.name, more: won.length - MAX_NAMED });
}

/** Se abstiene si el período no es de premios o la ceremonia ya no está cargada: la familia presenta en su lugar. */
export const awardsPresenter: CollectionPresenter = async ({ periodKey, albumIds }) => {
  if (!periodKey) return null;
  const ceremony = await ceremonyContext(periodKey, albumIds);
  if (!ceremony) return null;

  const context = emptyContext();
  context.summary = ref("awardsSummary", {
    award: AWARD_NAMES[ceremony.awardSlug] ?? ceremony.awardSlug,
    year: String(ceremony.year),
    date: { date: ceremony.heldOn, style: "long" },
  });
  context.link = { href: ceremonyHref(ceremony.awardSlug, ceremony.year), label: ref("awardsLink") };
  for (const [albumId, won] of ceremony.wonByAlbum) {
    const note = wonNote(won);
    if (note) context.notes.set(albumId, note);
  }
  return context;
};
