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

export interface MBArtistSearchResponse {
  artists: MBArtistSummary[];
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
