## Why

Tercera fase del rediseño de los resultados de búsqueda (auditoría del 2026-11-02, respuestas recomendadas). Las filas no
ayudan a elegir: todos los artistas llevan el mismo ícono y el país como código ("US", "KR"), sin nada que separe a KISS
de sus homónimos; los álbumes no dicen qué tan valorado está un disco ni si ya lo valoraste; los usuarios son solo un
nombre, y sin sesión cada fila repite "Iniciar sesión para seguir".

## What Changes

- Artistas: foto de Commons, país por su nombre, años de actividad o de vida, discos en el catálogo (si se exploró); la
  mejor coincidencia suma hasta 3 géneros.
- Álbumes: media de la comunidad (desde 5 valoraciones) y tu nota, también en "Cargar más".
- Usuarios: seguidores (perfiles públicos), "N en común" con sesión, y un solo aviso para iniciar sesión.

## Capabilities

### Modified Capabilities

- `search-scopes`: filas de artistas y de usuarios.
- `catalog-search`: comunidad y nota propia en Álbumes.

## Impact

`src/services/catalog/search/{types,artists,albums,activity}.ts` (`primaryDiscCounts`, `albumCommunity`,
`viewerStars`, `withViewerStars`), `searchUsers` (`followersCount`, `inCommon`), `GET /api/catalog/search`
(`yourStars`), esquemas del cliente, `ArtistResults`, `AlbumResults`, `UserResults`, `UserCard` (`detail`),
`sections.tsx`, mensajes, tests y docs (`04-api/contracts.md`, `05-features/catalog-browsing.md`). Sin cambios de
esquema.
