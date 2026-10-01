## Context

Estado actual de la valoración detallada (`rating.detailed_score`, 1–100, opcional):

- **Coherencia.** Un `CHECK` de la base y `validateRating` (servidor) exigen que el puntaje caiga en la banda de las estrellas: `(2·★ − 1)·10 + 1 … 2·★·10`. `src/lib/rating-range.ts` es el espejo para la UI (`scoreRange`, `isScoreCoherent`).
- **Entrada.** Solo después de elegir estrellas: el diálogo `RatingDetailDialog` se abre con las estrellas vigentes y limita el campo a su banda; con 0 estrellas el botón "+" del panel está deshabilitado. El `PUT` de ratings exige `stars`; `detailedScore` es opcional y reemplazar el rating sin `detailedScore` lo pone en `null`.
- **Salida.** `StarRatingValue` muestra `4,5 · 87` en el feed, las destacadas y las reseñas del perfil; el panel muestra `86/100`; `AlbumHeader` muestra la media del puntaje como detalle de la tarjeta de media; ninguna ordenación usa el puntaje.
- **Cambiar estrellas.** `rate()` del panel, `TrackList` y `AlbumQuickActions` conservan el puntaje solo si sigue coherente (`isScoreCoherent`) y, si no, lo quitan y avisan.

## Goals / Non-Goals

**Goals:**
- Definir el papel del puntaje (refinamiento opcional) y reflejarlo en entrada, salida, API y orden.
- Permitir puntuar primero con el número con derivación determinista de estrellas.
- Un solo formato y una sola regla de dónde se muestra.

**Non-Goals:**
- Colores, promedios o histogramas del puntaje, escalas alternativas, cambios de esquema, entrada por número en el compositor de reseñas, el artista como objetivo.

## Decisions

**D1. El puntaje es un refinamiento, no un segundo sistema.** Las estrellas son la nota en todas las superficies; el número es opcional y secundario. Los usuarios a quienes sirve (rankean, desempatan, vienen de plataformas con 100/10 puntos) son una minoría: el producto no les añade fricción a los demás. Alternativa descartada: promover el puntaje a nota principal (rompe el modelo, el feed y la identidad visual ya resuelta en `unify-rating-representation`).

**D2. Coherencia con bandas lineales, sin cambios en la base.** Se mantiene la tabla actual (½★ = 1–10 … 5★ = 91–100) y el `CHECK`. Es lineal, predecible y ya está implementada y validada. Su desajuste cultural (70 ≈ 3,5★ y no 4★) se mitiga mostrando la equivalencia en vivo, no con otra tabla. Alternativas descartadas: bandas centradas (no alinean con las medias estrellas, complican el `CHECK`) y relajar la coherencia (dos verdades para un mismo dato).

**D3. Derivación de estrellas en un único lugar.** `rating-range.ts` añade `starsFromScore(score) = ⌈score / 10⌉ / 2` y su inversa ya existe (`scoreRange`). El servidor deja de duplicar la fórmula en `validateRating` y usa las funciones del módulo (son puras y sin dependencias del navegador). Una prueba de ida y vuelta (para todo `score` de 1 a 100, `scoreRange(starsFromScore(score))` lo contiene) protege la coherencia con el `CHECK`.

**D4. API: `PUT` acepta `detailedScore` solo.** El cuerpo pasa a `{ stars?, detailedScore? }` con al menos uno:
- solo `stars`: como hoy (el reemplazo deja `detailedScore` en `null`);
- solo `detailedScore`: se derivan las estrellas;
- ambos: se valida coherencia como hoy (`INVALID_RATING` si no coincide);
- ninguno: `400 VALIDATION_ERROR`.
Es compatible hacia atrás: las llamadas existentes no cambian. Alternativa descartada: un endpoint nuevo para puntuar por número (duplica la autorización, el upsert y las pruebas). El endpoint de reseñas no cambia (el compositor sigue con estrellas).

**D5. El diálogo es libre en 1–100 y muestra la consecuencia.** `RatingDetailDialog` deja de recibir `own` obligatorio: abre con o sin valoración, el campo acepta 1–100 y debajo muestra la equivalencia ("86 → 4,5★"); si hay estrellas vigentes distintas, añade "cambia tus estrellas de 4★ a 4,5★" (texto accesible, `aria-live` educado). Guardar envía `{ detailedScore }` y las estrellas del servidor mandan. Las acciones "destacar" y "borrar" solo aparecen con valoración existente. El botón "+" del panel (álbum y canción) deja de estar deshabilitado sin estrellas. Alternativa descartada: mantener el campo limitado a la banda cuando hay estrellas (haría imposible corregir un 4★ a 86 sin pasar antes por las estrellas, justo lo que se quiere evitar).

**D6. Un componente decide qué número se muestra.** `StarRatingValue` recibe `showScore` (por defecto `false`): sin él muestra `4,5`; con él y un puntaje muestra `86/100` en lugar de `4,5`. Los consumidores que no deben mostrar el puntaje (feed, reseñas del perfil) simplemente no lo pasan, y los que sí (destacadas) pasan `showScore`. La etiqueta accesible sigue incluyendo el puntaje cuando existe, para quien lo tiene visible. Alternativa descartada: filtrar en cada consumidor (repite la regla).

**D7. Qué superficies muestran el número, y para quién.**
- Panel "Tu relación" (álbum y canción): la propia, ya hoy `86/100` en el botón del diálogo.
- Reseña propia: en el artículo de la reseña, cuando quien mira es su autor, junto a las estrellas.
- Valoraciones destacadas del perfil: públicas por decisión del dueño (es la excepción documentada de `rating-highlights`), con `86/100`.
- Desempate del orden "Tú" de la discografía: usa el puntaje propio, sin mostrarlo en la tabla.
- No se muestra en el feed, las reseñas del perfil, la tracklist, las carátulas de la discografía ni las filas compactas: son superficies densas o de otras personas. Efecto lateral buscado: el feed deja de exponer el puntaje de los seguidos, que no figura en la intención de privacidad del feed.

**D8. Sin color.** El número usa el tono neutro del sistema con `font-medium`, sin gradiente ni semáforo. `StarRatingValue` pasa de `text-amber` a un tono neutro para el número (el relleno de la estrella conserva el ámbar): así el ámbar de reposo sigue siendo solo del relleno. Razones: Regla de Rareza, daltonismo (verde/rojo) y que la nota es una expresión personal, no un veredicto comparable (el 70 de una persona es el 90 de otra).

**D9. El promedio de la comunidad queda solo en estrellas.** `AlbumHeader` deja de mostrar `detailedValue`; `album-community-stats` se corrige. El campo `averageDetailedScore` del contrato se conserva: quitarlo es un cambio de contrato que no se justifica aquí y, mientras exista, no daña. Anotado como deuda para quitarlo en un cambio aparte si sigue sin usarse.

**D10. Desempate del orden propio.** En el orden "Tú" de la discografía el valor de ordenación pasa de `stars` a la pareja (`stars`, `detailedScore`), con `detailedScore` ausente como el más bajo dentro de las mismas estrellas y el título como último desempate. Se hace en una función pura (testeable) y no cambia el orden entre estrellas distintas. Los demás órdenes por nota propia que existan se inventarían en la implementación y reciben el mismo desempate solo si ordenan lo propio.

**D11. Formato y localización.** `86/100` se compone con el mensaje existente `detailScale` (`{score}/100`) en es/en. El número sin puntaje sigue formateándose con `formatStars` (coma en español).

## Risks / Trade-offs

- [Un usuario escribe 86 en un álbum con 4★ y no advierte que sus estrellas pasan a 4,5★] → la equivalencia en vivo con la frase explícita antes de guardar y el cambio visible en el panel al guardar.
- [Quien venía usando `4,5 · 87` en feed o perfil pierde la vista del número en esas superficies] → es la decisión (no se muestra en superficies de otras personas); el número sigue en el panel, la reseña propia y las destacadas.
- [El desajuste cultural de las bandas (70 → 3,5★)] → la equivalencia en vivo lo hace evidente antes de guardar; si en el uso resulta confuso, es un cambio de tabla (y del `CHECK`) con su propio análisis.
- [Condiciones de carrera: el servidor deriva estrellas distintas de las que la UI cree] → la UI toma las estrellas de la respuesta del servidor (ya lo hace `applyRatings`).
- [Quitar `showScore` de feed/perfil cambia tests que afirman `4,5 · 87`] → se reescriben junto con el componente.
- [`averageDetailedScore` queda calculado y sin uso] → coste de una media en una consulta ya agrupada; se documenta como deuda.

## Migration Plan

Sin migración de datos ni de esquema. Orden: derivación y API → diálogo y panel (álbum y canción) → `StarRatingValue` y los consumidores → comunidad → orden de la discografía → docs. Compatibilidad: el `PUT` solo añade un caso; las filas existentes siguen siendo válidas. Rollback: revertir el commit.

## Open Questions

- ¿Se quiere más adelante mostrar el puntaje de la reseña propia también en la tarjeta del editor (hoy solo en el artículo)? Se deja fuera para no ampliar el alcance.
- ¿Quitar `averageDetailedScore` del contrato? Cambio aparte, si se confirma que ninguna superficie lo usará.
