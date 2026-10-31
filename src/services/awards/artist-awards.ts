import { cache } from "react";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import type { AwardKind } from "@/db/schema";

// Premios de un artista (openspec: refine-artist-page-phase3, design D1): las nominaciones que lo reconocen como
// intérprete, por él mismo o por un disco o una grabación donde tiene crédito principal; mismo criterio que "Los más
// premiados" (`listMostAwardedArtists`): una categoría de compositores premia a los autores, no al artista. Incluye los
// salones de la fama (una incorporación, no un premio ganado). Una nominación por fila aunque el artista figure por más
// de una vía.

export interface ArtistAwardNomination {
  id: string;
  category: { es: string; en: string };
  won: boolean;
  /** Lo nominado tal como lo publica el premio (título del disco o de la canción, o el nombre del artista). */
  nomineeText: string;
  /** Disco del catálogo nominado o, para una canción, su disco ancla; `null` si la nominación es al artista. */
  album: { id: string; title: string } | null;
}

export interface ArtistAwardCeremony {
  awardSlug: string;
  kind: AwardKind;
  year: number;
  nominations: ArtistAwardNomination[];
}

export interface ArtistAwards {
  /** Ceremonias con alguna nominación del artista, de la más reciente a la más antigua. */
  ceremonies: ArtistAwardCeremony[];
  /** Nominaciones ganadas en competencias. */
  wins: number;
  /** Nominaciones en competencias, ganadas o no. */
  nominations: number;
  /** Incorporaciones a salones de la fama. */
  inductions: number;
}

interface Row {
  id: string;
  award_slug: string;
  kind: AwardKind;
  year: number;
  name_es: string;
  name_en: string;
  won: boolean;
  nominee_text: string;
  album_id: string | null;
  album_title: string | null;
}

export const getArtistAwards = cache(async (artistId: string): Promise<ArtistAwards> => {
  const rows = (await db.execute(sql`
    WITH credited AS (
      SELECT n.id FROM award_nomination n WHERE n.artist_id = ${artistId}
      UNION
      SELECT n.id FROM award_nomination n
      JOIN credit cr ON cr.release_group_id = n.release_group_id AND cr.role = 'primary' AND cr.artist_id = ${artistId}
      UNION
      SELECT n.id FROM award_nomination n
      JOIN credit cr ON cr.recording_id = n.recording_id AND cr.role = 'primary' AND cr.artist_id = ${artistId}
    )
    SELECT n.id, a.slug AS award_slug, a.kind, c.year, k.name_es, k.name_en, n.won, n.nominee_text,
           rg.id AS album_id, rg.title AS album_title
    FROM credited
    JOIN award_nomination n ON n.id = credited.id
    JOIN award_category_edition e ON e.id = n.category_edition_id
    JOIN award_category k ON k.id = e.category_id
    JOIN award_ceremony c ON c.id = e.ceremony_id
    JOIN award a ON a.id = c.award_id
    LEFT JOIN release_group rg ON rg.id = coalesce(n.release_group_id, n.anchor_release_group_id)
    WHERE k.honors = 'performer'
    ORDER BY c.year DESC, a.slug, n.won DESC, k.sort_order, n.sort_order
  `)) as unknown as Row[];
  return groupArtistAwards(rows);
});

/** Agrupa las filas por ceremonia, en el orden en que llegan (año descendente; dentro, lo ganado primero). */
export function groupArtistAwards(rows: Row[]): ArtistAwards {
  const byCeremony = new Map<string, ArtistAwardCeremony>();
  let wins = 0;
  let nominations = 0;
  let inductions = 0;
  for (const row of rows) {
    const key = `${row.award_slug}:${row.year}`;
    let ceremony = byCeremony.get(key);
    if (!ceremony) {
      ceremony = { awardSlug: row.award_slug, kind: row.kind, year: row.year, nominations: [] };
      byCeremony.set(key, ceremony);
    }
    ceremony.nominations.push({
      id: row.id,
      category: { es: row.name_es, en: row.name_en },
      won: row.won,
      nomineeText: row.nominee_text,
      album: row.album_id && row.album_title ? { id: row.album_id, title: row.album_title } : null,
    });
    if (row.kind === "hall_of_fame") inductions += 1;
    else {
      nominations += 1;
      if (row.won) wins += 1;
    }
  }
  return { ceremonies: [...byCeremony.values()], wins, nominations, inductions };
}
