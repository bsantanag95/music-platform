## Why

La auditoría de la página de artista (2026-10-30, Iron Maiden en 1280 y 375 px, sin sesión y con una cuenta de
prueba) encontró que la página hace trabajo de más y repite o muestra cosas vacías:

- **Cambiar de sección pide la página entera.** Las seis secciones (191 discos en Iron Maiden) ya están en el cliente,
  pero cada pastilla es un enlace `?section=` que vuelve al servidor: ~600 ms en desarrollo para mostrar datos que ya
  están en memoria.
- **La discografía del modal viaja en cada visita con sesión.** El layout lee otra vez la discografía y la serializa
  para el modal "Completar discografía", que casi nadie abre: 395 KB de HTML sin sesión contra 473 KB con sesión.
- **Biografía repite el resumen**: la cabecera sigue mostrando el primer párrafo con "Seguir leyendo →" hacia la
  pestaña en la que ya se está.
- **Columnas vacías en la tabla**: "Media" sale "—" en los 36 discos de Principal y "Tú" aparece sin sesión.
- **Móvil**: la comunidad ocupa tres filas (~150 px) y las seis secciones tres líneas antes del primer disco.

## What Changes

- Cambio de sección en el cliente con `history.pushState`; "atrás" vuelve a la sección anterior; clic con
  modificador abre otra pestaña.
- Nuevo `GET /api/catalog/artist/[id]/journey-albums`: el panel pide los discos al abrir el modal; el layout deja de
  leerlos y serializarlos.
- La cabecera no muestra el resumen en la pestaña Biografía.
- La tabla muestra "Media" solo si algún disco llega al umbral y "Tú" solo con sesión.
- Móvil: comunidad en una fila de tres; secciones en una línea con desplazamiento.

### Non-Goals

- Separar álbumes y EP, relleno de discos sin carátula, barra fija y décadas (Fase 2).
- Filtro "Sin valorar", resumen personal, premios y ficha de Biografía (Fase 3).
- La cabecera (foto, identidad, ficha, enlaces), recién pulida en `polish-artist-header`.

## Capabilities

### Modified Capabilities

- `artist-discography-view`: sección sin ida al servidor, columnas según los datos, secciones en una línea en móvil.
- `artist-personal-panel`: discos del modal de inicio bajo demanda.
- `artist-biography`: sin resumen repetido en la pestaña.
- `artist-page-layout`: comunidad en una fila también en móvil.

## Impact

`ArtistDiscography`, `ArtistRelationPanel`, `ArtistCommunity`, `ArtistTabs` (`HiddenOnTab`), el layout del
artista, `src/services/catalog/artist-journey-albums.ts`, el endpoint nuevo, `src/lib/api/{catalog,schemas}.ts`,
mensajes `catalog.artist.relation.journeyLoadError`, tests y docs (`04-api/contracts.md`, `04-api/errors.md`,
`05-features/catalog-browsing.md`). Sin cambios de esquema.
