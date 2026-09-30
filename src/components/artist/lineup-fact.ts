import { artistHref } from "@/lib/catalog-links";
import type { ArtistLineup } from "@/services/catalog/artist-lineup";

// Fila de la alineación en la ficha de la cabecera (openspec: add-artist-members-tab, design D6):
// hasta 5 nombres de la alineación actual (o la última, si el grupo se separó) o de los grupos
// de una persona, con un enlace a la pestaña.

export const LINEUP_FACT_LIMIT = 5;

/**
 * Ancla de la barra de pestañas: el enlace de la ficha lleva directo a la alineación, no al tope
 * de la página (la cabecera ocupa casi toda la primera pantalla).
 */
export const ARTIST_TABS_ANCHOR = "artist-tabs";

export interface LineupFact {
  label: "members" | "lastLineup" | "bands";
  people: { id: string; name: string }[];
  href: string;
  more: "seeLineup" | "seeAll";
}

const lastYear = (lines: { periods: { beginDate: string | null; endDate: string | null }[] }[]): number => {
  const years = lines.flatMap((line) => line.periods.map((p) => Number((p.endDate ?? p.beginDate ?? "0").slice(0, 4))));
  return years.length ? Math.max(...years) : 0;
};

export function lineupFact(lineup: ArtistLineup | null, artistId: string, artistName = ""): LineupFact | null {
  if (!lineup) return null;
  const membersBase = `${artistHref(artistName, artistId)}/members`;
  if (lineup.kind === "group") {
    if (lineup.current.length === 0) return null;
    return {
      label: lineup.lastLineup ? "lastLineup" : "members",
      people: lineup.current.slice(0, LINEUP_FACT_LIMIT).map((p) => ({ id: p.artistId, name: p.name })),
      href: `${membersBase}?view=current#${ARTIST_TABS_ANCHOR}`,
      more: "seeLineup",
    };
  }
  if (lineup.groups.length === 0) return null;
  // Actuales en su orden; después las antiguas, de la salida más reciente a la más antigua.
  const current = lineup.groups.filter((g) => g.current);
  const past = lineup.groups.filter((g) => !g.current).sort((a, b) => lastYear(b.lines) - lastYear(a.lines));
  return {
    label: "bands",
    people: [...current, ...past].slice(0, LINEUP_FACT_LIMIT).map((g) => ({ id: g.artistId, name: g.name })),
    href: `${membersBase}#${ARTIST_TABS_ANCHOR}`,
    more: "seeAll",
  };
}

/** La pestaña de la alineación y su nombre, o `null` si no hay nada que listar (design D1). */
export function lineupTabOf(lineup: ArtistLineup | null): "members" | "bands" | null {
  if (!lineup) return null;
  if (lineup.kind === "group") {
    const people = lineup.current.length + lineup.past.length + lineup.supportCurrent.length + lineup.supportPast.length;
    return people > 0 ? "members" : null;
  }
  const entries = lineup.groups.length + lineup.supportFor.length + lineup.supportersCurrent.length + lineup.supportersPast.length;
  return entries > 0 ? "bands" : null;
}
