import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { artist, recording, releaseGroup, userPinnedItem, userShowcase } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import { PRIMARY_ARTIST_SQL } from "@/services/feed/feed";
import { PROFILE_IDENTITY_LIMITS, PROFILE_MAX_PINNED } from "@/services/social/types";

export type ShowcaseEntityType = "artist" | "release-group" | "recording";

export interface ShowcaseEntity {
  type: ShowcaseEntityType;
  id: string;
  title: string;
  artistName: string | null;
  coverThumbUrl: string | null;
}

export interface PinnedItem {
  id: string;
  note: string | null;
  position: number;
  entity: ShowcaseEntity;
}

export interface Showcase {
  pinned: PinnedItem[];
  anthem: ShowcaseEntity | null;
}

export interface PinnedInput {
  type: ShowcaseEntityType;
  id: string;
  note?: string | null;
}

function isForeignKeyViolation(error: unknown): boolean {
  return (
    typeof error === "object" && error !== null && "code" in error && error.code === "23503"
  );
}

// Fila cruda de user_pinned_item con las entidades resueltas por LEFT JOIN.
const PINNED_SELECT = {
  id: userPinnedItem.id,
  note: userPinnedItem.note,
  position: userPinnedItem.position,
  artistId: userPinnedItem.artistId,
  releaseGroupId: userPinnedItem.releaseGroupId,
  recordingId: userPinnedItem.recordingId,
  artistName: artist.name,
  releaseTitle: releaseGroup.title,
  releaseCover: releaseGroup.coverThumbUrl,
  recordingTitle: recording.title,
  creditedArtist: PRIMARY_ARTIST_SQL(userPinnedItem.releaseGroupId, userPinnedItem.recordingId),
} as const;

type PinnedRow = {
  id: string;
  note: string | null;
  position: number;
  artistId: string | null;
  releaseGroupId: string | null;
  recordingId: string | null;
  artistName: string | null;
  releaseTitle: string | null;
  releaseCover: string | null;
  recordingTitle: string | null;
  creditedArtist: string | null;
};

// Devuelve la entidad resuelta, o null si la fila apunta a algo que ya no
// existe en el catálogo (defensa extra: las FK son ON DELETE CASCADE, así que
// en la práctica la fila ya no estaría).
function resolveEntity(row: PinnedRow): ShowcaseEntity | null {
  if (row.artistId) {
    if (row.artistName == null) return null;
    return { type: "artist", id: row.artistId, title: row.artistName, artistName: null, coverThumbUrl: null };
  }
  if (row.releaseGroupId) {
    if (row.releaseTitle == null) return null;
    return {
      type: "release-group",
      id: row.releaseGroupId,
      title: row.releaseTitle,
      artistName: row.creditedArtist,
      coverThumbUrl: row.releaseCover,
    };
  }
  if (row.recordingId) {
    if (row.recordingTitle == null) return null;
    return {
      type: "recording",
      id: row.recordingId,
      title: row.recordingTitle,
      artistName: row.creditedArtist,
      coverThumbUrl: null,
    };
  }
  return null;
}

export async function getShowcase(userId: string): Promise<Showcase> {
  const [pinnedRows, [showcaseRow]] = await Promise.all([
    db
      .select(PINNED_SELECT)
      .from(userPinnedItem)
      .leftJoin(artist, eq(userPinnedItem.artistId, artist.id))
      .leftJoin(releaseGroup, eq(userPinnedItem.releaseGroupId, releaseGroup.id))
      .leftJoin(recording, eq(userPinnedItem.recordingId, recording.id))
      .where(eq(userPinnedItem.userId, userId))
      .orderBy(asc(userPinnedItem.position)),
    db
      .select({ anthemRecordingId: userShowcase.anthemRecordingId })
      .from(userShowcase)
      .where(eq(userShowcase.userId, userId))
      .limit(1),
  ]);

  const pinned: PinnedItem[] = [];
  for (const row of pinnedRows) {
    const entity = resolveEntity(row);
    if (entity) pinned.push({ id: row.id, note: row.note, position: row.position, entity });
  }

  let anthem: ShowcaseEntity | null = null;
  const anthemId = showcaseRow?.anthemRecordingId ?? null;
  if (anthemId) {
    const [rec] = await db
      .select({
        title: recording.title,
        creditedArtist: PRIMARY_ARTIST_SQL(recording.id, recording.id),
      })
      .from(recording)
      .where(eq(recording.id, anthemId))
      .limit(1);
    if (rec) {
      anthem = {
        type: "recording",
        id: anthemId,
        title: rec.title,
        artistName: rec.creditedArtist,
        coverThumbUrl: null,
      };
    }
  }

  return { pinned, anthem };
}

function toColumns(item: PinnedInput, position: number) {
  return {
    artistId: item.type === "artist" ? item.id : null,
    releaseGroupId: item.type === "release-group" ? item.id : null,
    recordingId: item.type === "recording" ? item.id : null,
    note: item.note?.trim() ? item.note.trim() : null,
    position,
  };
}

// Reemplaza el conjunto ordenado de destacados (0..4). La posición se deriva
// del orden del array. Devuelve los destacados resueltos.
export async function replacePinned(
  userId: string,
  items: PinnedInput[],
): Promise<PinnedItem[]> {
  if (items.length > PROFILE_MAX_PINNED) {
    throw new ApiError("VALIDATION_ERROR", 400, `Máximo ${PROFILE_MAX_PINNED} destacados`);
  }
  for (const item of items) {
    if (item.note && item.note.trim().length > PROFILE_IDENTITY_LIMITS.pinnedNote) {
      throw new ApiError("VALIDATION_ERROR", 400, "La nota del destacado es demasiado larga");
    }
  }

  try {
    await db.transaction(async (tx) => {
      await tx.delete(userPinnedItem).where(eq(userPinnedItem.userId, userId));
      if (items.length === 0) return;
      await tx
        .insert(userPinnedItem)
        .values(items.map((item, index) => ({ userId, ...toColumns(item, index) })));
    });
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      throw new ApiError("VALIDATION_ERROR", 400, "Alguna entidad destacada no existe");
    }
    throw error;
  }

  return (await getShowcase(userId)).pinned;
}

export async function setAnthem(userId: string, recordingId: string): Promise<void> {
  try {
    await db
      .insert(userShowcase)
      .values({ userId, anthemRecordingId: recordingId })
      .onConflictDoUpdate({
        target: userShowcase.userId,
        set: { anthemRecordingId: recordingId },
      });
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      throw new ApiError("VALIDATION_ERROR", 400, "La canción del himno no existe");
    }
    throw error;
  }
}

export async function clearAnthem(userId: string): Promise<void> {
  await db
    .update(userShowcase)
    .set({ anthemRecordingId: null })
    .where(eq(userShowcase.userId, userId));
}
