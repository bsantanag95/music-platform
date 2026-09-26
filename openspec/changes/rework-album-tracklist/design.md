## Context

`TrackList` (client component) recibe del Server Component de la pestaña `listenedIds`,
`favoriteIds` y `communityFavoriteIds`. La fila usa una grilla
`[2rem | título | marcas 2.75rem | duración 3.5rem | menú 1.5rem]`; las marcas son
caracteres (✦, ✓) y hacen que la fila con marca mida 57 px frente a 51 px (medido en
*Man's Best Friend* a 1280 px). A 1280 px la columna del título mide 916 px, así que la
duración queda a ~900 px del número de pista. El menú tiene 7 acciones y un control de
24×24 px. Valorar abre `DualRating variant="starsOnly"`; registrar escucha abre
`ListenEntryForm` al instante. `getAlbumPersonalExtras` ya trae escuchas y favoritos por
grabación en consultas agrupadas; no trae valoraciones.

## Goals / Non-Goals

Ver `proposal.md`.

## Decisions

### D1. Valoraciones propias por pista en el servidor

`getAlbumPersonalExtras` suma `ownTrackRatings: Map<recordingId, { stars, detailedScore }>`
con una consulta `rating WHERE user_id = $1 AND recording_id IN (...)`. La página lo pasa a
`TrackList` como objeto plano. Sin endpoint nuevo.

### D2. Grilla de la fila

Escritorio: `[# 2rem | título 1fr | estado 7.5rem | duración 3.5rem | menú 2.5rem]`. La
columna de estado contiene, en este orden y con anchos fijos: estrellas propias
(solo lectura, 5 × 11 px), marca de escuchada (16 px), corazón (botón 28 px de área).
Favorita de la comunidad ✦ pasa junto al título (es un atributo de la canción, no tuyo).
Móvil: duración y columna de estado bajo el título, menú a la derecha con 40 px.
Todas las marcas son SVG `size-4` con `shrink-0`: alto uniforme.

Fila: `rounded` y `hover:bg-ink-surface focus-within:bg-ink-surface` en escritorio.

### D3. Estrellas de solo lectura

Componente `StarRatingDisplay` (en `components/social/`), mismo trazado que
`StarRatingInput`, con `role="img"` y `aria-label` "Tu nota: 4,5 estrellas". Pulsar las
estrellas de una fila abre el mismo editor en línea que "Valorar" (D4) — atajo, no
requisito.

### D4. Editor de valoración en línea

Panel bajo la fila con `StarRatingInput` + "Quitar nota" (con `ConfirmDialog`). Guardado
optimista con la misma regla que el panel: `detailedScore` solo si
`isScoreCoherent(stars, score)`; si se descarta, aviso `role="status"`. Tras guardar se
actualiza `ownTrackRatings` local. Secuencia por pista para aplicar solo la última
respuesta (misma técnica que el panel).

### D5. Registro de escucha

Tras `createListenEntry`, estado `{ key, entry }` con confirmación "Escucha registrada ·
Agregar detalles"; el `ListenEntryForm` solo se abre al pedirlo.

### D6. Cabecera y pie

`<h2 className="sr-only">`; la línea "Edición mostrada · Ver ediciones" con `sm:hidden`
(la ficha técnica se contrae por debajo de `sm`). Pie de total solo con `multiDisc`.
Leyenda ✦ encima de la lista cuando `communityFavoriteIds.length > 0`.

### D7. Menú

Se retira "Ir a la canción". El botón de `RowMenu` recibe una clase de tamaño para el área
táctil (`size-10` en móvil, `sm:size-8`), sin cambiar `RowMenu` para otras superficies
(prop `triggerClassName` si hace falta).

## Risks / Trade-offs

- Un corazón por fila agrega ruido → contorno de baja intensidad cuando está inactivo.
- Descartar el puntaje detallado al cambiar estrellas → mismo aviso que el panel.

## Migration Plan

Solo lectura y UI.

## Open Questions

Ninguna.
