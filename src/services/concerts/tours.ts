// Giras de MusicBrainz (openspec: add-shared-concerts-phase3, capability `concert-tours-festivals`, ADR 0059): la página
// de una gira con sus fechas públicas, sus artistas principales y, con sesión, en cuántas estuvo quien mira.

import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { concert, concertPerformer, concertSeries } from "@/db/schema";
import { listPublicConcerts, PUBLIC_CONCERT, type SharedConcertSummary } from "./shared";

/** Fechas de una gira que se listan (una gira mundial ronda las 150). */
export const TOUR_CONCERTS_MAX = 500;
/** Artistas principales que se nombran en la cabecera. */
export const TOUR_ARTISTS_MAX = 5;

export interface TourArtist {
  name: string;
  artistId: string | null;
}

export interface TourDetail {
  id: string;
  name: string;
  artists: TourArtist[];
  upcoming: SharedConcertSummary[];
  /** Pasadas, de la más reciente a la más antigua. */
  past: SharedConcertSummary[];
  total: number;
  /** En cuántas fechas estuvo quien mira; `null` sin sesión. */
  attended: number | null;
}

/** Página de la gira; `null` si no existe o no tiene conciertos visibles. */
export async function getTour(seriesId: string, viewerId: string | null, now: Date = new Date()): Promise<TourDetail | null> {
  const [series] = await db
    .select({ id: concertSeries.id, name: concertSeries.name })
    .from(concertSeries)
    .where(eq(concertSeries.id, seriesId))
    .limit(1);
  if (!series) return null;
  const [concerts, artists] = await Promise.all([
    listPublicConcerts(eq(concert.seriesId, seriesId), viewerId, TOUR_CONCERTS_MAX, now),
    db
      .select({
        name: concertPerformer.artistName,
        artistId: concertPerformer.artistId,
        n: sql<number>`count(*)`.mapWith(Number),
      })
      .from(concertPerformer)
      .innerJoin(concert, eq(concert.id, concertPerformer.concertId))
      .where(and(eq(concert.seriesId, seriesId), PUBLIC_CONCERT, eq(concertPerformer.role, "main")))
      .groupBy(concertPerformer.artistMbid, concertPerformer.artistName, concertPerformer.artistId)
      .orderBy(desc(sql`count(*)`), concertPerformer.artistName)
      .limit(TOUR_ARTISTS_MAX),
  ]);
  if (concerts.length === 0) return null;
  return {
    id: series.id,
    name: series.name,
    artists: artists.map(({ name, artistId }) => ({ name, artistId })),
    upcoming: concerts.filter((c) => c.upcoming),
    past: concerts.filter((c) => !c.upcoming).reverse(),
    total: concerts.length,
    attended: viewerId ? concerts.filter((c) => c.attending).length : null,
  };
}
