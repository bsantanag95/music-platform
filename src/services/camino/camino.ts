// Camino dinámico (openspec: add-camino): conjunto de álbumes armado a mano
// por su dueño, reutilizando user_list/user_list_item con
// kind = 'custom_journey' — mismo mecanismo que "Recorrido de artista"
// (kind = 'artist_journey'), pero sin discografía de fondo ni artista
// asociado: el Camino ES el conjunto de ítems que el dueño fue agregando, no
// una selección parcial sobre un universo conocido de antemano. A diferencia
// de un recorrido, un álbum del Camino no tiene estado "no seleccionado" —
// está o no está.

import { and, count, desc, eq, inArray, isNull, max, sql } from "drizzle-orm";
import { db } from "@/db";
import { releaseGroup, userList, userListItem } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import { resolveNewContentAudience } from "@/services/social/default-audience";
import { enrichLists, normalizeDescription, normalizeTitle, resolveListTarget } from "@/services/lists/lists";
import { countsByListId, deriveJourneyState, listenedReleaseGroupIds } from "@/services/journeys/progress";
import { audiencesForProfile } from "@/services/social/visibility";
import type { Audience } from "@/services/social/types";
import type { JourneyState } from "@/services/journeys/progress";

export interface CaminoAlbum {
  id: string;
  title: string;
  artistName: string | null;
  firstReleaseYear: number | null;
  coverThumbUrl: string | null;
  listened: boolean;
}

// Artista acreditado en rol `primary` del álbum — un Camino puede mezclar
// álbumes de artistas distintos (a diferencia de Recorrido, todo de un
// mismo artista), así que la fila de cada álbum necesita mostrar de quién
// es. Mismo patrón que `LIST_ITEM_PRIMARY_ARTIST` en `services/lists/lists`,
// acotado a `release_group_id` porque un ítem de Camino siempre es un álbum.
const CAMINO_ALBUM_ARTIST = sql<string | null>`(
  SELECT a.name FROM credit c
  JOIN artist a ON a.id = c.artist_id
  WHERE c.release_group_id = ${userListItem.releaseGroupId} AND c.role = 'primary'
  ORDER BY c.position
  LIMIT 1
)`;

export interface CaminoDetail {
  id: string;
  title: string;
  description: string | null;
  audience: Audience;
  state: JourneyState;
  createdAt: string;
  updatedAt: string;
  progress: { selectedCount: number; listenedCount: number };
  albums: CaminoAlbum[];
}

export interface CaminoSummary {
  id: string;
  title: string;
  state: JourneyState;
  progress: { selectedCount: number; listenedCount: number };
  coverThumbUrl: string | null;
  updatedAt: string;
}

export interface CaminoProfileSummary {
  id: string;
  title: string;
  state: JourneyState;
  progress: { selectedCount: number; listenedCount: number };
  itemCount: number;
  coverThumbs: string[];
  /** Tracking propio del visitante sobre este Camino — `false` sin sesión. */
  tracking: boolean;
}

interface CaminoRow {
  id: string;
  ownerId: string;
  title: string;
  description: string | null;
  audience: string;
  journeyArchivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

async function getCaminoRow(caminoId: string, ownerId: string): Promise<CaminoRow | null> {
  const [row] = await db
    .select()
    .from(userList)
    .where(
      and(eq(userList.id, caminoId), eq(userList.ownerId, ownerId), eq(userList.kind, "custom_journey")),
    )
    .limit(1);
  return row ?? null;
}

async function requireOwnedCamino(caminoId: string, ownerId: string): Promise<CaminoRow> {
  const row = await getCaminoRow(caminoId, ownerId);
  if (!row) throw new ApiError("CAMINO_NOT_FOUND", 404, "El Camino no existe");
  return row;
}

async function caminoAlbumRows(caminoId: string): Promise<CaminoAlbum[]> {
  const rows = await db
    .select({
      id: userListItem.releaseGroupId,
      title: releaseGroup.title,
      artistName: CAMINO_ALBUM_ARTIST,
      firstReleaseYear: releaseGroup.firstReleaseYear,
      coverThumbUrl: releaseGroup.coverThumbUrl,
    })
    .from(userListItem)
    .innerJoin(releaseGroup, eq(userListItem.releaseGroupId, releaseGroup.id))
    .where(eq(userListItem.listId, caminoId))
    .orderBy(userListItem.position);
  // El INNER JOIN contra release_group garantiza id no nulo (los ítems de un
  // Camino siempre tienen release_group_id — entityType fijo), pero el tipo
  // de la columna sigue siendo nullable a nivel de esquema.
  return rows
    .filter((r): r is typeof r & { id: string } => r.id !== null)
    .map((r) => ({
      id: r.id,
      title: r.title,
      artistName: r.artistName,
      firstReleaseYear: r.firstReleaseYear,
      coverThumbUrl: r.coverThumbUrl,
      listened: false,
    }));
}

async function buildDetail(row: CaminoRow): Promise<CaminoDetail> {
  const albums = await caminoAlbumRows(row.id);
  const ids = albums.map((a) => a.id);
  const listenedIds = await listenedReleaseGroupIds(row.ownerId, ids);
  const listenedCount = ids.filter((id) => listenedIds.has(id)).length;
  const state = deriveJourneyState(row.journeyArchivedAt, ids.length, listenedCount);

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    audience: row.audience as Audience,
    state,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    progress: { selectedCount: ids.length, listenedCount },
    albums: albums.map((a) => ({ ...a, listened: listenedIds.has(a.id) })),
  };
}

export async function createCamino(
  ownerId: string,
  params: { title: string; description?: string | null; audience?: Audience },
): Promise<CaminoDetail> {
  const [created] = await db
    .insert(userList)
    .values({
      ownerId,
      entityType: "release-group",
      title: normalizeTitle(params.title),
      description: normalizeDescription(params.description ?? null),
      audience: await resolveNewContentAudience(ownerId, "list", params.audience),
      kind: "custom_journey",
    })
    .returning();
  if (!created) throw new ApiError("INTERNAL_ERROR", 500, "No se pudo crear el Camino");
  return buildDetail(created);
}

export async function getOwnedCamino(caminoId: string, ownerId: string): Promise<CaminoDetail> {
  const row = await requireOwnedCamino(caminoId, ownerId);
  return buildDetail(row);
}

/**
 * Lectura de un Camino ajeno visible, para `/users/[username]/caminos/[id]`
 * — un Camino nunca vive detrás de los endpoints de `lists` (Requirement
 * "Exclusión de toda superficie que lea listas genéricamente"), así que
 * necesita su propia ruta de lectura en vez de reusar `getUserListDetail`.
 * `audiences` ya viene resuelto por el caller (`audiencesForProfile`), igual
 * que `getUserListDetail`.
 */
export async function getUserCaminoDetail(
  caminoId: string,
  ownerId: string,
  audiences: Audience[],
): Promise<CaminoDetail> {
  if (audiences.length === 0) throw new ApiError("CAMINO_NOT_FOUND", 404, "El Camino no existe");
  const [row] = await db
    .select()
    .from(userList)
    .where(
      and(
        eq(userList.id, caminoId),
        eq(userList.ownerId, ownerId),
        eq(userList.kind, "custom_journey"),
        inArray(userList.audience, audiences),
      ),
    )
    .limit(1);
  if (!row) throw new ApiError("CAMINO_NOT_FOUND", 404, "El Camino no existe");
  return buildDetail(row);
}

/** Agrega un álbum al final del Camino propio. Idempotente: no duplica. */
export async function addAlbumToCamino(
  caminoId: string,
  ownerId: string,
  releaseGroupId: string,
): Promise<CaminoDetail> {
  const row = await requireOwnedCamino(caminoId, ownerId);
  await resolveListTarget("release-group", releaseGroupId);

  const [maxPos] = await db
    .select({ max: max(userListItem.position) })
    .from(userListItem)
    .where(eq(userListItem.listId, caminoId));

  const inserted = await db
    .insert(userListItem)
    .values({
      listId: caminoId,
      releaseGroupId,
      position: (maxPos?.max ?? 0) + 1,
    })
    .onConflictDoNothing({ target: [userListItem.listId, userListItem.releaseGroupId] })
    .returning();

  // Igual que en Listas: solo un alta real cuenta como "actualizar" el
  // Camino, para que el widget de recencia lo refleje sin inflar
  // updated_at en reintentos idempotentes.
  if (inserted.length > 0) {
    await db.update(userList).set({ title: row.title }).where(eq(userList.id, caminoId));
  }

  return getOwnedCamino(caminoId, ownerId);
}

/** Quita un álbum del Camino propio. Idempotente: no falla si ya no estaba. */
export async function removeAlbumFromCamino(
  caminoId: string,
  ownerId: string,
  releaseGroupId: string,
): Promise<CaminoDetail> {
  await requireOwnedCamino(caminoId, ownerId);
  await db
    .delete(userListItem)
    .where(and(eq(userListItem.listId, caminoId), eq(userListItem.releaseGroupId, releaseGroupId)));
  return getOwnedCamino(caminoId, ownerId);
}

/** Archiva un Camino propio. Conserva su contenido y el progreso derivado. */
export async function archiveCamino(caminoId: string, ownerId: string): Promise<CaminoDetail> {
  await requireOwnedCamino(caminoId, ownerId);
  const [updated] = await db
    .update(userList)
    .set({ journeyArchivedAt: new Date() })
    .where(eq(userList.id, caminoId))
    .returning();
  if (!updated) throw new ApiError("CAMINO_NOT_FOUND", 404, "El Camino no existe");
  return buildDetail(updated);
}

/** Desarchiva un Camino propio, de forma reversible. */
export async function unarchiveCamino(caminoId: string, ownerId: string): Promise<CaminoDetail> {
  await requireOwnedCamino(caminoId, ownerId);
  const [updated] = await db
    .update(userList)
    .set({ journeyArchivedAt: null })
    .where(eq(userList.id, caminoId))
    .returning();
  if (!updated) throw new ApiError("CAMINO_NOT_FOUND", 404, "El Camino no existe");
  return buildDetail(updated);
}

/** Borra un Camino propio de forma física e irreversible. */
export async function deleteCamino(caminoId: string, ownerId: string): Promise<void> {
  await requireOwnedCamino(caminoId, ownerId);
  await db.delete(userList).where(eq(userList.id, caminoId));
}

/**
 * Listado propio de Caminos dinámicos (en curso, completos y archivados),
 * para la superficie combinada `/me/caminos` (Requirement "Listado propio en
 * /me/caminos"). Orden por creación descendente, mismo criterio que
 * `listMyArtistJourneys`.
 */
export async function listMyCaminos(ownerId: string): Promise<CaminoSummary[]> {
  const rows = await db
    .select()
    .from(userList)
    .where(and(eq(userList.ownerId, ownerId), eq(userList.kind, "custom_journey")))
    .orderBy(desc(userList.createdAt), desc(userList.id));
  if (rows.length === 0) return [];

  const listIds = rows.map((r) => r.id);
  const [countsByList, enrichment] = await Promise.all([
    countsByListId(ownerId, listIds),
    enrichLists(listIds),
  ]);

  return rows.map((row) => {
    const c = countsByList.get(row.id);
    const selectedCount = c?.selected ?? 0;
    const listenedCount = c?.listened ?? 0;
    return {
      id: row.id,
      title: row.title,
      state: deriveJourneyState(row.journeyArchivedAt, selectedCount, listenedCount),
      progress: { selectedCount, listenedCount },
      coverThumbUrl: enrichment.get(row.id)?.coverThumbs[0] ?? null,
      updatedAt: row.updatedAt.toISOString(),
    };
  });
}

/**
 * Caminos visibles de un perfil ajeno, no archivados, para el estante
 * "Caminos" del perfil (Nivel 2) y su página dedicada
 * `/users/[username]/caminos` — mismo molde que `listUserLists`, pero sobre
 * `kind = 'custom_journey'` en vez de `'standard'` (un Camino nunca vive
 * detrás de los endpoints de `lists`). Orden por creación descendente, sin
 * concepto de fijado (Camino no tiene pin). El progreso mostrado es el del
 * propio dueño; `tracking` es el estado del visitante sobre cada uno.
 */
export async function listVisibleCaminos(
  username: string,
  viewerId: string | null,
  page = 1,
  pageSize = 20,
): Promise<{ caminos: CaminoProfileSummary[]; page: number; pageSize: number; totalCount: number }> {
  if (page < 1 || pageSize < 1 || pageSize > 50) {
    throw new ApiError("VALIDATION_ERROR", 400, "La paginación no es válida");
  }
  const { getProfileByUsername } = await import("@/services/social/profiles");
  const profile = await getProfileByUsername(username, viewerId);
  const audiences = audiencesForProfile(profile);
  if (audiences.length === 0) {
    return { caminos: [], page, pageSize, totalCount: 0 };
  }

  // Un Camino archivado es asunto del dueño — no se exhibe a visitantes,
  // mismo criterio que "Recorrido" no ofrece exposición de recorridos
  // archivados fuera de la gestión propia.
  const visible = and(
    eq(userList.ownerId, profile.id),
    eq(userList.kind, "custom_journey"),
    inArray(userList.audience, audiences),
    isNull(userList.journeyArchivedAt),
  );

  const [rows, [totalRow]] = await Promise.all([
    db
      .select()
      .from(userList)
      .where(visible)
      .orderBy(desc(userList.createdAt), desc(userList.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ n: count() }).from(userList).where(visible),
  ]);

  const listIds = rows.map((r) => r.id);

  const [countsByList, enrichment, trackingState] = await Promise.all([
    countsByListId(profile.id, listIds),
    enrichLists(listIds),
    viewerId && listIds.length > 0
      ? import("@/services/lists/saved-lists").then((mod) => mod.savedStateFor(viewerId, listIds))
      : Promise.resolve(new Map<string, { saved: boolean; following: boolean; tracking: boolean }>()),
  ]);

  return {
    caminos: rows.map((row) => {
      const c = countsByList.get(row.id);
      const selectedCount = c?.selected ?? 0;
      const listenedCount = c?.listened ?? 0;
      const enriched = enrichment.get(row.id);
      return {
        id: row.id,
        title: row.title,
        state: deriveJourneyState(null, selectedCount, listenedCount),
        progress: { selectedCount, listenedCount },
        itemCount: enriched?.itemCount ?? 0,
        coverThumbs: enriched?.coverThumbs ?? [],
        tracking: trackingState.get(row.id)?.tracking ?? false,
      };
    }),
    page,
    pageSize,
    totalCount: Number(totalRow?.n ?? 0),
  };
}
