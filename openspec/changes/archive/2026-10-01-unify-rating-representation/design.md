## Context

La nota de un usuario (½–5) se dibuja hoy con cuatro lenguajes:

| Lenguaje | Dónde | Componente |
|---|---|---|
| Estrellas SVG (½ dibujada) | panel "Tu relación" (álbum, canción), fila de la tracklist | `StarRatingInput` / `StarRatingDisplay` / `StarGlyph` |
| Escalera de 5 barras ámbar + número | feed, "Valoraciones destacadas" y reseñas del perfil | `FeedRatingMeter` |
| Texto `★★★½` | `ReviewIndex`, `ReviewArticle` | `Stars` local / JSX inline |
| Texto `★ 4,5` | comentarios populares, `CompactActivityRow`, marca de la discografía | JSX inline |
| Chips numéricos 0,5–5 | compositor de reseñas; `DualRating` (sin consumidores) | JSX inline |

`FeedRatingMeter` se diseñó a propósito como "lenguaje visual propio del rating en el feed" y declara que va siempre con número porque "la marca es refuerzo, no la única señal". Esa es justo la señal de que no se entiende sola. `StarRatingDisplay` ya existe, es solo lectura y comparte el trazado con el input, pero solo lo usa la tracklist.

## Goals / Non-Goals

**Goals:**
- Una única familia visual (estrellas) para el dato "nota de un usuario", en dos formas: fila y compacta.
- Un único control para elegir estrellas (`StarRatingInput`).
- Quitar código muerto o duplicado (`FeedRatingMeter`, `DualRating`) en vez de dejarlo coexistiendo.

**Non-Goals:**
- El puntaje detallado 1–100 (se discute aparte): su valor, rango y texto siguen igual.
- Logo, favicon o estados vacíos con las barras.
- API, datos y promedios.

## Decisions

**D1. Reutilizar `StarRatingDisplay`, no crear un componente de estrellas nuevo.** Ya dibuja media estrella, es `role="img"` con una sola etiqueta y comparte `StarGlyph` con el input, así que lo que se ve al elegir coincide con lo que se ve al leer. Alternativa descartada: un componente de estrellas propio del feed, que repetiría el error de tener un lenguaje por superficie.

**D2. Un pequeño envoltorio para "estrellas + número" (`StarRatingValue`).** Los tres consumidores de `FeedRatingMeter` reciben `stars: string`, `detailedScore` y una `label` ya localizada y renderizan el número al lado. El envoltorio (en `src/components/social/`) conserva esa firma, renderiza `StarRatingDisplay` + el texto `4.5` / `4.5 · 87` y reutiliza la `label`. Así el cambio en los consumidores es cambiar el import y no la lógica de etiquetas. Alternativa: que cada consumidor componga `StarRatingDisplay` y el número: triplica el formato numérico.

**D3. Dos formas y no una.** La fila de cinco estrellas no cabe en la franja sobre la carátula de la discografía, la fila compacta del feed ni los comentarios populares. Esos sitios ya usan `★ 4,5`, que sigue siendo una estrella. Se conservan y se documentan como la forma compacta en vez de forzar la fila. Alternativa descartada: fila en todas partes: rompe la densidad de esas superficies, sin ganar claridad porque ya se leen como estrella.

**D4. `ReviewIndex` y `ReviewArticle` pasan a la fila SVG.** Hoy construyen `★★★½` con el carácter `½`, que no se ve como media estrella. Se usa `StarRatingDisplay` con el tamaño de esas filas. La etiqueta accesible incluye el valor (hoy es un `sr-only` con el número suelto).

**D5. El compositor usa `StarRatingInput` con el mismo `legend`/`valueLabel` del panel.** `ReviewComposer` mantiene su estado `stars` y su regla de "no publicar sin estrellas" (`needsStars`); solo cambia el control. Se reutilizan las claves de mensajes del panel para los rótulos por valor.

**D6. Se elimina `DualRating`.** La búsqueda de imports muestra que solo lo importa su propio test; el panel de relación lo reemplazó. Dejarlo dejaría chips numéricos vivos en la base de código que contradicen la regla nueva. Las claves de mensajes que solo usaba se borran si quedan huérfanas.

**D7. Regla de Rareza del ámbar.** Las barras apagadas eran gris neutro y solo las encendidas ámbar; en `StarGlyph` el contorno es `text-paper-muted` y solo el relleno es ámbar. La cantidad de ámbar es la misma para igual nota; lo que cambia es que hay cinco contornos en vez de cinco barras grises. Se acepta y se verifica a ojo en el feed con varias filas.

**D8. Regla escrita, no solo código.** La spec `rating-display` fija la regla para futuras superficies, y `docs/05-features/ratings-and-reviews.md` la resume, de modo que el próximo componente que muestre una nota no invente un símbolo.

## Risks / Trade-offs

- [Más ruido visual en el feed: cinco contornos por fila en lugar de barras diminutas] → tamaño `size-3` como en la tracklist; revisar en una página de feed con muchos ratings y, si pesa, atenuar el contorno vacío (`text-paper-muted` ya es el tono más bajo disponible) o mostrar solo la forma compacta en las filas agrupadas.
- [Repetición: estrellas y `4.5` cuentan lo mismo] → se mantiene porque el número es la señal exacta y las estrellas el reconocimiento rápido; se reevaluará junto con la escala 1–100, que decide cómo convive el puntaje detallado con las estrellas.
- [Cambio visible en superficies que los usuarios ya conocen] → es un cambio puramente de presentación, sin datos ni contratos; se revierte con el commit.
- [Tests que afirman la estructura del medidor] → se eliminan con `FeedRatingMeter` y se reemplazan por los de `StarRatingValue`; los tests de feed, perfil y reseñas que buscan la etiqueta accesible no cambian porque la `label` se conserva.

## Migration Plan

Sin migración de datos. Orden: crear `StarRatingValue` → migrar los tres consumidores → eliminar `FeedRatingMeter` → migrar `ReviewIndex`/`ReviewArticle` → `ReviewComposer` → eliminar `DualRating` → docs. Rollback: revertir el commit.

## Open Questions

- ¿El número junto a las estrellas (`4.5 · 87`) sigue igual cuando se decida la escala 1–100? Se deja como está y se decide en ese cambio.
- ¿Se quiere dar al símbolo de barras un uso de marca (logo, favicon, estados vacíos)? Hoy no existe ese uso en el código; queda como decisión de identidad aparte.
