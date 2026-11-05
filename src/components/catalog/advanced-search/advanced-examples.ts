import type { SearchCriteria } from "@/services/catalog/search/filters";

// Ejemplos de la búsqueda avanzada sin campos (openspec: refine-advanced-search-phase2, design D5): tres por pestaña,
// como datos. El título se traduce (`catalog.search.advanced.examples.<key>`) y el subtítulo se arma con las etiquetas
// de la barra de criterios, así no se desincroniza de lo que el enlace busca.

export interface AdvancedExample {
  key: string;
  query?: string;
  criteria: SearchCriteria;
}

export const ADVANCED_EXAMPLES: Record<"artist" | "album" | "song", AdvancedExample[]> = {
  artist: [
    { key: "chileanBands80s", criteria: { artistType: "group", country: ["CL"], beginFrom: 1980, beginTo: 1989 } },
    { key: "manchesterBands", criteria: { artistType: "group", area: "Manchester" } },
    { key: "mexicanSoloistsSince1990", criteria: { artistType: "solo", country: ["MX"], beginFrom: 1990 } },
  ],
  album: [
    { key: "live1994", criteria: { category: ["live_other"], yearFrom: 1994, yearTo: 1994 } },
    { key: "pinkFloyd70s", criteria: { artist: "Pink Floyd", category: ["studio"], yearFrom: 1970, yearTo: 1979 } },
    { key: "radioheadEps", criteria: { artist: "Radiohead", artistExact: true, category: ["single_ep"] } },
  ],
  song: [
    { key: "radioheadLong", criteria: { artist: "Radiohead", durMin: 420 } },
    { key: "thrillerSongs", criteria: { album: "Thriller", albumExact: true, artist: "Michael Jackson" } },
    { key: "ramonesShort", criteria: { artist: "Ramones", durMax: 120 } },
  ],
};
