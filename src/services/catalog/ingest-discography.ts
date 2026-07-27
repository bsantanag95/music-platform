import { db } from "@/db";
import { releaseGroup, credit, type ReleaseGroupRow } from "@/db/schema";
import { musicbrainz } from "../musicbrainz/client";
import { mapReleaseGroupCategory } from "../musicbrainz/mappers";
import { upsertArtistStub } from "./ingest-artist";
import type { MBArtistCreditItem } from "../musicbrainz/types";

/**
 * Trae y cachea todos los release-groups donde el artista aparece
 * acreditado (como principal o como feat.), junto con sus créditos.
 */
export async function findOrIngestDiscography(artistMbid: string): Promise<ReleaseGroupRow[]> {
  const browse = await musicbrainz.browseReleaseGroupsByArtist(artistMbid);
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
