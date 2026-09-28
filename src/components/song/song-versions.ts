import type { VersionDisc, VersionEntry } from "@/services/catalog/recording-versions";

// Filas de "Otras versiones" (openspec: song-versions-tabs): una fila por disco, con sus
// grabaciones como variantes. La variante es lo que el título agrega al de la canción
// ("version 1", "Earl's Court, May 25, 1975"); nada se deduce fuera del propio título.

const sameText = (a: string, b: string) => a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();

/** Lo que el título de una grabación agrega al de la canción, o `null` si no agrega nada. */
export function variantLabel(title: string, songTitle: string): string | null {
  const clean = title.trim();
  const song = songTitle.trim();
  if (sameText(clean, song)) return null;
  if (!clean.toLocaleLowerCase().startsWith(song.toLocaleLowerCase())) return clean;
  const rest = clean.slice(song.length).trim();
  const wrapped = rest.match(/^\(([^()]*)\)$/) ?? rest.match(/^\[([^[\]]*)\]$/);
  if (wrapped) return wrapped[1]!.trim() || null;
  const separated = rest.match(/^[-–—:]\s*(.*)$/);
  if (separated) return separated[1]!.trim() || null;
  // "Stairway to Heavens" no es una variante de "Stairway to Heaven": título completo.
  return rest ? clean : null;
}

export interface VersionDiscRow {
  key: string;
  disc: VersionDisc | null;
  /** Artista de la fila cuando no es el de la canción. */
  artist: { id: string; name: string } | null;
  recordings: VersionEntry[];
}

/**
 * Agrupa las grabaciones por disco (y artista, si es otro) conservando el orden: el de la
 * primera grabación de cada disco. Una grabación sin disco va sola en su fila.
 */
export function groupByDisc(entries: VersionEntry[], songArtistIds: Set<string>): VersionDiscRow[] {
  const rows = new Map<string, VersionDiscRow>();
  for (const entry of entries) {
    const artist = entry.artist && !songArtistIds.has(entry.artist.id) ? entry.artist : null;
    const key = `${artist?.id ?? ""}|${entry.disc?.releaseGroupId ?? `recording:${entry.recordingId}`}`;
    const row = rows.get(key);
    if (row) row.recordings.push(entry);
    else rows.set(key, { key, disc: entry.disc, artist, recordings: [entry] });
  }
  return [...rows.values()];
}
