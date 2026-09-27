import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { artist, membership } from "@/db/schema";
import type { ReleaseGroupCategory } from "@/lib/api/schemas";
import { discographySection } from "./discography-sections";
import { readArtistDiscography } from "./ingest-discography";

// Franja "También en" de la página de una persona (openspec: redesign-artist-page, design
// D8): los grupos de los que es o fue integrante, con el período de pertenencia y la
// cantidad de discos principales del grupo. Nunca consulta MusicBrainz: si la discografía de
// un grupo no se sincronizó, su tarjeta va sin cantidad.

export interface AlsoInGroup {
  id: string;
  name: string;
  photoUrl: string | null;
  joinedOn: string | null;
  leftOn: string | null;
  /** Discos de Principal del grupo; `null` si su discografía nunca se sincronizó. */
  mainCount: number | null;
}

export async function getAlsoInGroups(personId: string): Promise<AlsoInGroup[]> {
  const rows = await db
    .select({
      id: artist.id,
      name: artist.name,
      photoUrl: artist.photoUrl,
      photoBlockedAt: artist.photoBlockedAt,
      discographySyncedAt: artist.discographySyncedAt,
      joinedOn: membership.joinedOn,
      leftOn: membership.leftOn,
    })
    .from(membership)
    .innerJoin(artist, eq(artist.id, membership.groupId))
    .where(and(eq(membership.personId, personId), eq(artist.type, "group")));

  const groups = await Promise.all(
    rows.map(async (row): Promise<AlsoInGroup> => {
      let mainCount: number | null = null;
      if (row.discographySyncedAt) {
        const discography = await readArtistDiscography(row.id);
        mainCount = discography.filter(
          (rg) =>
            discographySection({
              primaryType: rg.primaryType,
              secondaryTypes: rg.secondaryTypes,
              category: rg.category as ReleaseGroupCategory,
              creditRole: rg.creditRole,
            }) === "main",
        ).length;
      }
      return {
        id: row.id,
        name: row.name,
        photoUrl: row.photoBlockedAt ? null : row.photoUrl,
        joinedOn: row.joinedOn,
        leftOn: row.leftOn,
        mainCount,
      };
    }),
  );
  // Por fecha de ingreso; sin fecha al final.
  return groups.sort((a, b) => (a.joinedOn ?? "9999").localeCompare(b.joinedOn ?? "9999") || a.name.localeCompare(b.name));
}
