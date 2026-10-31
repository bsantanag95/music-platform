import type { ArtistDiscographyItem } from "@/services/catalog/artist-discography-view";
import type { ArtistLineup } from "@/services/catalog/artist-lineup";
import type { BiographyFacts } from "./ArtistBiography";

/** Ficha lateral de Biografía (openspec: refine-artist-page-phase3, design D4): primer y último álbum, cuántos y la alineación. */
export function biographyFacts(artistName: string, albums: ArtistDiscographyItem[], lineup: ArtistLineup | null): BiographyFacts {
  const dated = albums.filter((item) => item.year !== null);
  const pick = (item: ArtistDiscographyItem | undefined) => (item ? { id: item.id, title: item.title, year: item.year } : null);
  return {
    artistName,
    firstAlbum: pick(dated[0]),
    latestAlbum: pick(dated[dated.length - 1]),
    albumCount: albums.length,
    lineup: !lineup
      ? null
      : lineup.kind === "group"
        ? { kind: "group", current: lineup.current.length, past: lineup.past.length }
        : { kind: "person", bands: lineup.groups.length },
  };
}
