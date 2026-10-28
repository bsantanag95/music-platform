## Why

Las Fases 1 y 2 (`refine-artists-page-phase1`, `redesign-artists-toolbar`) arreglaron la base y la barra de
`/me/artists`, y el servicio ya trae por artista su novedad del calendario, su último disco y desde cuándo lo sigues.
Falta que la página lo muestre:

- **La fila no dice nada:** solo foto y nombre.
- **La novedad no se ve:** el segmento "Con novedades" filtra, pero ninguna fila dice qué sale ni cuándo.
- **Gráfico es solo una pared de fotos.**
- **No hay una vista de lo que viene** de los artistas que sigues.

## What Changes

- **Fila con detalle:** país · tipo (Solista, Grupo, Orquesta, Coro) · "Último: <disco> (año)" enlazado · "Lo sigues
  desde <mes año>".
- **Novedad en ámbar** en la fila: "Sale el 14 nov: «X»" o "Salió hace 5 días: «X»", enlazada al disco si está en el
  catálogo.
- **Sección "Con novedades"** arriba, con el resto debajo, en el segmento Todos cuando hay alguna; el orden elegido se
  conserva dentro de cada sección.
- **Gráfico:** insignia sobre la foto con la fecha ("14 nov") o "Nuevo".
- **Riel "Próximos lanzamientos"** desde `lg`: hasta seis novedades de los artistas que sigues, primero lo que sale y
  luego lo reciente. Sin novedades, no hay riel y la página conserva su ancho.

### Non-Goals

- Contar discos escuchados o mostrar "te faltan N" (§6.4.1).
- Avisos por artista.

## Capabilities

### Modified Capabilities

- `artist-following`: la superficie de gestión muestra el detalle, la novedad, la sección de novedades, las insignias
  de Gráfico y el riel de próximos lanzamientos.

## Impact

- `src/services/social/artist-following.ts` (`country`), `src/lib/api/schemas.ts`.
- `src/components/catalog/FollowedArtist*` (`FollowedArtistMeta`, `FollowedArtistReleasesRail`),
  `src/app/[locale]/me/artists/page.tsx`.
- `messages/{es,en}/users.json`, `docs/05-features/user-profile.md`. Sin cambios de esquema ni de API.
