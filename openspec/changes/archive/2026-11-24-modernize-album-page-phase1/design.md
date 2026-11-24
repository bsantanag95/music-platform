## Context

`AlbumLayout` (`src/app/[locale]/(catalog)/album/[id]/(tabs)/layout.tsx`) monta, en un `main` de `max-w-6xl`, la miga de pan con
Compartir y una cabecera en rejilla con áreas: `AlbumCover` (250 px en escritorio, 96 px en el teléfono junto a la identidad),
`AlbumIdentity` (antetítulo de tipo de obra, título de 36 px, artistas), `GenreChips`, `AlbumFacts` (filas Lanzamiento, Duración,
Edición, Sello), `CommunityStats` (franja de celdas compartida con la canción, `CommunityStrip`) y `AlbumRelationPanel` en la columna
derecha (con su estado anónimo: «Valora, reseña y registra tus escuchas» + «Iniciar sesión»). Debajo, las pestañas fijas
(`AlbumTabs`), el contenido, la franja de discografía y los comentarios.

La ficha de artista estrenó en noviembre su portada (`modernize-artist-page-phase1`, `ArtistStage` + `artist-stage.ts`): fondo de
carátulas, velo de tinta, disco dibujado, retrato circular, ficha en líneas y «Seguir a {artista}» para el visitante.

La auditoría del 2026-11-24 comparó A · Portada, B · Funda y C · Ficha (`mockups/album-2026-11/`); el usuario eligió **A**. Dos
preguntas quedaron sin respuesta y se toman con el valor por defecto más conservador: Reseñas y Comentarios **siguen separados**
(la Fase 3 deja una sola invitación) y el resumen de ediciones por formato va en la columna lateral de Canciones (Fase 2).

## Plan en tres fases

| Fase | Cambio | Alcance |
| --- | --- | --- |
| 1 | `modernize-album-page-phase1` (este) | **Portada:** fondo con la carátula desenfocada, funda con el vinilo asomando (≤ 250 px), línea de tipo y año, título grande, ficha en una línea con producción y «N ediciones →», «Valorar este disco» para el visitante y el panel con sesión, comunidad sin ceros, 88rem, funda primero en el teléfono. |
| 2 | `modernize-album-page-phase2` | **Canciones:** compositores bajo cada canción (de `byTrack`), columna lateral «En este disco» (formación con su instrumento, producción, ediciones por formato con enlace) y escala de títulos. |
| 3 | `modernize-album-page-phase3` | **Conversación y cierre:** una sola invitación a opinar (Reseñas vacía sin su propio aviso de sesión, Comentarios con la suya), franja de discografía sin barra visible y con la escala nueva, estados vacíos. |

Cada fase se archiva, se fusiona y se publica antes de abrir la siguiente.

## Goals / Non-Goals

**Goals:** portada con la carátula como protagonista, coherente con la del artista; nada vacío ni en cero para el visitante; la
primera canción no más abajo que hoy en el teléfono.

**Non-Goals:** Fases 2 y 3, pestañas y URL, datos, carátula por encima de 250 px.

## Decisions

### Capas compartidas con la portada del artista
El vinilo dibujado (`VINYL`), el velo de tinta y el fondo desenfocado de una carátula pasan de `ArtistStage.tsx` a
`src/components/catalog/stage-layers.tsx` (`StageVeil`, `StageAmbient`, `DrawnVinylLayer`, `VINYL_STYLE`). `ArtistStage` los usa sin
cambiar su resultado (sus tests lo cubren). `AlbumStage` (servidor) los combina: con carátula, `StageAmbient` con la miniatura del
disco (blur 70 px, opacidad .85: solo color) y el velo; sin carátula, `DrawnVinylLayer`.
*Alternativa descartada:* un componente de portada genérico con modos: el artista elige muro/abanico/vinilo por cantidad de
carátulas y el álbum tiene siempre una; compartir las capas basta.

### Funda con el vinilo asomando, sin pasar de 250 px
La carátula sigue saliendo de `AlbumCover` (miniatura de 250 px con reintentos y relleno), a `w-[min(250px,42vw)]` en el
teléfono y 250 px desde `sm`. Detrás, un disco de vinilo (`VINYL_STYLE`, 92 % del alto) desplazado un 30 % a la derecha, decorativo.
La spec ya limita la carátula a 250 px por licencia; la propuesta A la dibujaba a 320 px y se ajusta.

### Identidad y ficha en una línea
- Línea de contexto en mono: tipo de obra traducido y año («Álbum de estudio · 1982»); reemplaza el antetítulo.
- `<h1>` en `clamp(2.5rem, 5.6vw, 5.25rem)`, artistas en `font-display` ámbar debajo.
- `AlbumFacts` conserva sus datos pero se presenta en una línea `flex-wrap` separada por espacio: géneros (fichas), fecha completa,
  «8 pistas · 40:22», sello, producción (los productores del nivel `production` de `loadAlbumPersonnel`, hasta 2, enlazados) y
  «N ediciones →» a la pestaña Ediciones cuando existe; la edición mostrada («Estándar») queda en la pestaña Ediciones. Cada dato
  conserva su rótulo para lectores de pantalla (`dt` `sr-only`).

### Acción principal: Valorar para el visitante, el panel con sesión
Sin sesión no se monta `AlbumRelationPanel`: la columna derecha muestra el botón ámbar «Valorar este disco» hacia `/auth/login`
(sin retorno genérico, como hoy) y la frase «Necesitas una cuenta para valorar, reseñar y registrar tus escuchas.». Con sesión, el
panel entero ocupa la columna (18rem) sobre una superficie opaca, sin cambios en sus filas. En el teléfono, la acción o el panel van
después de la ficha y antes de las pestañas.

### Comunidad sin ceros
`CommunityStats` deja fuera las celdas en 0 (Valoraciones 0, Lo coleccionan 0) y no se dibuja si no queda ninguna celda ni enlace de
listas ni histograma. Va dentro de la portada, debajo de la ficha. `CommunityStrip` no cambia: la canción sigue igual.

### Teléfono
La funda va primero a media anchura, luego la identidad y la ficha; la frase de la invitación se oculta para no empujar las canciones.
Objetivo medido: primera canción a ≤ 743 px a 390 px.

## Risks / Trade-offs

- [Carátulas oscuras dan un fondo casi negro] → Es solo color; el disco dibujado y la funda siguen dando forma. Se verifica con una
  carátula clara para el contraste del texto.
- [La portada alarga la cabecera en escritorio] → Las pestañas pasan de 536 a ~560 px; a cambio la carátula y el título ganan peso.
- [Quitar la columna al visitante cambia la spec del panel] → El estado anónimo pasa a la invitación de la portada, igual que el
  artista.

## Migration Plan

Sin datos ni API; revertir el commit restaura la cabecera anterior.

## Open Questions

Ninguna bloqueante. Si el usuario prefiere unificar Reseñas y Comentarios, la Fase 3 se reescribe antes de implementarla.
