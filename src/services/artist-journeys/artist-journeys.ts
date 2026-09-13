import { and, desc, eq, inArray, max, sql } from "drizzle-orm";
import { db } from "@/db";
import { artist, listenEntry, userList, userListItem, type ReleaseGroupRow } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import { findOrIngestDiscography } from "@/services/catalog/ingest-discography";
import { getArtistById } from "@/services/catalog/ingest-artist";
import type { ReleaseGroupCategory } from "@/lib/api/schemas";
import type { ArtistJourneyState } from "./types";

// "Recorrido de artista" (openspec: add-artist-journey,
// docs/00-product/product_philosophy.md §6.4): selección personal de álbumes
// de un artista, reutilizando user_list/user_list_item con
// kind = 'artist_journey'. La selección ES la lista de ítems — marcar un
// álbum es agregar un user_list_item, desmarcarlo es quitarlo. Nunca se crea
// una fila por álbum NO seleccionado.

export interface ArtistJourneyAlbum {
  id: string;
  title: string;
  category: ReleaseGroupCategory;
  firstReleaseYear: number | null;
  coverThumbUrl: string | null;
  selected: boolean;
}

export interface ArtistJourneyDetail {
  artistId: string;
  state: ArtistJourneyState;
  activatedAt: string;
  progress: { selectedCount: number; listenedCount: number };
  albums: ArtistJourneyAlbum[];
}

async function requireArtist(artistId: string) {
  const row = await getArtistById(artistId);
  if (!row) throw new ApiError("ARTIST_NOT_FOUND", 404, "El artista no existe");
  return row;
}

async function getJourneyRow(ownerId: string, artistId: string) {
  const [row] = await db
    .select()
    .from(userList)
    .where(
      and(
        eq(userList.ownerId, ownerId),
        eq(userList.kind, "artist_journey"),
        eq(userList.journeyArtistId, artistId),
      ),
    )
    .limit(1);
  return row ?? null;
}

async function requireOwnedJourney(ownerId: string, artistId: string) {
  const row = await getJourneyRow(ownerId, artistId);
  if (!row) throw new ApiError("ARTIST_JOURNEY_NOT_FOUND", 404, "El recorrido no existe");
  return row;
}

async function selectedReleaseGroupIds(listId: string): Promise<Set<string>> {
  const rows = await db
    .select({ releaseGroupId: userListItem.releaseGroupId })
    .from(userListItem)
    .where(eq(userListItem.listId, listId));
  return new Set(rows.map((r) => r.releaseGroupId).filter((id): id is string => id !== null));
}

/**
 * Cantidad de ítems de `releaseGroupIds` que el propio dueño tiene registrados
 * en su diario (cualquier escucha, sin filtro de audiencia — es lectura del
 * dueño sobre su propio progreso, D3 de design.md).
 */
async function countListened(ownerId: string, releaseGroupIds: string[]): Promise<number> {
  if (releaseGroupIds.length === 0) return 0;
  const [row] = await db
    .select({ n: sql<number>`count(distinct ${listenEntry.releaseGroupId})::int` })
    .from(listenEntry)
    .where(
      and(eq(listenEntry.userId, ownerId), inArray(listenEntry.releaseGroupId, releaseGroupIds)),
    );
  return row?.n ?? 0;
}

/** Estado derivado — nunca persistido (D3 de design.md). */
export function deriveJourneyState(
  archivedAt: Date | null,
  selectedCount: number,
  listenedCount: number,
): ArtistJourneyState {
  if (archivedAt) return "archived";
  if (selectedCount > 0 && listenedCount === selectedCount) return "complete";
  return "in_progress";
}

/**
 * Orden por año de lanzamiento ascendente, los sin año al final — mismo
 * criterio que ya usa `AlbumGrid` para la discografía de la página de
 * artista (`src/components/catalog/AlbumGrid.tsx`), para que el modal de
 * gestión no presente un orden distinto al que el usuario ya vio ahí.
 * Desempate alfabético por título.
 */
export function sortDiscographyByYear<T extends { title: string; firstReleaseYear: number | null }>(
  discography: T[],
): T[] {
  return [...discography].sort((a, b) => {
    if (a.firstReleaseYear === null && b.firstReleaseYear === null) {
      return a.title.localeCompare(b.title);
    }
    if (a.firstReleaseYear === null) return 1;
    if (b.firstReleaseYear === null) return -1;
    return a.firstReleaseYear - b.firstReleaseYear || a.title.localeCompare(b.title);
  });
}

async function buildDetail(
  listRow: { id: string; journeyArchivedAt: Date | null; createdAt: Date },
  ownerId: string,
  artistId: string,
  discography: ReleaseGroupRow[],
): Promise<ArtistJourneyDetail> {
  const selectedIds = await selectedReleaseGroupIds(listRow.id);
  const listenedCount = await countListened(ownerId, [...selectedIds]);
  const state = deriveJourneyState(listRow.journeyArchivedAt, selectedIds.size, listenedCount);

  return {
    artistId,
    state,
    activatedAt: listRow.createdAt.toISOString(),
    progress: { selectedCount: selectedIds.size, listenedCount },
    albums: sortDiscographyByYear(discography).map((rg) => ({
      id: rg.id,
      title: rg.title,
      category: rg.category as ReleaseGroupCategory,
      firstReleaseYear: rg.firstReleaseYear,
      coverThumbUrl: rg.coverThumbUrl,
      selected: selectedIds.has(rg.id),
    })),
  };
}

/**
 * Detalle del recorrido de un artista para su dueño, con la discografía
 * completa agrupable por categoría. `null` si el usuario nunca activó un
 * recorrido sobre este artista (no es un estado — ver Requirement "Estados
 * derivados del recorrido").
 */
export async function getArtistJourneyDetail(
  ownerId: string,
  artistId: string,
): Promise<ArtistJourneyDetail | null> {
  const artistRow = await requireArtist(artistId);
  const [journeyRow, discography] = await Promise.all([
    getJourneyRow(ownerId, artistId),
    findOrIngestDiscography(artistRow),
  ]);
  if (!journeyRow) return null;
  return buildDetail(journeyRow, ownerId, artistId, discography);
}

/**
 * Activa un recorrido sobre un artista, de forma idempotente: si ya existe
 * uno, lo devuelve sin modificarlo. Al crearse por primera vez, pre-puebla la
 * selección con los álbumes de categoría `studio` (Requirement "Activar un
 * recorrido de artista").
 */
export async function activateArtistJourney(
  ownerId: string,
  artistId: string,
): Promise<ArtistJourneyDetail> {
  const artistRow = await requireArtist(artistId);
  const discography = await findOrIngestDiscography(artistRow);

  const existing = await getJourneyRow(ownerId, artistId);
  if (existing) {
    return buildDetail(existing, ownerId, artistId, discography);
  }

  const [created] = await db
    .insert(userList)
    .values({
      ownerId,
      entityType: "release-group",
      title: `Recorrido: ${artistRow.name}`.slice(0, 100),
      audience: "private",
      kind: "artist_journey",
      journeyArtistId: artistId,
    })
    // Condición de carrera de doble activación: el índice único parcial
    // (owner_id, journey_artist_id) arbitra el conflicto.
    .onConflictDoNothing({ target: [userList.ownerId, userList.journeyArtistId] })
    .returning();

  const listRow = created ?? (await getJourneyRow(ownerId, artistId));
  if (!listRow) throw new ApiError("INTERNAL_ERROR", 500, "No se pudo activar el recorrido");

  if (created) {
    const studioAlbums = discography.filter((rg) => rg.category === "studio");
    if (studioAlbums.length > 0) {
      await db.insert(userListItem).values(
        studioAlbums.map((rg, index) => ({
          listId: listRow.id,
          releaseGroupId: rg.id,
          position: index + 1,
        })),
      );
    }
  }

  return buildDetail(listRow, ownerId, artistId, discography);
}

/**
 * Reemplaza de una sola vez toda la selección del recorrido propio por
 * `releaseGroupIds` (Requirement "Guardar la selección en una sola
 * operación"): el modal de gestión edita un borrador local sin llamar al
 * servidor por cada casillero, y recién en "Guardar" envía el conjunto
 * final completo. Calcula el `diff` contra la selección actual y aplica
 * solo lo que cambió (altas y bajas) en una transacción — no vacía y
 * reinserta todo, para no perder la posición de los ítems que se
 * mantienen.
 */
export async function setJourneySelection(
  ownerId: string,
  artistId: string,
  releaseGroupIds: string[],
): Promise<ArtistJourneyDetail> {
  const listRow = await requireOwnedJourney(ownerId, artistId);
  const artistRow = await requireArtist(artistId);
  const discography = await findOrIngestDiscography(artistRow);

  const validIds = new Set(discography.map((rg) => rg.id));
  const nextIds = new Set(releaseGroupIds);
  for (const id of nextIds) {
    if (!validIds.has(id)) {
      throw new ApiError("VALIDATION_ERROR", 400, "Uno de los álbumes no pertenece a este artista");
    }
  }

  const currentIds = await selectedReleaseGroupIds(listRow.id);
  const toRemove = [...currentIds].filter((id) => !nextIds.has(id));
  const toAdd = [...nextIds].filter((id) => !currentIds.has(id));

  if (toRemove.length > 0 || toAdd.length > 0) {
    await db.transaction(async (tx) => {
      if (toRemove.length > 0) {
        await tx
          .delete(userListItem)
          .where(
            and(
              eq(userListItem.listId, listRow.id),
              inArray(userListItem.releaseGroupId, toRemove),
            ),
          );
      }
      if (toAdd.length > 0) {
        const [maxPos] = await tx
          .select({ max: max(userListItem.position) })
          .from(userListItem)
          .where(eq(userListItem.listId, listRow.id));
        let position = maxPos?.max ?? 0;
        await tx
          .insert(userListItem)
          .values(
            toAdd.map((releaseGroupId) => ({
              listId: listRow.id,
              releaseGroupId,
              position: ++position,
            })),
          )
          .onConflictDoNothing({ target: [userListItem.listId, userListItem.releaseGroupId] });
      }
    });
  }

  return buildDetail(listRow, ownerId, artistId, discography);
}

/** Archiva un recorrido propio. Conserva selección y progreso. */
export async function archiveArtistJourney(
  ownerId: string,
  artistId: string,
): Promise<ArtistJourneyDetail> {
  const listRow = await requireOwnedJourney(ownerId, artistId);
  const artistRow = await requireArtist(artistId);
  const discography = await findOrIngestDiscography(artistRow);
  const [updated] = await db
    .update(userList)
    .set({ journeyArchivedAt: new Date() })
    .where(eq(userList.id, listRow.id))
    .returning();
  return buildDetail(updated ?? { ...listRow, journeyArchivedAt: new Date() }, ownerId, artistId, discography);
}

/** Desarchiva un recorrido propio, de forma reversible. */
export async function unarchiveArtistJourney(
  ownerId: string,
  artistId: string,
): Promise<ArtistJourneyDetail> {
  const listRow = await requireOwnedJourney(ownerId, artistId);
  const artistRow = await requireArtist(artistId);
  const discography = await findOrIngestDiscography(artistRow);
  const [updated] = await db
    .update(userList)
    .set({ journeyArchivedAt: null })
    .where(eq(userList.id, listRow.id))
    .returning();
  return buildDetail(updated ?? { ...listRow, journeyArchivedAt: null }, ownerId, artistId, discography);
}

/** Borra un recorrido propio de forma física e irreversible. */
export async function deleteArtistJourney(ownerId: string, artistId: string): Promise<void> {
  const listRow = await requireOwnedJourney(ownerId, artistId);
  await db.delete(userList).where(eq(userList.id, listRow.id));
}

/**
 * Cuenta, para un conjunto de `listId` de recorridos, la selección y lo
 * escuchado de cada uno en una sola consulta agregada (no N+1). Compartida
 * por `journeyStatesForArtists` y `listMyArtistJourneys`.
 *
 * LEFT JOIN contra `listen_entry` puede multiplicar filas si el dueño
 * escuchó el mismo álbum más de una vez — por eso ambos agregados cuentan
 * `DISTINCT user_list_item.id` (un ítem por álbum, invariante ya
 * garantizada por la unicidad `(list_id, release_group_id)` de
 * `user_list_item`), no `count(*)`.
 */
async function countsByListId(
  ownerId: string,
  listIds: string[],
): Promise<Map<string, { selected: number; listened: number }>> {
  const result = new Map<string, { selected: number; listened: number }>();
  if (listIds.length === 0) return result;

  const counts = await db
    .select({
      listId: userListItem.listId,
      selected: sql<number>`count(distinct ${userListItem.id})::int`,
      listened: sql<number>`count(distinct ${userListItem.id}) filter (where ${listenEntry.id} is not null)::int`,
    })
    .from(userListItem)
    .leftJoin(
      listenEntry,
      and(
        eq(listenEntry.releaseGroupId, userListItem.releaseGroupId),
        eq(listenEntry.userId, ownerId),
      ),
    )
    .where(inArray(userListItem.listId, listIds))
    .groupBy(userListItem.listId);

  for (const c of counts) result.set(c.listId, { selected: c.selected, listened: c.listened });
  return result;
}

/**
 * Estado derivado de los recorridos no archivados de `ownerId` sobre
 * `artistIds`, en una sola consulta agregada — para la faceta de la sección
 * "Exploración" del perfil (D6 de design.md, spec `artist-following`). Los
 * artistas sin recorrido, o con uno archivado, no aparecen en el mapa.
 */
export async function journeyStatesForArtists(
  ownerId: string,
  artistIds: string[],
): Promise<Map<string, Extract<ArtistJourneyState, "in_progress" | "complete">>> {
  const result = new Map<string, "in_progress" | "complete">();
  if (artistIds.length === 0) return result;

  const journeys = await db
    .select({ id: userList.id, artistId: userList.journeyArtistId })
    .from(userList)
    .where(
      and(
        eq(userList.ownerId, ownerId),
        eq(userList.kind, "artist_journey"),
        sql`${userList.journeyArchivedAt} IS NULL`,
        inArray(userList.journeyArtistId, artistIds),
      ),
    );
  if (journeys.length === 0) return result;

  const countsByList = await countsByListId(
    ownerId,
    journeys.map((j) => j.id),
  );
  for (const journey of journeys) {
    if (!journey.artistId) continue;
    const count = countsByList.get(journey.id);
    const selected = count?.selected ?? 0;
    const listened = count?.listened ?? 0;
    result.set(journey.artistId, selected > 0 && listened === selected ? "complete" : "in_progress");
  }
  return result;
}

export interface ArtistJourneySummary {
  artistId: string;
  artistName: string;
  artistPhotoUrl: string | null;
  state: ArtistJourneyState;
}

/**
 * Listado propio de todos los recorridos del usuario (en curso, completos y
 * archivados), para la superficie de acceso `/me/artist-journeys` — punto de
 * entrada desde el menú de usuario. Sin progreso ni fracciones (mismo criterio
 * que la faceta de perfil): solo estado, orden por activación descendente.
 */
export async function listMyArtistJourneys(ownerId: string): Promise<ArtistJourneySummary[]> {
  const rows = await db
    .select({
      listId: userList.id,
      artistId: userList.journeyArtistId,
      artistName: artist.name,
      artistPhotoUrl: artist.photoUrl,
      journeyArchivedAt: userList.journeyArchivedAt,
      createdAt: userList.createdAt,
    })
    .from(userList)
    .innerJoin(artist, eq(artist.id, userList.journeyArtistId))
    .where(and(eq(userList.ownerId, ownerId), eq(userList.kind, "artist_journey")))
    .orderBy(desc(userList.createdAt), desc(userList.id));

  const countsByList = await countsByListId(
    ownerId,
    rows.map((r) => r.listId),
  );

  return rows.map((row) => {
    const count = countsByList.get(row.listId);
    const state = deriveJourneyState(
      row.journeyArchivedAt,
      count?.selected ?? 0,
      count?.listened ?? 0,
    );
    return {
      artistId: row.artistId as string,
      artistName: row.artistName,
      artistPhotoUrl: row.artistPhotoUrl,
      state,
    };
  });
}
