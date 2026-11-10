## MODIFIED Requirements

### Requirement: Enlaces curados

El sistema SHALL guardar, a partir de las relaciones de URL de MusicBrainz, solo estos
enlaces del artista, en este orden fijo: sitio oficial, Bandcamp, una plataforma de
streaming (la primera disponible entre Spotify, Apple Music, Deezer y YouTube Music) y la
página del artista en setlist.fm (relación `setlistfm` activa con host `setlist.fm`). El
enlace a Wikipedia SHALL derivarse del artículo en el idioma de lectura (capability
`artist-wikimedia-enrichment`). El sistema SHALL NOT guardar redes sociales, tiendas, otras
bases de datos ni el resto de las relaciones de URL; setlist.fm es la única base de datos
externa que se guarda, y solo como enlace (no se usa su API).

#### Scenario: Artista con muchas relaciones de URL

- **WHEN** un artista tiene sitio oficial, Bandcamp, Spotify, Apple Music, cinco redes
  sociales y Discogs en MusicBrainz
- **THEN** se guardan sitio oficial, Bandcamp y Spotify, en ese orden

#### Scenario: Sin Spotify

- **WHEN** un artista tiene Apple Music y Deezer, pero no Spotify
- **THEN** el enlace de streaming guardado es Apple Music

#### Scenario: Página en setlist.fm

- **WHEN** Mötley Crüe tiene en MusicBrainz las relaciones `setlistfm`, `songkick` y `bandsintown`
- **THEN** se guarda solo el enlace de setlist.fm, después del de streaming

#### Scenario: Relación setlistfm con otro host

- **WHEN** la relación `setlistfm` de un artista apunta a un host que no es `setlist.fm`
- **THEN** no se guarda enlace de setlist.fm
