## 1. Datos

- [x] 1.1 `getAlbumPersonnel` selecciona `release.mbid` de la edición representativa y lo expone como `AlbumPersonnel.releaseMbid`
- [x] 1.2 La página de Créditos pasa `releaseMbid` a `AlbumCredits`; ajustar mocks de pruebas que construyen `AlbumPersonnel`

## 2. Autoría en las filas del primer nivel

- [x] 2.1 `PeopleView` arma el mapa `artistId → SongwriterEntry` y `CreditRow` dibuja la línea de autoría (roles con `useRoleFormatter`, pistas con `TrackRefs`, prefijo solo para lectores de pantalla)
- [x] 2.2 Pruebas: integrante que compuso muestra "música, letra · todas"; integrante sin autoría no muestra la línea; Composición sigue listando a los integrantes

## 3. Resumen de Composición con integrantes

- [x] 3.1 Textos `songwritingSummaryMembers`, su variante con "y N más" y `songwritingSummaryAllMembers` en `es` y `en`
- [x] 3.2 `CollapsibleLevel` usa el resumen con integrantes cuando el artista principal es un grupo y hay autoras en el primer nivel
- [x] 3.3 Pruebas: "5 · 4 integrantes + Donna McDaniel", "3 · todas integrantes", solista con resumen general

## 4. Roles en el resumen de niveles cortos

- [x] 4.1 `CollapsibleLevel` con 3 personas o menos muestra "Nombre (primer rol)" separados por " · ", también en Arte y otros
- [x] 4.2 Pruebas: nivel de 3 con roles y contraído; nivel largo sin cambios; Composición con integrantes sigue usando su resumen

## 5. Atribución enlazada

- [x] 5.1 Nota de fuente con `t.rich` y enlace a `musicBrainzReleaseUrl(releaseMbid)` en pestaña nueva, con aviso accesible; sin MBID queda como texto
- [x] 5.2 Pruebas: enlace con la URL de la edición, `target="_blank"` y nombre accesible; sin MBID no hay enlace

## 6. Documentación y verificación

- [x] 6.1 Actualizar la pestaña Créditos en `docs/05-features/catalog-browsing.md`
- [x] 6.2 `pnpm run typecheck && pnpm run lint && pnpm test` y build en worktree aparte
- [x] 6.3 Verificación en el navegador con *Dr. Feelgood* (es y en) y un álbum de solista
