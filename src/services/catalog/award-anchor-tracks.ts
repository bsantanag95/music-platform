import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { awardNomination, releaseGroup } from "@/db/schema";
import { findOrIngestTracklist } from "./ingest-release";

// Ficha de canción de una grabación que llegó por los premios (ADR 0032, punto 3). La carga de premios crea la
// grabación como stub, sin `track`: la ficha se arma toda desde las pistas (disco principal, carátula, apariciones,
// créditos), así que sin ellas queda sin disco ni portada. La nominación guarda el disco ancla donde aparece; con
// el patrón de cacheo bajo demanda, si ese disco aún no tiene su lista de pistas se ingiere (la misma función que la
// página de álbum) y la ficha se completa. La carga de premios no puede hacerlo: nunca consulta MusicBrainz.
//
// No basta con mirar si la grabación ya tiene pistas: puede tenerlas solo en compilaciones ingeridas por otro camino
// y seguir sin su disco ancla. `findOrIngestTracklist` no consulta MusicBrainz si el disco ya tiene su edición
// representativa, así que repetirlo en cada visita cuesta una consulta local.

/** Discos ancla que se prueban por visita: una grabación suele tener uno solo. */
const MAX_ANCHORS = 2;

/**
 * Asegura la lista de pistas de los discos ancla de las nominaciones de la grabación. Una caída de MusicBrainz no
 * rompe la ficha: se registra y la ficha se muestra con lo que ya hay en la base.
 */
export async function ensureAnchorTracks(recordingId: string): Promise<void> {
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
    }
  }
}
