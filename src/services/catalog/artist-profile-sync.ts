import { after } from "next/server";
import type { ArtistRow } from "@/db/schema";
import { needsProfileRefresh, syncArtistProfileFacts } from "./artist-profile";
import { enrichArtistFromWikimedia } from "./artist-wikimedia";

// Orquestación del perfil de artista en segundo plano (openspec: enrich-artist-profile): la
// ficha de MusicBrainz primero (trae el `wikidata_id`), después Wikimedia. Nunca bloquea la
// página: un fallo deja el dato pendiente para la próxima visita.

export interface ArtistProfileRefreshResult {
  facts: "synced" | "skipped" | "error";
  wikimedia: "enriched" | "no-wikidata" | "skipped" | "error";
}

/** Ficha y Wikimedia de un artista, cada una si está pendiente o vencida (o forzada). */
export async function refreshArtistProfile(
  artistId: string,
  options: { dryRun?: boolean; force?: boolean } = {},
): Promise<ArtistProfileRefreshResult> {
  let facts: ArtistProfileRefreshResult["facts"] = "error";
  // En simulación la ficha no se guarda: Wikimedia usa el id que la ficha acaba de leer.
  let wikidataId: string | null | undefined;
  try {
    const result = await syncArtistProfileFacts(artistId, options);
    facts = result.status;
    if (options.dryRun && result.status === "synced") wikidataId = result.facts.wikidataId;
  } catch (error) {
    console.error(`[artist-profile] no se pudo sincronizar la ficha de ${artistId}`, error);
  }
  let wikimedia: ArtistProfileRefreshResult["wikimedia"] = "error";
  try {
    wikimedia = (await enrichArtistFromWikimedia(artistId, { ...options, wikidataId })).status;
  } catch (error) {
    console.error(`[artist-profile] no se pudo enriquecer ${artistId} desde Wikimedia`, error);
  }
  return { facts, wikimedia };
}

/**
 * Programa la actualización del perfil después de responder, si hace falta. Fuera de una
 * request de Next (scripts) `after()` no está disponible: se omite y la próxima visita la
 * vuelve a programar.
 */
export function scheduleArtistProfileRefresh(
  target: Pick<ArtistRow, "id" | "mbid" | "profileSyncedAt" | "wikimediaSyncedAt">,
): void {
  if (!needsProfileRefresh(target)) return;
  try {
    after(() => refreshArtistProfile(target.id).then(() => undefined));
  } catch {
    console.warn(`[artist-profile] actualización de ${target.id} omitida: fuera de una request`);
  }
}
