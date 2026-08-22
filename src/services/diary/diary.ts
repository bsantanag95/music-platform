import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { artist, listenEntry, recording, releaseGroup } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import type { SocialTargetType } from "@/lib/api/schemas";
import {
  DIARY_BODY_MAX,
  type DiaryAudience,
  type ListenContext,
  type ListenReaction,
} from "./types";

type TargetColumn = "artistId" | "releaseGroupId" | "recordingId";

const targetColumns: Record<SocialTargetType, TargetColumn> = {
  artist: "artistId",
  "release-group": "releaseGroupId",
  recording: "recordingId",
};

export type DiaryTarget = { type: SocialTargetType; id: string; column: TargetColumn };

export interface DiaryTargetInfo {
  type: SocialTargetType;
  id: string;
  title: string;
  subtitle: string | null;
  coverThumbUrl: string | null;
}

export interface DiaryEntry {
  id: string;
  listenContext: ListenContext;
  body: string | null;
  reaction: ListenReaction | null;
  audience: DiaryAudience;
  createdAt: string;
  target: DiaryTargetInfo;
}

export interface UpdateListenEntryChanges {
  listenContext?: ListenContext;
  body?: string | null;
  reaction?: ListenReaction | null;
  audience?: DiaryAudience;
}

function targetWhereFor(column: TargetColumn, id: string): SQL {
  return eq(
    { artistId: listenEntry.artistId, releaseGroupId: listenEntry.releaseGroupId, recordingId: listenEntry.recordingId }[
      column
    ],
    id,
  );
}

function targetValues(target: DiaryTarget) {
  return {
    artistId: target.type === "artist" ? target.id : null,
    releaseGroupId: target.type === "release-group" ? target.id : null,
    recordingId: target.type === "recording" ? target.id : null,
  };
}

// Valida que el objetivo exista antes de insertar: es un prerrequisito de
// integridad referencial aunque la FK ya lo garantice, para dar un 404 con
// código propio (DIARY_TARGET_INVALID) en lugar de un error genérico de FK.
export async function resolveDiaryTarget(type: SocialTargetType, id: string): Promise<DiaryTarget> {
  const table = type === "artist" ? artist : type === "release-group" ? releaseGroup : recording;
  const [found] = await db.select({ id: table.id }).from(table).where(eq(table.id, id)).limit(1);
  if (!found) throw new ApiError("DIARY_TARGET_INVALID", 404, "El objetivo de la escucha no existe");
  return { type, id, column: targetColumns[type] };
}

export async function createListenEntry(target: DiaryTarget, userId: string): Promise<DiaryEntry> {
  // Inferencia del contexto: primera escucha del usuario sobre el objetivo →
  // first_listen; en adelante → relisten. El usuario puede corregirlo luego.
  const [existing] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(listenEntry)
    .where(and(eq(listenEntry.userId, userId), targetWhereFor(target.column, target.id)));
  const context: ListenContext = (existing?.count ?? 0) === 0 ? "first_listen" : "relisten";

  const [created] = await db
    .insert(listenEntry)
    .values({ ...targetValues(target), userId, listenContext: context })
    .returning();
  if (!created) throw new ApiError("INTERNAL_ERROR", 500, "No se pudo registrar la escucha");
  return getOwnedEntry(created.id, userId);
}

function normalizeBody(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  if (trimmed.length > DIARY_BODY_MAX) {
    throw new ApiError(
      "VALIDATION_ERROR",
      400,
      `La impresión no puede superar ${DIARY_BODY_MAX} caracteres`,
    );
  }
  return trimmed.length === 0 ? null : trimmed;
}

export async function updateListenEntry(
  id: string,
  userId: string,
  changes: UpdateListenEntryChanges,
): Promise<DiaryEntry> {
  const keys = Object.keys(changes) as Array<keyof UpdateListenEntryChanges>;
  if (keys.length === 0) {
    throw new ApiError("VALIDATION_ERROR", 400, "Debe indicarse al menos un campo a modificar");
  }

  const [existing] = await db
    .select({ id: listenEntry.id, userId: listenEntry.userId })
    .from(listenEntry)
    .where(eq(listenEntry.id, id))
    .limit(1);
  if (!existing) throw new ApiError("LISTEN_ENTRY_NOT_FOUND", 404, "La escucha no existe");
  if (existing.userId !== userId) {
    throw new ApiError("LISTEN_ENTRY_NOT_FOUND", 404, "La escucha no existe");
  }

  const set: Record<string, unknown> = {};
  if ("body" in changes) set.body = normalizeBody(changes.body ?? null);
  if ("reaction" in changes) set.reaction = changes.reaction ?? null;
  if ("listenContext" in changes) set.listenContext = changes.listenContext;
  if ("audience" in changes) set.audience = changes.audience;

  await db.update(listenEntry).set(set).where(eq(listenEntry.id, id));
  return getOwnedEntry(id, userId);
}

export async function deleteListenEntry(id: string, userId: string): Promise<void> {
  const deleted = await db
    .delete(listenEntry)
    .where(and(eq(listenEntry.id, id), eq(listenEntry.userId, userId)))
    .returning({ id: listenEntry.id });
  if (!deleted.length) throw new ApiError("LISTEN_ENTRY_NOT_FOUND", 404, "La escucha no existe");
}

export async function listMyDiary(userId: string, page = 1, pageSize = 20) {
  if (page < 1 || pageSize < 1 || pageSize > 50) {
    throw new ApiError("VALIDATION_ERROR", 400, "La paginación no es válida");
  }
  const rows = await selectEntries()
    .where(eq(listenEntry.userId, userId))
    .orderBy(desc(listenEntry.createdAt), desc(listenEntry.id))
    .limit(pageSize + 1)
    .offset((page - 1) * pageSize);

  return {
    entries: rows.slice(0, pageSize).map(serializeEntry),
    page,
    pageSize,
    hasNext: rows.length > pageSize,
  };
}

async function getOwnedEntry(id: string, userId: string): Promise<DiaryEntry> {
  const rows = await selectEntries()
    .where(and(eq(listenEntry.id, id), eq(listenEntry.userId, userId)))
    .limit(1);
  const row = rows[0];
  if (!row) throw new ApiError("LISTEN_ENTRY_NOT_FOUND", 404, "La escucha no existe");
  return serializeEntry(row);
}

function selectEntries() {
  return db
    .select({
      id: listenEntry.id,
      listenContext: listenEntry.listenContext,
      body: listenEntry.body,
      reaction: listenEntry.reaction,
      audience: listenEntry.audience,
      createdAt: listenEntry.createdAt,
      artistId: listenEntry.artistId,
      releaseGroupId: listenEntry.releaseGroupId,
      recordingId: listenEntry.recordingId,
      artistName: artist.name,
      releaseTitle: releaseGroup.title,
      releaseCover: releaseGroup.coverThumbUrl,
      recordingTitle: recording.title,
    })
    .from(listenEntry)
    .leftJoin(artist, eq(listenEntry.artistId, artist.id))
    .leftJoin(releaseGroup, eq(listenEntry.releaseGroupId, releaseGroup.id))
    .leftJoin(recording, eq(listenEntry.recordingId, recording.id));
}

function serializeEntry(row: {
  id: string;
  listenContext: string;
  body: string | null;
  reaction: string | null;
  audience: string;
  createdAt: Date;
  artistId: string | null;
  releaseGroupId: string | null;
  recordingId: string | null;
  artistName: string | null;
  releaseTitle: string | null;
  releaseCover: string | null;
  recordingTitle: string | null;
}): DiaryEntry {
  let target: DiaryTargetInfo;
  if (row.artistId) {
    target = { type: "artist", id: row.artistId, title: row.artistName ?? "", subtitle: null, coverThumbUrl: null };
  } else if (row.releaseGroupId) {
    target = { type: "release-group", id: row.releaseGroupId, title: row.releaseTitle ?? "", subtitle: null, coverThumbUrl: row.releaseCover };
  } else {
    target = { type: "recording", id: row.recordingId ?? "", title: row.recordingTitle ?? "", subtitle: null, coverThumbUrl: null };
  }
  return {
    id: row.id,
    listenContext: row.listenContext as ListenContext,
    body: row.body,
    reaction: row.reaction as ListenReaction | null,
    audience: row.audience as DiaryAudience,
    createdAt: row.createdAt.toISOString(),
    target,
  };
}

// La independencia con la valoración vigente es una regla de negocio
// crítica: ninguna mutación del diario debe tocar la tabla de valoración.
// Este módulo no la importa ni escribe en ella; los tests de 6.2 lo
// verifican estructuralmente.