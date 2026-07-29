import { eq } from "drizzle-orm";
import { db } from "@/db";
import { artist, releaseGroup, credit, type ReleaseGroupRow, type ArtistRow } from "@/db/schema";
import { musicbrainz } from "../musicbrainz/client";
import { mapReleaseGroupCategory } from "../musicbrainz/mappers";
import { upsertArtistStub } from "./ingest-artist";
import type { MBArtistCreditItem } from "../musicbrainz/types";

/**
 * Trae y cachea todos los release-groups donde el artista aparece
 * acreditado (como principal o como feat.), junto con sus créditos.
 *
 * Si `target.discographySyncedAt` ya está seteado, se devuelve directo
 * desde la base local sin tocar MusicBrainz — antes esta función siempre
 * volvía a consultar la API en cada búsqueda, incluso para un artista ya
 * conocido, rompiendo el patrón de cacheo bajo demanda justo en el punto
 * de mayor tráfico.
 */
export async function findOrIngestDiscography(target: ArtistRow): Promise<ReleaseGroupRow[]> {
  if (target.discographySyncedAt) {
    const rows = await db
      .select({ releaseGroup })
      .from(credit)
      .innerJoin(releaseGroup, eq(releaseGroup.id, credit.releaseGroupId))
      .where(eq(credit.artistId, target.id));
    return rows.map((r) => r.releaseGroup);
  }

  if (!target.mbid) return [];

  const browse = await musicbrainz.browseReleaseGroupsByArtist(target.mbid);
  const rows: ReleaseGroupRow[] = [];

  for (const rg of browse["release-groups"]) {
    const category = mapReleaseGroupCategory(rg["primary-type"], rg["secondary-types"]);

    const inserted = await db
      .insert(releaseGroup)
      .values({ mbid: rg.id, title: rg.title, category })
      .onConflictDoUpdate({ target: releaseGroup.mbid, set: { title: rg.title, category } })
      .returning();

    const row = inserted[0];
    if (!row) continue;
    rows.push(row);

    if (rg["artist-credit"]?.length) {
      await ingestCredits(rg["artist-credit"], { releaseGroupId: row.id });
    }
  }

  await db.update(artist).set({ discographySyncedAt: new Date() }).where(eq(artist.id, target.id));

  return rows;
}

/**
 * Crea los créditos de un target (álbum o canción) a partir del array
 * artist-credit de MusicBrainz — mapea 1:1 con el modelo CREDIT
 * (ver ADR 0004): posición 0 = primary, el resto = featured, y el
 * joinphrase de MusicBrainz coincide exactamente con nuestro join_phrase.
 */
export async function ingestCredits(
  mbCredits: MBArtistCreditItem[],
  target: { releaseGroupId?: string; recordingId?: string },
) {
  for (let position = 0; position < mbCredits.length; position++) {
    const item = mbCredits[position];
    if (!item) continue;
    const creditedArtist = await upsertArtistStub(item.artist.id, item.artist.name);

    await db
      .insert(credit)
      .values({
        artistId: creditedArtist.id,
        releaseGroupId: target.releaseGroupId ?? null,
        recordingId: target.recordingId ?? null,
        position,
        role: position === 0 ? "primary" : "featured",
        joinPhrase: item.joinphrase ?? null,
      })
      .onConflictDoNothing();
  }
}
