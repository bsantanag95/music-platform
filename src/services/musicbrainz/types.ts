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

export interface MBReleaseGroupWithReleases extends MBReleaseGroup {
  releases?: { id: string; status?: string; date?: string }[];
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
