## Context

`listMyFavorites` y `listUserFavorites` filtran `q` con `TITLE_EXPR ilike %q%`, donde `TITLE_EXPR = coalesce(artist.name, release_group.title, recording.title)`. Para un favorito de álbum o canción eso es solo el título; el artista se calcula aparte con `PRIMARY_ARTIST_SQL(favorite.releaseGroupId, favorite.recordingId)` (subconsulta del primer crédito `primary`), ya usada para ordenar "por artista". El editor de la Tarjeta usa `grid sm:grid-cols-3` dentro del panel lateral (~28 rem), lo que deja ~9 rem por slot.

## Goals / Non-Goals

**Goals:** buscar por título o artista con una sola condición; layout legible.
**Non-Goals:** ver proposal.

## Decisions

### D1. Ampliar `q` para todos los consumidores, no una bandera solo del selector

`q` pasa a ser `título ilike OR artista principal ilike`. Una bandera opt-in (`includeArtist=1`) evitaría tocar la página de Favoritos, pero deja dos significados de "buscar" en la misma API y obliga a documentarlo; el usuario espera que buscar "Sabrina" en sus favoritos muestre lo de Sabrina en cualquier superficie, y la búsqueda de la colección ya funciona así (`collection-wishlist`). *Riesgo aceptado:* cambia el resultado de una búsqueda existente (agrega coincidencias, nunca quita) → se registra en la spec `favorites`.

### D2. Solo el artista principal acreditado

Se reutiliza `PRIMARY_ARTIST_SQL` tal cual (primer crédito `primary` por posición), la misma definición que muestra la app como artista del álbum/canción y que usa el orden "por artista". Buscar por artistas invitados o créditos secundarios queda fuera.

### D3. Una sola condición compartida

Se extrae `favoriteTextMatch(q)` y se usa en las dos funciones de lectura, en `scopeConditions`, de modo que también alcance a la consulta de conteo por tipo (`counts`).

### D4. Slots apilados en el editor de la Tarjeta

Tres columnas en un panel angosto no admiten texto legible ni el selector con resultados. Se apila un slot por fila a todo el ancho del panel (y de `/me/settings/profile`), con la acción "Quitar" en la fila del elemento elegido para no alargar la tarjeta. Tamaños: encabezado del slot `text-sm`, título elegido `text-base`, artista `text-sm`; en el selector, campo y filas `text-sm`/`text-xs` con miniatura de 40 px. *Alternativa:* container queries para volver a 3 columnas en anchos grandes → complejidad sin ganancia real: aun a 40 rem cada columna quedaría en ~13 rem.

## Risks / Trade-offs

- [La búsqueda por artista puede devolver muchos resultados para un artista muy presente en los favoritos] → el selector ya limita a 50 y muestra el aviso de "más resultados"; se ordena como siempre (tipo y recencia).
- [`ilike` sobre una subconsulta correlacionada por fila] → el conjunto es por usuario (cientos de filas como mucho) y ya se hace un cálculo equivalente al ordenar por artista; sin índice nuevo.
- [El diseño apilado hace más alto el editor] → el panel ya tiene scroll interno.

## Migration Plan

Sin migraciones. Se despliega junto con el código; revertir el commit restaura el comportamiento anterior.

## Open Questions

Ninguna.
