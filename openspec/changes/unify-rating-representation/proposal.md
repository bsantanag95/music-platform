## Why

Hoy la valoración de un usuario se dibuja de cuatro maneras distintas según la pantalla: estrellas SVG (panel "Tu relación", tracklist), la escalera de cinco barras `FeedRatingMeter` (feed, valoraciones destacadas y reseñas del perfil), texto `★`/`★★★½` (índice y artículo de reseña, comentarios populares, marcas de la discografía) y chips numéricos 0,5–5 en el compositor de reseñas. Las barras ascendentes se leen como nivel de señal, volumen o estadística y no como una nota: quien llega nuevo no sabe si 3 barras es "regular", y no se ve cómo representar medias estrellas sin perder legibilidad. El problema no es el símbolo, sino que el mismo dato cambia de símbolo de una pantalla a otra.

## What Changes

- Una sola representación de la valoración de un usuario en toda la plataforma: **estrellas de 0,5 a 5**, en dos formas (fila de cinco estrellas y forma compacta `★ 4,5`). Se establece como regla: un dato "nota de un usuario" nunca se dibuja con otro símbolo.
- **BREAKING (visual)**: se elimina `FeedRatingMeter` (escalera de barras). Sus tres consumidores — feed de actividad, "Valoraciones destacadas" y reseñas del perfil — pasan a la fila de estrellas (`StarRatingDisplay`), sin cambiar el número que la acompaña.
- Las estrellas repetidas como texto (`★★★½` en `ReviewIndex` y `ReviewArticle`) pasan a la fila de estrellas SVG, que dibuja bien la media estrella. Las formas compactas `★ 4,5` (comentarios populares, fila compacta del feed, marca de la discografía) se conservan: ya son estrellas.
- El compositor de reseñas (`ReviewComposer`) reemplaza los diez chips numéricos por `StarRatingInput`, el mismo control del panel "Tu relación".
- Se elimina `DualRating` (y su test): sin ningún consumidor, era el otro lugar con chips numéricos.
- El símbolo de barras deja de ser un componente de puntuación. No se crea ni se modifica ningún logo o favicon en este cambio.
- Se actualizan las specs y `/docs` que describen el medidor VU (`activity-feed`, `user-profile`, `lists-and-favorites`, `ratings-and-reviews`).

## Goals

- Que quien ve una nota la interprete igual en cualquier pantalla sin aprender un símbolo nuevo.
- Que valorar dentro de una reseña se haga igual que valorar en el panel del álbum.
- Dejar una regla escrita (spec nueva) para que el próximo componente que muestre una nota no invente otro símbolo.

## Non-Goals

- La escala 1–100 (puntaje detallado): su rango, su presentación y su coherencia con las estrellas se discuten aparte. Este cambio no toca `detailedScore`, `scoreRange` ni `RatingDetailDialog`, y conserva el texto numérico actual junto a las estrellas (`4.5` / `4.5 · 87`).
- Crear o rediseñar un logo, favicon o estados vacíos con las barras. Si se quiere usar el símbolo como marca, es una decisión de identidad separada.
- Cambios de API, contratos, esquema de base de datos o promedios.
- El histograma de la comunidad (`album-community-stats`, `TasteFingerprint`): ya son barras de distribución reales, no la nota de un usuario.

## Capabilities

### New Capabilities
- `rating-display`: regla de representación de la valoración de un usuario (estrellas 0,5–5 en fila o compacta, accesibilidad, relación con el número) y qué no puede usarse para ese dato.

### Modified Capabilities
- `activity-feed`: el rating del feed se muestra con la fila de estrellas en lugar del medidor de barras; sigue exento del glifo por tipo porque las estrellas ya cumplen ese rol.
- `album-review`: (requisito añadido) el compositor de reseñas elige las estrellas con el control de estrellas, y el índice y el artículo de reseña las muestran como fila de estrellas.

`rating-highlights` y `profile-reviews` no cambian de requisitos: no nombran el medidor (hablan de "representación visual"), así que basta la regla de `rating-display` y el cambio de código.

## Impact

- Código: `src/components/feed/FeedRatingMeter.tsx` (se elimina, con su test), `FeedActivityList.tsx`, `src/components/profiles/RatingHighlights.tsx`, `ProfileReviews.tsx`, `src/components/social/StarRatingDisplay.tsx` (tamaño/variante compacta), `src/components/album/ReviewComposer.tsx`, `ReviewIndex.tsx`, `ReviewArticle.tsx`, `src/components/social/DualRating.tsx` (se elimina, con su test), mensajes `messages/{es,en}/feed.json` (claves `ratingMeterLabel*` si quedan huérfanas).
- Sin cambios de API, datos ni dependencias.
- Docs: `docs/05-features/activity-feed.md`, `user-profile.md`, `lists-and-favorites.md`, `ratings-and-reviews.md`, y `DESIGN.md` si menciona el medidor como lenguaje del rating.
- Diseño: las estrellas vacías añaden contorno en el feed donde las barras apagadas eran una línea gris; hay que confirmar que se mantiene la Regla de Rareza del ámbar (solo las estrellas llenas son ámbar).
