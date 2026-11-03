## Decisions

### D1. Datos de artista desde la fila y una consulta por página

Foto, años y país ya están en `artist` (ficha de MusicBrainz y Wikimedia). Los discos se cuentan con
`primaryDiscCounts` solo para los artistas con discografía sincronizada (para el resto la cifra sería engañosa), en una
consulta por página. Los géneros de la mejor coincidencia se leen en la sección con `getArtistGenres` (un artista). Las
miniaturas siguen el criterio de "Tus artistas" y "Popular ahora": sin crédito en la miniatura; el crédito vive en la
página del artista.

### D2. Comunidad en el servicio, nota propia en la página y el endpoint

La media es pública: `albumCommunity` va en `searchAlbums` (un `GROUP BY` sobre los ids de la página) con el umbral
del álbum. La nota propia depende de la sesión: `withViewerStars` se aplica en la parte transmitida de la página y en
`GET /api/catalog/search` (para "Cargar más"), sin pasar la sesión al servicio de búsqueda.

### D3. Usuarios: cifras con su privacidad

`followerCounts` cuenta seguidores aceptados de cuentas activas solo de perfiles públicos (un privado dice "Perfil
privado"); "en común" reutiliza `countFollowedFollowersOf` (la cifra, nunca quiénes). Sin sesión, `UserCard` no
muestra acción y la lista lleva un aviso único.
