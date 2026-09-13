import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { artist, releaseGroup, wantToListenEntry } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import { WANT_TO_LISTEN_TARGET_TYPES } from "./types";
import type { WantToListenTargetType, WantToListenTarget } from "./types";

export type { WantToListenTarget } from "./types";

type TargetColumn = "artistId" | "releaseGroupId";

export interface WantToListenEntryDTO {
  id: string;
  targetType: WantToListenTargetType;
  createdAt: string;
  target: {
    id: string;
    title: string;
    coverThumbUrl: string | null;
  };
}

function targetValues(type: WantToListenTargetType, id: string) {
  return {
    artistId: type === "artist" ? id : null,
    releaseGroupId: type === "release-group" ? id : null,
  };
}

function targetConditions(type: WantToListenTargetType, id: string) {
  return Object.entries(targetValues(type, id))
    .filter(([, v]) => v !== null)
    .map(([k, v]) => eq(wantToListenEntry[k as TargetColumn], v as string));
}

function targetTypeFromColumns(
  artistId: string | null,
  releaseGroupId: string | null,
): WantToListenTargetType {
  if (artistId) return "artist";
  // La invariante CHECK num_nonnulls = 1 garantiza que releaseGroupId es la
  // única alternativa restante; si no, es una entrada corrupta.
  if (releaseGroupId) return "release-group";
  throw new ApiError("INTERNAL_ERROR", 500, "Entrada de Want to Listen sin objetivo válido");
}

/** Resuelve y valida que el objetivo (artista o álbum) exista. */
export async function resolveWantToListenTarget(
  type: WantToListenTargetType,
  id: string,
): Promise<WantToListenTarget> {
  if (!WANT_TO_LISTEN_TARGET_TYPES.includes(type)) {
    throw new ApiError("VALIDATION_ERROR", 400, "El tipo de objetivo no es válido");
  }
  let found = false;
  if (type === "artist") {
    const [row] = await db.select({ id: artist.id }).from(artist).where(eq(artist.id, id)).limit(1);
    found = !!row;
  } else {
    const [row] = await db
      .select({ id: releaseGroup.id })
      .from(releaseGroup)
      .where(eq(releaseGroup.id, id))
      .limit(1);
    found = !!row;
  }
  if (!found) {
    throw new ApiError("WANT_TO_LISTEN_TARGET_INVALID", 404, "El objetivo no existe");
  }
  return { type, id };
}

/**
 * Toggle idempotente de Want to Listen.
 * Si la entrada ya existe la elimina (retorna null). Si no existe la crea.
 */
export async function toggleWantToListen(
  target: WantToListenTarget,
  userId: string,
): Promise<WantToListenEntryDTO | null> {
  await resolveWantToListenTarget(target.type, target.id);

  const [existing] = await db
    .select()
    .from(wantToListenEntry)
    .where(and(eq(wantToListenEntry.userId, userId), ...targetConditions(target.type, target.id)))
    .limit(1);

  if (existing) {
    await db.delete(wantToListenEntry).where(eq(wantToListenEntry.id, existing.id));
    return null;
  }

  const [created] = await db
    .insert(wantToListenEntry)
    .values({ ...targetValues(target.type, target.id), userId })
    .returning();

  if (!created) throw new ApiError("INTERNAL_ERROR", 500, "No se pudo crear la entrada");
  return getOwnedEntry(created.id, userId);
}

/** ¿El usuario tiene este objetivo en su lista Want to Listen? */
export async function isWantToListen(target: WantToListenTarget, userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: wantToListenEntry.id })
    .from(wantToListenEntry)
    .where(and(eq(wantToListenEntry.userId, userId), ...targetConditions(target.type, target.id)))
    .limit(1);
  return Boolean(row);
}

/** Quita una entrada propia de forma idempotente. */
export async function removeWantToListenEntry(
  target: WantToListenTarget,
  userId: string,
): Promise<void> {
  await db
    .delete(wantToListenEntry)
    .where(and(eq(wantToListenEntry.userId, userId), ...targetConditions(target.type, target.id)));
}

/**
 * Igual que `removeWantToListenEntry`, para el hook de auto-remoción desde el
 * diario: registrar una escucha de un objetivo retira su entrada de Want to
 * Listen, si existe. Acepta cualquier `SocialTargetType`; para `recording` no
 * hay nada que limpiar (Want to Listen no admite canciones).
 */
export async function removeWantToListenEntryForTarget(
  target: { type: string; id: string },
  userId: string,
): Promise<void> {
  if (target.type !== "artist" && target.type !== "release-group") return;
  await removeWantToListenEntry({ type: target.type, id: target.id }, userId);
}

/** Listado propio de Want to Listen, paginado, orden cronológico descendente. */
export async function listMyWantToListen(
  userId: string,
  page = 1,
  pageSize = 20,
): Promise<{ items: WantToListenEntryDTO[]; page: number; pageSize: number; hasNext: boolean }> {
  if (page < 1 || pageSize < 1 || pageSize > 50) {
    throw new ApiError("VALIDATION_ERROR", 400, "La paginación no es válida");
  }

  const rows = await entriesFrom()
    .where(eq(wantToListenEntry.userId, userId))
    .orderBy(desc(wantToListenEntry.createdAt), desc(wantToListenEntry.id))
    .limit(pageSize + 1)
    .offset((page - 1) * pageSize);

  return {
    items: rows.slice(0, pageSize).map(serializeEntry),
    page,
    pageSize,
    hasNext: rows.length > pageSize,
  };
}

const ENTRY_ROW_SELECT = {
  id: wantToListenEntry.id,
  createdAt: wantToListenEntry.createdAt,
  artistId: wantToListenEntry.artistId,
  releaseGroupId: wantToListenEntry.releaseGroupId,
  artistName: artist.name,
  releaseTitle: releaseGroup.title,
  releaseCover: releaseGroup.coverThumbUrl,
} as const;

function entriesFrom() {
  return db
    .select(ENTRY_ROW_SELECT)
    .from(wantToListenEntry)
    .leftJoin(artist, eq(wantToListenEntry.artistId, artist.id))
    .leftJoin(releaseGroup, eq(wantToListenEntry.releaseGroupId, releaseGroup.id));
}

async function getOwnedEntry(id: string, userId: string): Promise<WantToListenEntryDTO> {
  const [row] = await entriesFrom()
    .where(and(eq(wantToListenEntry.id, id), eq(wantToListenEntry.userId, userId)))
    .limit(1);

  if (!row) throw new ApiError("WANT_TO_LISTEN_TARGET_INVALID", 404, "La entrada no existe");
  return serializeEntry(row);
}

function serializeEntry(row: {
  id: string;
  createdAt: Date;
  artistId: string | null;
  releaseGroupId: string | null;
  artistName: string | null;
  releaseTitle: string | null;
  releaseCover: string | null;
}): WantToListenEntryDTO {
  const targetType = targetTypeFromColumns(row.artistId, row.releaseGroupId);
  const targetId = row.artistId ?? row.releaseGroupId ?? "";
  const title = row.artistId ? (row.artistName ?? "") : (row.releaseTitle ?? "");
  const coverThumbUrl = row.artistId ? null : row.releaseCover;

  return {
    id: row.id,
    targetType,
    createdAt: row.createdAt.toISOString(),
    target: { id: targetId, title, coverThumbUrl },
  };
}
