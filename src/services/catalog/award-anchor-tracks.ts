import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { awardNomination, releaseGroup, track } from "@/db/schema";
import { findOrIngestTracklist } from "./ingest-release";

// Ficha de canción de una grabación que llegó solo por los premios (ADR 0032, punto 3). La carga de premios crea la
// grabación como stub, sin `track`: la ficha se arma toda desde las pistas (disco principal, carátula, apariciones,
// créditos), así que sin ellas queda sin disco ni portada. La nominación guarda el disco ancla donde aparece; con
// el patrón de cacheo bajo demanda, si faltan las pistas se ingiere la lista de pistas de ese disco (la misma función
// que la página de álbum) y la ficha se completa. La carga de premios no puede hacerlo: nunca consulta MusicBrainz.

/** Discos ancla que se prueban por visita: una grabación suele tener uno solo. */
const MAX_ANCHORS = 2;

const hasTracks = async (recordingId: string): Promise<boolean> => {
  const [row] = await db.select({ id: track.id }).from(track).where(eq(track.recordingId, recordingId)).limit(1);
  return row !== undefined;
};

/**
 * Si la grabación no tiene pistas pero una nominación la ancla a un disco, ingiere la lista de pistas de ese disco.
 * Devuelve `true` si ingirió pistas. Una caída de MusicBrainz no rompe la ficha: se registra y la ficha se muestra
 * como antes (los discos que ya tienen su lista no consultan nada).
 */
export async function ensureAnchorTracks(recordingId: string): Promise<boolean> {
  if (await hasTracks(recordingId)) return false;

  const anchors = await db
    .selectDistinct({ id: releaseGroup.id, mbid: releaseGroup.mbid })
    .from(awardNomination)
    .innerJoin(releaseGroup, eq(releaseGroup.id, awardNomination.anchorReleaseGroupId))
    .where(and(eq(awardNomination.recordingId, recordingId), isNotNull(releaseGroup.mbid)))
    .limit(MAX_ANCHORS);

  for (const anchor of anchors) {
    try {
      await findOrIngestTracklist(anchor.id, anchor.mbid!);
    } catch (error) {
      console.error(`No se pudo ingerir el disco ancla ${anchor.mbid} de la grabación ${recordingId}`, error);
      continue;
    }
    if (await hasTracks(recordingId)) return true;
  }
  return false;
}
