import { z } from "zod";
import { apiFetch } from "./client";
import {
  ArtistJourneyDetailResponseSchema,
  ArtistJourneyDetailSchema,
  type ArtistJourneyDetail,
} from "./schemas";

export function getArtistJourney(artistId: string): Promise<ArtistJourneyDetail | null> {
  return apiFetch(
    `/api/me/artist-journeys/${artistId}`,
    ArtistJourneyDetailResponseSchema,
  ).then((response) => response.journey);
}

export function activateArtistJourney(artistId: string): Promise<ArtistJourneyDetail> {
  return apiFetch(`/api/me/artist-journeys/${artistId}`, ArtistJourneyDetailResponseSchema, {
    method: "POST",
  }).then((response) => {
    if (!response.journey) throw new Error("El servidor no devolvió el recorrido activado");
    return response.journey;
  });
}

export function deleteArtistJourney(artistId: string): Promise<null> {
  return apiFetch(`/api/me/artist-journeys/${artistId}`, z.null(), { method: "DELETE" });
}

/**
 * Reemplaza de una sola vez toda la selección del recorrido. El modal de
 * gestión edita un borrador local (sin llamar al servidor por cada
 * casillero) y llama a esto solo al guardar.
 */
export function setArtistJourneySelection(
  artistId: string,
  releaseGroupIds: string[],
): Promise<ArtistJourneyDetail> {
  return apiFetch(
    `/api/me/artist-journeys/${artistId}/items`,
    z.object({ journey: ArtistJourneyDetailSchema }),
    {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ releaseGroupIds }),
    },
  ).then((response) => response.journey);
}

export function archiveArtistJourney(artistId: string): Promise<ArtistJourneyDetail> {
  return apiFetch(
    `/api/me/artist-journeys/${artistId}/archive`,
    z.object({ journey: ArtistJourneyDetailSchema }),
    { method: "POST" },
  ).then((response) => response.journey);
}

export function unarchiveArtistJourney(artistId: string): Promise<ArtistJourneyDetail> {
  return apiFetch(
    `/api/me/artist-journeys/${artistId}/archive`,
    z.object({ journey: ArtistJourneyDetailSchema }),
    { method: "DELETE" },
  ).then((response) => response.journey);
}
