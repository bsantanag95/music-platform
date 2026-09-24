import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { artist, credit, membership, personnelCredit, release, track } from "@/db/schema";

// Clasificación de los créditos de personal de un álbum en niveles (openspec:
// enrich-album-editions-and-credits, design.md D8). Se guardan todos los tipos de relación
// de MusicBrainz; esta tabla fija decide qué nivel ocupa cada uno al leer. Un tipo que no
// esté acá cae en "Arte y otros": nunca se pierde.

export type PersonnelLevel = "members" | "guests" | "production" | "other";

const PERFORMER_TYPES = new Set([
  "instrument",
  "vocal",
  "performer",
  "performing orchestra",
  "conductor",
  "chorus master",
  "concertmaster",
]);

const PRODUCTION_TYPES = new Set([
  "producer",
  "engineer",
  "audio",
  "sound",
  "recording",
  "mix",
  "mastering",
  "programming",
  "editor",
  "balance",
]);

export function relationKind(relationType: string): "performer" | "production" | "other" {
  if (PERFORMER_TYPES.has(relationType)) return "performer";
  if (PRODUCTION_TYPES.has(relationType)) return "production";
  return "other";
}

export interface PersonnelCreditInput {
  artistId: string;
  name: string;
  creditedAs: string | null;
  relationType: string;
  attributes: string[];
  /** `null` = crédito de nivel edición (todo el álbum). */
  recordingId: string | null;
}

export interface PersonnelRole {
  relationType: string;
  attributes: string[];
}

export interface PersonnelEntry {
  artistId: string;
  name: string;
  creditedAs: string | null;
  level: PersonnelLevel;
  roles: PersonnelRole[];
  /** Pistas en que participa, o `"all"` si participa en todas (o tiene un crédito de nivel edición). */
  tracks: "all" | { discNumber: number; position: number }[];
}

const LEVEL_ORDER: PersonnelLevel[] = ["members", "guests", "production", "other"];

/**
 * Agrupa por persona y la ubica en su nivel más alto: integrante (miembro de un artista
 * principal, o el propio artista principal si es una persona), invitado (intérprete),
 * producción y sonido, o arte y otros. Una persona aparece una sola vez, con todos sus
 * roles. Pura y determinista.
 */
export function classifyPersonnel(
  credits: PersonnelCreditInput[],
  albumTracks: { recordingId: string; discNumber: number; position: number }[],
  memberIds: Set<string>,
): Record<PersonnelLevel, PersonnelEntry[]> {
  const trackByRecording = new Map(albumTracks.map((t) => [t.recordingId, t]));
  const byArtist = new Map<string, PersonnelCreditInput[]>();
  for (const c of credits) {
    const list = byArtist.get(c.artistId) ?? [];
    list.push(c);
    byArtist.set(c.artistId, list);
  }

  const result: Record<PersonnelLevel, PersonnelEntry[]> = { members: [], guests: [], production: [], other: [] };
  for (const [artistId, list] of byArtist) {
    const kinds = new Set(list.map((c) => relationKind(c.relationType)));
    const level: PersonnelLevel = memberIds.has(artistId)
      ? "members"
      : kinds.has("performer")
        ? "guests"
        : kinds.has("production")
          ? "production"
          : "other";

    const roleKeys = new Map<string, PersonnelRole>();
    for (const c of list) roleKeys.set(`${c.relationType}|${c.attributes.join(",")}`, { relationType: c.relationType, attributes: c.attributes });

    const hasReleaseLevel = list.some((c) => c.recordingId === null);
    const trackSet = new Map<string, { discNumber: number; position: number }>();
    for (const c of list) {
      const t = c.recordingId ? trackByRecording.get(c.recordingId) : undefined;
      if (t) trackSet.set(t.recordingId, { discNumber: t.discNumber, position: t.position });
    }
    const allTracks = hasReleaseLevel || (albumTracks.length > 0 && trackSet.size === albumTracks.length);

    result[level].push({
      artistId,
      name: list[0]!.name,
      creditedAs: list.find((c) => c.creditedAs)?.creditedAs ?? null,
      level,
      roles: [...roleKeys.values()],
      tracks: allTracks
        ? "all"
        : [...trackSet.values()].sort((a, b) => a.discNumber - b.discNumber || a.position - b.position),
    });
  }

  const weight = (e: PersonnelEntry) => (e.tracks === "all" ? Number.MAX_SAFE_INTEGER : e.tracks.length);
  for (const level of LEVEL_ORDER) {
    result[level].sort((a, b) => weight(b) - weight(a) || a.name.localeCompare(b.name) || a.artistId.localeCompare(b.artistId));
  }
  return result;
}

/**
 * Créditos de personal del álbum (edición representativa y sus grabaciones) clasificados
 * en niveles. `null` si el álbum no tiene créditos de personal (la pestaña no se muestra).
 */
export async function getAlbumPersonnel(
  releaseGroupId: string,
): Promise<Record<PersonnelLevel, PersonnelEntry[]> | null> {
  const [representative] = await db
    .select({ id: release.id })
    .from(release)
    .where(and(eq(release.releaseGroupId, releaseGroupId), eq(release.isRepresentative, true)))
    .limit(1);
  if (!representative) return null;

  const albumTracks = await db
    .select({ recordingId: track.recordingId, discNumber: track.discNumber, position: track.position })
    .from(track)
    .where(eq(track.releaseId, representative.id));
  const recordingIds = albumTracks.map((t) => t.recordingId);

  const [creditRows, primaryRows] = await Promise.all([
    db
      .select({
        artistId: personnelCredit.artistId,
        name: artist.name,
        creditedAs: personnelCredit.creditedAs,
        relationType: personnelCredit.relationType,
        attributes: personnelCredit.attributes,
        recordingId: personnelCredit.recordingId,
      })
      .from(personnelCredit)
      .innerJoin(artist, eq(artist.id, personnelCredit.artistId))
      .where(
        recordingIds.length
          ? or(eq(personnelCredit.releaseId, representative.id), inArray(personnelCredit.recordingId, recordingIds))
          : eq(personnelCredit.releaseId, representative.id),
      ),
    db
      .select({ id: artist.id, type: artist.type })
      .from(credit)
      .innerJoin(artist, eq(artist.id, credit.artistId))
      .where(and(eq(credit.releaseGroupId, releaseGroupId), eq(credit.role, "primary"), isNull(credit.recordingId))),
  ]);
  if (creditRows.length === 0) return null;

  const primaryIds = primaryRows.map((row) => row.id);
  const memberRows = primaryIds.length
    ? await db.select({ personId: membership.personId }).from(membership).where(inArray(membership.groupId, primaryIds))
    : [];
  const memberIds = new Set([
    ...memberRows.map((row) => row.personId),
    // Un solista acreditado en su propio disco no es "invitado".
    ...primaryRows.filter((row) => row.type === "person").map((row) => row.id),
  ]);

  return classifyPersonnel(creditRows, albumTracks, memberIds);
}
