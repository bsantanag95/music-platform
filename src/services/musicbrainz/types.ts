// Tipos mínimos — solo los campos que efectivamente consumimos.
// La respuesta real de MusicBrainz trae muchos más campos.

export interface MBArtistCreditItem {
  name: string;
  joinphrase?: string;
  artist: { id: string; name: string };
}

export interface MBArtistSummary {
  id: string; // mbid
  name: string;
  type?: string; // 'Person' | 'Group' | 'Orchestra' | 'Choir' | 'Character' | 'Other'
  disambiguation?: string;
}

export interface MBArtistRelation {
  type?: string;
  direction?: string;
  attributes?: string[];
  begin?: string;
  end?: string;
  artist?: MBArtistSummary;
}

export interface MBArtistDetail extends MBArtistSummary {
  relations?: MBArtistRelation[];
}

export interface MBArtistSearchItem extends MBArtistSummary {
  score?: number; // relevancia asignada por MusicBrainz (0-100), ya ordenado por score
}

export interface MBArtistSearchResponse {
  artists: MBArtistSearchItem[];
}

export interface MBReleaseGroup {
  id: string; // mbid
  title: string;
  "primary-type"?: string; // 'Album' | 'Single' | 'EP' | 'Broadcast' | 'Other'
  "secondary-types"?: string[]; // 'Compilation' | 'Live' | 'Remix' | 'Soundtrack' | ...
  "first-release-date"?: string; // 'YYYY' | 'YYYY-MM' | 'YYYY-MM-DD' | ausente
  "artist-credit"?: MBArtistCreditItem[];
}

export interface MBReleaseGroupBrowseResponse {
  "release-groups": MBReleaseGroup[];
}

export interface MBReleaseGroupSearchItem {
  id: string; // mbid
  title: string;
  "primary-type"?: string; // 'Album' | 'Single' | 'EP' | 'Broadcast' | 'Other'
  "secondary-types"?: string[]; // 'Compilation' | 'Live' | 'Remix' | 'Soundtrack' | ...
  "first-release-date"?: string; // 'YYYY' | 'YYYY-MM' | 'YYYY-MM-DD' | ausente
  "artist-credit"?: MBArtistCreditItem[]; // requiere inc=artist-credits en la búsqueda
  score?: number;
}

export interface MBReleaseGroupSearchResponse {
  "release-groups": MBReleaseGroupSearchItem[];
}

/**
 * Edición (release) tal como llega embebida en `/release-group/{mbid}?inc=releases+media`.
 * Solo los campos que consume `pickRepresentativeRelease`.
 *
 * Disponibilidad observada en el browse de release-group:
 * - `status`, `date`, `country`, `disambiguation`, `title`, `packaging`: presentes.
 * - `media[].track-count`: presente con `inc=media`; si MusicBrainz lo omitiera para
 *   alguna edición, el criterio de recuento de pistas se degrada a "no aplica"
 *   (ver design.md D2) en vez de gastar un GET /release/{id} por candidato.
 */
export interface MBReleaseSummary {
  id: string; // mbid
  title?: string;
  status?: string; // 'Official' | 'Promotion' | 'Bootleg' | 'Pseudo-Release'
  date?: string; // 'YYYY' | 'YYYY-MM' | 'YYYY-MM-DD' | ausente
  country?: string; // 'US' | 'GB' | 'XW' (Worldwide) | 'XE' (Europe) | ...
  packaging?: string | null; // 'Jewel Case' | 'Box' | 'Digipak' | ...
  disambiguation?: string;
  media?: { "track-count"?: number }[];
}

export interface MBReleaseGroupWithReleases extends MBReleaseGroup {
  releases?: MBReleaseSummary[];
}

export interface MBRecordingSearchItem {
  id: string; // mbid
  title: string;
  disambiguation?: string; // ej. 'live, 1972-06-27: Long Beach Arena'
  length?: number; // milisegundos
  "first-release-date"?: string; // 'YYYY' | 'YYYY-MM' | 'YYYY-MM-DD' | ausente
  "artist-credit"?: MBArtistCreditItem[]; // requiere inc=artist-credits en la búsqueda
  score?: number;
}

export interface MBRecordingSearchResponse {
  recordings: MBRecordingSearchItem[];
}

/** Release-summary devuelta por el browse `/release?recording=` con `inc=release-groups`. */
export interface MBReleaseWithReleaseGroup {
  id: string; // mbid
  title: string;
  status?: string;
  date?: string; // 'YYYY' | 'YYYY-MM' | 'YYYY-MM-DD' | ausente
  "release-group"?: {
    id: string; // mbid
    title: string;
    "primary-type"?: string;
    "secondary-types"?: string[];
  };
}

export interface MBReleaseBrowseResponse {
  releases: MBReleaseWithReleaseGroup[];
  /** Total de releases de la grabación (más allá de la página devuelta). */
  "release-count"?: number;
}

export interface MBTrack {
  position: number;
  recording: { id: string; title: string; length?: number };
  "artist-credit"?: MBArtistCreditItem[];
}

export interface MBMedium {
  position: number; // usado como disc_number
  tracks: MBTrack[];
}

export interface MBRelease {
  id: string; // mbid
  title: string;
  date?: string;
  media?: MBMedium[];
}
