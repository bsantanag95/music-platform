## 1. Compositores

- [x] 1.1 Página Canciones: `songwriters` por `recordingId` desde `personnel.byTrack.tracks[id].songwriting` (personas únicas, `creditedAs` si existe)
- [x] 1.2 `TrackList`: línea de compositores bajo el título (mono xs, enlazada, `sr-only` «Composición:»), antes de invitados y «Versión de …»; sin autores, nada
- [x] 1.3 Tests de `TrackList`: un autor, varios, ninguno

## 2. Columna «En este disco»

- [x] 2.1 `AlbumOnThisRecord.tsx`: Formación (`levels.members` + `useRoleFormatter`), Producción (productores primero, hasta 4, «Todos los créditos →»), Ediciones por familia (`formatFamily`, solo con más de una edición, «Ver las N ediciones →»); cada bloque se omite sin datos
- [x] 2.2 Página Canciones: rejilla `lg:grid-cols-[minmax(0,1fr)_20rem]` solo si la columna tiene algún bloque; debajo de la lista por debajo de `lg`
- [x] 2.3 Mensajes `catalog.album.onThisRecord` (es/en): título, Formación, Producción, Ediciones, enlaces, «Composición»
- [x] 2.4 Tests de la columna y de la página: bloques, omisiones, sin datos

## 3. Documentación y verificación

- [x] 3.1 `pnpm run i18n:client-messages`
- [x] 3.2 `docs/05-features/catalog-browsing.md`: compositores y «En este disco» en Canciones
- [x] 3.3 `pnpm run verify` y `pnpm run build`
- [x] 3.4 Navegador a 1440, 1024, 820 y 390 px, sin sesión: The Number of the Beast, un disco sin créditos, uno con una sola edición; sin desbordes; la primera canción no se mueve
