## Why

La escala 1–100 existe desde el inicio como "valoración detallada" opcional, pero nunca se decidió su papel: no se dijo para quién es, dónde se muestra ni cómo convive con las estrellas. El resultado es incoherente: aparece como `4,5 · 87` junto a las estrellas en el feed y el perfil (donde duplica el dato y expone un puntaje que el resto del producto trata como íntimo), como `86/100` en el panel, como una media en el bloque de comunidad del álbum (cifra que con pocos votos aparenta una precisión que no existe) y no sirve de nada fuera de ahí. Además hay que tener las estrellas primero para poder usarla, lo que deja fuera a quien piensa directamente en 100 puntos.

Se define como lo que es: un **refinamiento opcional de las estrellas** para la minoría que rankea (desempatar quince discos de 4★, ordenar una discografía, armar un top del año), no un segundo sistema de notas.

## What Changes

- **Papel.** Las estrellas siguen siendo siempre la nota protagonista; el puntaje 1–100 es secundario y opcional. La coherencia estrellas ↔ puntaje se mantiene (bandas lineales de 10 puntos por media estrella: ½★ = 1–10 … 5★ = 91–100) y el `CHECK` de la base no cambia.
- **Entrada en cualquier orden.** Se puede puntuar primero con el número: las estrellas se derivan solas (`estrellas = ⌈puntaje / 10⌉ / 2`, p. ej. 86 → 4,5★). El diálogo de puntuación deja de exigir estrellas previas, acepta 1–100 y muestra en vivo la equivalencia ("86 → 4,5★") y, si cambia las estrellas vigentes, de qué valor a cuál.
- **API de valoración.** `PUT /api/catalog/{target}/{id}/ratings` acepta `{ detailedScore }` solo (deriva las estrellas) además de `{ stars }` y `{ stars, detailedScore }`; sin ninguno responde `400 VALIDATION_ERROR`. La regla de coherencia y `INVALID_RATING` no cambian.
- **Dónde se muestra el número.** Solo en: panel "Tu relación" (álbum y canción), la reseña propia, las valoraciones destacadas del perfil y como desempate del orden "Tú" de la discografía propia. **No** en el feed, ni en las reseñas del perfil, ni en la tracklist, las carátulas de la discografía o las filas compactas.
- **Formato.** `86/100`. Cuando hay puntaje se muestra estrellas + `86/100` y se omite el `4,5` duplicado; sin puntaje, estrellas + `4,5`. Se retira el formato `4,5 · 87` de todas partes.
- **Sin colores.** La nota no se codifica con color (ni semáforo ni escala): el número usa un tono neutro con peso tipográfico. Se aparta del ámbar de reposo, que queda para el relleno de las estrellas.
- **Comunidad.** El promedio de la comunidad queda solo en estrellas: se retira la media del puntaje detallado del bloque de comunidad del álbum. El campo `averageDetailedScore` del contrato se conserva (no se rompe el contrato) pero ninguna superficie lo muestra.
- **Alcance.** Álbum y canción. El artista no tiene estrellas en su página y queda fuera.

## Capabilities

### New Capabilities
- `detailed-score`: la escala 1–100 como refinamiento de las estrellas: papel, bandas de coherencia, derivación de estrellas desde el puntaje, entrada en cualquier orden (diálogo y API) y regla de no exponer un promedio.

### Modified Capabilities
- `rating-display`: formato `86/100` o `4,5` (nunca los dos), superficies donde el puntaje se muestra y donde no, y ausencia de codificación por color.
- `album-personal-panel`: el diálogo de puntaje deja de exigir estrellas previas, acepta 1–100 con equivalencia en vivo (el requisito "Puntaje detallado en diálogo" se reemplaza por "Puntaje detallado con o sin estrellas previas"). El panel de la canción usa el mismo diálogo y su spec (`song-personal-panel`) ya remite a las reglas del álbum, así que no cambia.
- `activity-feed`: el rating del feed (fila y corrida plegada) muestra estrellas + `4,5`, sin puntaje.
- `album-community-stats`: el bloque de comunidad deja de mostrar la media del puntaje detallado (requisitos "Bloque de comunidad del álbum" y "Umbral mínimo de agregados").
- `artist-discography-view`: el orden "Tú" desempata por puntaje detallado antes que por título (requisito "Contenido de la tabla").

## Goals

- Que las estrellas sean la nota en todas partes y el puntaje un detalle opcional y discreto.
- Que quien piensa en 100 puntos pueda puntuar sin pasar por las estrellas.
- Que un mismo dato no tenga dos verdades: coherencia garantizada por la base y derivación determinista.
- Que el número sirva donde importa (rankear lo propio), no como ruido en las superficies de otras personas.

## Non-Goals

- Colores, semáforo o cualquier escala visual para la nota.
- Promedio o histograma del puntaje de la comunidad; ordenar o filtrar por el puntaje de otros.
- Migrar el esquema: `rating.detailed_score` y su `CHECK` no cambian. No se reescriben valoraciones existentes.
- El compositor de reseñas sigue eligiendo estrellas (no se añade entrada por número ahí) y el endpoint de reseñas no cambia.
- Escalas alternativas por usuario (0–10, letras, etc.) o una preferencia de escala.
- El artista como objetivo de valoración.

## Impact

- Código: `src/lib/rating-range.ts` (+ derivación y equivalencia), `src/services/social.ts` y `src/lib/api/schemas.ts` (`PUT` ratings), `src/components/album/RatingDetailDialog.tsx`, `AlbumRelationPanel.tsx`, `src/components/song/SongRelationPanel.tsx`, `src/components/social/StarRatingValue.tsx`, `src/components/feed/FeedActivityList.tsx`, `src/components/profiles/RatingHighlights.tsx` y `ProfileReviews.tsx`, `src/components/album/AlbumHeader.tsx`, `src/components/artist/ArtistDiscography.tsx`, la tarjeta de la reseña propia, mensajes `messages/{es,en}`.
- API: `PUT /api/catalog/{target}/{id}/ratings` acepta `detailedScore` solo (compatible hacia atrás). Actualiza `docs/04-api/contracts.md`.
- Docs: `docs/01-domain/business-rules.md`, `docs/05-features/ratings-and-reviews.md`, `docs/04-api/contracts.md`, `docs/00-product` si menciona la escala.
- Sin migraciones ni dependencias nuevas.
