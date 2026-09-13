// Tipos de "Recorrido de artista" (openspec: add-artist-journey).
// Reutiliza user_list/user_list_item con el subtipo kind = 'artist_journey'
// — ver docs/00-product/product_philosophy.md §6.4.

// Exactamente tres estados, sin un cuarto estado "pendiente" (§6.4.1).
// "complete" y "in_progress" se DERIVAN en el momento de lectura, nunca se
// persisten — ver `deriveJourneyState` en artist-journeys.ts.
export const ARTIST_JOURNEY_STATES = ["in_progress", "complete", "archived"] as const;
export type ArtistJourneyState = (typeof ARTIST_JOURNEY_STATES)[number];
