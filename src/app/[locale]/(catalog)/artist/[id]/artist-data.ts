import { cache } from "react";
import { getArtistById, ensureArtistMemberships } from "@/services/catalog/ingest-artist";
import { findOrIngestOwnDiscography } from "@/services/catalog/ingest-discography";
import { getArtistDiscography, getDiscographyMarks } from "@/services/catalog/artist-discography-view";
import { getArtistCommunityStats } from "@/services/catalog/artist-community";
import { getArtistPersonalState } from "@/services/catalog/artist-personal";
import { getArtistProfile, type ProfileLocale } from "@/services/catalog/artist-profile-read";
import { getArtistLineup } from "@/services/catalog/artist-lineup";
import { resolveSession } from "@/services/auth/sessions";
import { getUserPermissions } from "@/services/auth/authorization";

// Cargas de la página de artista compartidas entre el layout de pestañas, cada pestaña y
// `generateMetadata` (openspec: redesign-artist-page, design D1). `cache()` deduplica por
// request: la cabecera y la pestaña Discografía piden el mismo artista y la misma
// discografía sin consultarlos dos veces.

/** Artista por id; enriquece los stubs contra MusicBrainz (`getArtistById`). */
export const loadArtist = cache((id: string) => getArtistById(id));

export const loadSession = cache(() => resolveSession());

export const loadCanModerate = cache(async (userId: string) =>
  (await getUserPermissions(userId)).includes("moderation.suspend_social"),
);

/**
 * Asegura pertenencias y la discografía propia (la primera visita ingiere; después, se
 * resincroniza en segundo plano) y devuelve su vista por secciones. Nunca ingiere la
 * discografía de los grupos de una persona (design D2 y D8).
 */
/** Sincronización fría de pertenencias (con sus períodos y el apoyo), una vez por request. */
const loadMemberships = cache(async (id: string) => {
  const artist = await loadArtist(id);
  if (artist) await ensureArtistMemberships(artist);
  return artist;
});

export const loadDiscography = cache(async (id: string) => {
  const artist = await loadMemberships(id);
  if (!artist) return null;
  await findOrIngestOwnDiscography(artist);
  return getArtistDiscography(artist.id);
});

/** Discos de la discografía propia con crédito principal (escuchas, colección, oyentes). */
export const loadOwnReleaseGroupIds = cache(async (id: string) => {
  const view = await loadDiscography(id);
  return (view?.sections ?? []).filter((s) => s.key !== "appearances").flatMap((s) => s.items.map((item) => item.id));
});

export const loadProfile = cache(async (id: string, locale: ProfileLocale) => {
  const artist = await loadArtist(id);
  return artist ? getArtistProfile(artist, locale) : null;
});

export const loadCommunityStats = cache(async (id: string) =>
  getArtistCommunityStats(id, await loadOwnReleaseGroupIds(id)),
);

export const loadPersonalState = cache(async (userId: string, id: string) =>
  getArtistPersonalState(userId, id, await loadOwnReleaseGroupIds(id)),
);

export const loadDiscographyMarks = cache(async (userId: string, id: string) => {
  const view = await loadDiscography(id);
  return getDiscographyMarks(userId, (view?.sections ?? []).flatMap((s) => s.items.map((item) => item.id)));
});

/**
 * Alineación del artista (openspec: add-artist-members-tab, design D1): la usan la barra de
 * pestañas, la fila de la ficha y la pestaña Integrantes o Bandas, con una sola lectura. Nunca
 * consulta MusicBrainz más allá de la sincronización fría de pertenencias.
 */
export const loadLineup = cache(async (id: string) => {
  const artist = await loadMemberships(id);
  return artist ? getArtistLineup(artist.id) : null;
});
