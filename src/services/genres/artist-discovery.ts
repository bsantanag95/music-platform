import { DISCOVER_MIN_ARTISTS, GENRE_DISCOGRAPHY_PREFETCH, GENRE_OVERVIEW_ARTISTS } from "./constants";
import { listGenreArtists, type GenreArtist } from "./artists";

// Riel «Para descubrir» (openspec: add-genre-artist-discovery, capability `genre-artist-discovery`):
// artistas del género o de sus subgéneros con discografía corta (explorada y de 1 a 5 discos propios) y
// debut conocido, y, con sesión, sin los que la persona ya conoce por acciones explícitas suyas. Orden
// fijo `descubrir` (señal de comunidad, seguidores, debut reciente, nombre): el mismo para todas las
// personas con las mismas acciones, sin aleatoriedad ni afinidad. Bajo `DISCOVER_MIN_ARTISTS` elegibles
// no es un riel: devuelve `[]` y la página lo omite.

export async function getGenreDiscoverArtists(genreId: string, readerId: string | null): Promise<GenreArtist[]> {
  const { artists } = await listGenreArtists(genreId, {
    pageSize: GENRE_OVERVIEW_ARTISTS,
    sort: "discover",
    shortOnly: true,
    debutKnownOnly: true,
    hideKnown: true,
    readerId,
  });
  return artists.length >= DISCOVER_MIN_ARTISTS ? artists : [];
}

/**
 * Artistas del género con la discografía sin explorar y con MBID, los de más álbumes del género primero, para
 * completar su discografía en segundo plano cuando el riel «Para descubrir» trae pocos artistas. El riel solo
 * muestra artistas con la discografía explorada: sin esto no tendría de dónde crecer. El tope es el del
 * completado por visita.
 */
export async function getGenreDiscoverCompletionCandidates(genreId: string): Promise<GenreArtist[]> {
  const { artists } = await listGenreArtists(genreId, {
    pageSize: GENRE_DISCOGRAPHY_PREFETCH,
    sort: "albums",
    unexploredOnly: true,
  });
  return artists;
}
