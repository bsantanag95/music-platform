import type { MBCreditRelation } from "../musicbrainz/types";

// Mapeo de una relación de artista de MusicBrainz a un crédito, compartido por los créditos
// de personal (grabación / edición) y los de autoría de obras (openspec:
// add-songwriter-credits). Solo interesan las relaciones con destino artista.

export interface MappedPersonnelRelation {
  artistMbid: string;
  artistName: string;
  relationType: string;
  /** Instrumentos y matices, ordenados para que la unicidad sea estable. */
  attributes: string[];
  creditedAs: string | null;
}

export function mapRelation(relation: MBCreditRelation): MappedPersonnelRelation | null {
  if (relation["target-type"] !== "artist" || !relation.artist) return null;
  const creditedAs = relation["target-credit"]?.trim();
  return {
    artistMbid: relation.artist.id,
    artistName: relation.artist.name,
    relationType: relation.type,
    attributes: [...new Set(relation.attributes ?? [])].sort(),
    creditedAs: creditedAs && creditedAs !== relation.artist.name ? creditedAs : null,
  };
}
