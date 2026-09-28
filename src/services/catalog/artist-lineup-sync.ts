import { inArray } from "drizzle-orm";
import { after } from "next/server";
import { db } from "@/db";
import { artist } from "@/db/schema";
import { needsFactsRefresh, syncArtistProfileFacts } from "./artist-profile";
import { lineupSyncOrder } from "./artist-lineup";

// Sincronización en segundo plano de los integrantes y músicos de apoyo de un artista (openspec:
// add-artist-lineup-data, design D6): la ficha y la alineación de cada persona, en una request,
// sin Wikimedia. De ahí salen sus otras bandas ("También en") y su fecha de muerte.

/**
 * Tope por visita. La cola de MusicBrainz es global al proceso (≥1,1 s entre requests): 10
 * personas la ocupan unos 11 s, lo que acota cuánto espera la ingesta de otro usuario.
 */
export const LINEUP_MEMBERS_PER_VISIT = 10;

/**
 * Artistas con una corrida en curso en esta instancia. No es un candado de PostgreSQL: ocuparía
 * una conexión del pool toda la corrida. Entre instancias, el candado de la ficha de cada persona
 * (que relee la vigencia) evita repetir su request.
 */
const running = new Set<string>();

export interface LineupMembersSyncResult {
  status: "synced" | "running";
  synced: number;
  failed: number;
}

/** Personas de la alineación con MBID y alineación pendiente o vencida, en orden de prioridad. */
export async function lineupMembersToSync(artistId: string, limit = LINEUP_MEMBERS_PER_VISIT): Promise<string[]> {
  const order = await lineupSyncOrder(artistId);
  if (order.length === 0) return [];
  const rows = await db
    .select({ id: artist.id, mbid: artist.mbid, profileSyncedAt: artist.profileSyncedAt, lineupSyncedAt: artist.lineupSyncedAt })
    .from(artist)
    .where(inArray(artist.id, order));
  const due = new Set(rows.filter((row) => row.mbid !== null && needsFactsRefresh(row)).map((row) => row.id));
  return order.filter((id) => due.has(id)).slice(0, limit);
}

/** Sincroniza hasta `limit` personas en serie; un fallo con una no detiene a las demás. */
export async function syncLineupMembers(
  artistId: string,
  { limit = LINEUP_MEMBERS_PER_VISIT }: { limit?: number } = {},
): Promise<LineupMembersSyncResult> {
  if (running.has(artistId)) return { status: "running", synced: 0, failed: 0 };
  running.add(artistId);
  try {
    let synced = 0;
    let failed = 0;
    for (const personId of await lineupMembersToSync(artistId, limit)) {
      try {
        if ((await syncArtistProfileFacts(personId)).status === "synced") synced += 1;
      } catch (error) {
        failed += 1;
        console.error(`[artist-lineup] no se pudo sincronizar a ${personId} (alineación de ${artistId})`, error);
      }
    }
    return { status: "synced", synced, failed };
  } finally {
    running.delete(artistId);
  }
}

/**
 * Programa la sincronización de integrantes después de responder. Fuera de una request de Next
 * (scripts) `after()` no está disponible: se omite y la próxima visita la vuelve a programar.
 */
export function scheduleLineupMembersSync(artistId: string): void {
  try {
    after(() => syncLineupMembers(artistId).then(() => undefined));
  } catch {
    console.warn(`[artist-lineup] sincronización de integrantes de ${artistId} omitida: fuera de una request`);
  }
}
