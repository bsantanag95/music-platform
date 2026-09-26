## 1. Datos

- [x] 1.1 `getAlbumPersonalExtras` devuelve `ownTrackRatings` (una consulta agrupada) (D1)
- [x] 1.2 La pestaña Canciones pasa las valoraciones a `TrackList`
- [x] 1.3 Tests de `album-personal`

## 2. Piezas

- [x] 2.1 `StarRatingDisplay` de solo lectura con `aria-label` (D3) + test
- [x] 2.2 `RowMenu` admite clase para el tamaño del control, si hace falta (D7)

## 3. Tracklist

- [x] 3.1 Cabecera: `h2` solo para lectores de pantalla, línea de edición solo en móvil, pie solo con varios discos (D6)
- [x] 3.2 Grilla y marcas SVG de tamaño fijo; ✦ junto al título; resaltado de fila (D2)
- [x] 3.3 Estrellas propias siempre visibles y corazón conmutador con `aria-pressed` (D2, D3)
- [x] 3.4 Leyenda de "Favorita de la comunidad" (D6)
- [x] 3.5 Menú sin "Ir a la canción" y control de 40 px (D7)
- [x] 3.6 Editor de valoración en línea con `StarRatingInput`, quitar con confirmación y aviso de puntaje descartado (D4)
- [x] 3.7 Registrar escucha con confirmación y "Agregar detalles" (D5)
- [x] 3.8 i18n `catalog.album.tracks` (es/en), quitando claves huérfanas
- [x] 3.9 Reescribir `TrackList.test.tsx` según los escenarios de la spec

## 4. Documentación y verificación

- [x] 4.1 Actualizar `docs/05-features/catalog-browsing.md` (pestaña Canciones)
- [x] 4.2 `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build` (con el servidor de desarrollo detenido)
- [x] 4.3 Navegador con sesión: alto uniforme, resaltado, estrellas y corazón por fila, valorar/quitar, registrar escucha; móvil sin desborde
