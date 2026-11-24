## 1. Capas compartidas y portada

- [x] 1.1 `src/components/catalog/stage-layers.tsx`: `VINYL_STYLE`, `StageVeil`, `StageAmbient` (miniatura desenfocada, solo color) y `DrawnVinylLayer`, movidos desde `ArtistStage.tsx`; `ArtistStage` los reutiliza sin cambiar su resultado (sus tests siguen verdes)
- [x] 1.2 `AlbumStage.tsx` (servidor): con carátula, fondo desenfocado + velo; sin carátula, disco dibujado; capas `aria-hidden`
- [x] 1.3 Funda: `AlbumCover` a `w-[min(250px,42vw)]` / 200–250 px con el vinilo decorativo asomando detrás (sin pasar de 250 px)

## 2. Identidad, ficha y comunidad

- [x] 2.1 `AlbumIdentity`: línea de contexto «tipo de obra · año» en mono, `<h1>` en `clamp(2.5rem,5.6vw,5.25rem)`, artistas debajo
- [x] 2.2 `AlbumFacts` en una línea con rótulos `sr-only`: géneros, fecha, pistas y duración, sello, producción (hasta 2 productores del nivel `production`, enlazados) y «N ediciones →» cuando existe la pestaña
- [x] 2.3 `CommunityStats`: celdas en 0 fuera; sin celdas, enlace ni histograma, no se dibuja (`CommunityStrip` sin cambios)

## 3. Acción principal y página

- [x] 3.1 Sin sesión: `AlbumRateInvite` con «Valorar este disco» (ámbar, a `/auth/login`) + frase (oculta en el teléfono), sin montar `AlbumRelationPanel`; con sesión, el panel en la columna derecha sobre superficie opaca
- [x] 3.2 `layout.tsx`: `main` a 88rem (`px-4 sm:px-8 xl:px-12`), portada a todo el ancho con miga y Compartir dentro, la rejilla de áreas reemplazada por portada + columna; en el teléfono funda primero a media anchura
- [x] 3.3 Mensajes `catalog.album` (es/en): valorar, frase, rótulos de ficha (producción, ediciones), línea de contexto
- [x] 3.4 Tests de la cabecera, del panel y de las páginas del álbum: portada con y sin carátula, visitante sin panel, comunidad sin ceros, ficha en línea con producción y ediciones

## 4. Documentación y verificación

- [x] 4.1 `pnpm run i18n:client-messages`
- [x] 4.2 `docs/05-features/catalog-browsing.md`: la portada del álbum y el plan de las Fases 2 y 3; `docs/03-data/data-licensing.md`: la carátula del disco como fondo desenfocado (250 px, solo color)
- [x] 4.3 `pnpm run verify` y `pnpm run build`
- [x] 4.4 Navegador a 1440, 1024, 820 y 390 px, sin sesión: un álbum con carátula oscura (The Number of the Beast), uno con carátula clara, uno sin carátula; primera canción ≤ 743 px a 390; sin desbordes; pestañas fijas
