import { cache } from "react";
import { asc, eq, sql } from "drizzle-orm";
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

// La Tarjeta de Identidad (openspec: rework-user-profile) es una proyección de
// lo que ya elige el dueño a mano: el destacado de tipo artista marcado como
// definitorio, el de tipo álbum, y el himno. Nunca se deriva de actividad —
// se compone con lo que exista, sin huecos por lo ausente (spec
// `profile-showcase`, "Tarjeta de Identidad incompleta").
export interface IdentityCard {
  artist: ShowcaseEntity | null;
  album: ShowcaseEntity | null;
  anthem: ShowcaseEntity | null;
}

export interface Showcase {
  pinned: PinnedItem[];
  anthem: ShowcaseEntity | null;
  identityCard: IdentityCard;
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

// `cache()` por request: `getShowcase` se llama por separado desde
// `IdentityCardSection`, `PinnedSection` y `OwnerEditors` en la misma
// carga de página.
export const getShowcase = cache(async function getShowcase(userId: string): Promise<Showcase> {
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
      .select({
        anthemRecordingId: userShowcase.anthemRecordingId,
        definingArtistId: userShowcase.definingArtistId,
        definingReleaseGroupId: userShowcase.definingReleaseGroupId,
      })
      .from(userShowcase)
      .where(eq(userShowcase.userId, userId))
      .limit(1),
  ]);

  const pinned: PinnedItem[] = [];
  for (const row of pinnedRows) {
    const entity = resolveEntity(row);
    if (entity) {
      pinned.push({ id: row.id, note: row.note, position: row.position, entity });
    }
  }

  // La carátula del himno se resuelve igual que el resto del catálogo (spec
  // `profile-showcase`, "Carátula del himno"): un álbum representativo que
  // contenga la grabación, o el disco del sistema si no hay ninguno con arte.
  //
  // Ojo: acá se interpola `anthemId` (el valor), nunca `recording.id` (la
  // columna) — `.from(recording)` sin joins hace que Drizzle renderice la
  // columna sin calificar ("id" en vez de "recording"."id"), lo que
  // colisiona con el "id" local de las subquery (`artist a`, `track t`...) y
  // Postgres lo rechaza como referencia ambigua. Con una tabla sola en el
  // FROM, usar el valor ya conocido es más simple que forzar la calificación.
  let anthem: ShowcaseEntity | null = null;
  const anthemId = showcaseRow?.anthemRecordingId ?? null;
  if (anthemId) {
    const [rec] = await db
      .select({
        title: recording.title,
        creditedArtist: sql<string | null>`(
          SELECT a.name FROM credit c
          JOIN artist a ON a.id = c.artist_id
          WHERE c.recording_id = ${anthemId} AND c.role = 'primary'
          ORDER BY c.position
          LIMIT 1
        )`,
        cover: sql<string | null>`(
          SELECT rg.cover_thumb_url FROM track t
          JOIN release r ON r.id = t.release_id
          JOIN release_group rg ON rg.id = r.release_group_id
          WHERE t.recording_id = ${anthemId}
            AND rg.cover_thumb_url IS NOT NULL
          ORDER BY rg.created_at, rg.id
          LIMIT 1
        )`,
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
        coverThumbUrl: rec.cover,
      };
    }
  }

  // El artista/álbum definitorios son referencias directas en user_showcase
  // (migración 0030) — no dependen de que la entidad sea además un destacado
  // o un favorito, mismo criterio que el himno. Se resuelven aparte, no
  // filtrando `pinned`.
  let definingArtist: ShowcaseEntity | null = null;
  const definingArtistId = showcaseRow?.definingArtistId ?? null;
  if (definingArtistId) {
    const [row] = await db
      .select({ name: artist.name })
      .from(artist)
      .where(eq(artist.id, definingArtistId))
      .limit(1);
    if (row) {
      definingArtist = { type: "artist", id: definingArtistId, title: row.name, artistName: null, coverThumbUrl: null };
    }
  }

  let definingAlbum: ShowcaseEntity | null = null;
  const definingReleaseGroupId = showcaseRow?.definingReleaseGroupId ?? null;
  if (definingReleaseGroupId) {
    // Mismo motivo que la carátula del himno arriba: `.from(releaseGroup)`
    // sin joins deja la interpolación de columna sin calificar, así que acá
    // también se usa el valor ya conocido (`definingReleaseGroupId`), no la
    // columna `releaseGroup.id`.
    const [row] = await db
      .select({
        title: releaseGroup.title,
        coverThumbUrl: releaseGroup.coverThumbUrl,
        creditedArtist: sql<string | null>`(
          SELECT a.name FROM credit c
          JOIN artist a ON a.id = c.artist_id
          WHERE c.release_group_id = ${definingReleaseGroupId} AND c.role = 'primary'
          ORDER BY c.position
          LIMIT 1
        )`,
      })
      .from(releaseGroup)
      .where(eq(releaseGroup.id, definingReleaseGroupId))
      .limit(1);
    if (row) {
      definingAlbum = {
        type: "release-group",
        id: definingReleaseGroupId,
        title: row.title,
        artistName: row.creditedArtist,
        coverThumbUrl: row.coverThumbUrl,
      };
    }
  }

  const identityCard: IdentityCard = { artist: definingArtist, album: definingAlbum, anthem };

  return { pinned, anthem, identityCard };
});

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
      await tx.insert(userPinnedItem).values(
        items.map((item, index) => ({ userId, ...toColumns(item, index) })),
      );
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

export type DefiningEntityType = "artist" | "release-group";

/**
 * Marca el artista o álbum dado como "me define" (Tarjeta de Identidad),
 * exclusivo por tipo — reemplaza cualquier definitorio anterior del mismo
 * tipo. Referencia directa en `user_showcase` (migración 0030): no requiere
 * que la entidad sea además un destacado o un favorito, mismo criterio que
 * el himno (cualquier entidad válida del catálogo).
 */
export async function setDefiningEntity(
  userId: string,
  type: DefiningEntityType,
  entityId: string,
): Promise<void> {
  try {
    if (type === "artist") {
      await db
        .insert(userShowcase)
        .values({ userId, definingArtistId: entityId })
        .onConflictDoUpdate({ target: userShowcase.userId, set: { definingArtistId: entityId } });
    } else {
      await db
        .insert(userShowcase)
        .values({ userId, definingReleaseGroupId: entityId })
        .onConflictDoUpdate({ target: userShowcase.userId, set: { definingReleaseGroupId: entityId } });
    }
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      throw new ApiError(
        "VALIDATION_ERROR",
        400,
        type === "artist" ? "El artista no existe" : "El álbum no existe",
      );
    }
    throw error;
  }
}

/** Quita el marcador "me define" del tipo dado, sin afectar destacados ni favoritos. */
export async function clearDefiningEntity(userId: string, type: DefiningEntityType): Promise<void> {
  if (type === "artist") {
    await db.update(userShowcase).set({ definingArtistId: null }).where(eq(userShowcase.userId, userId));
  } else {
    await db.update(userShowcase).set({ definingReleaseGroupId: null }).where(eq(userShowcase.userId, userId));
  }
}
