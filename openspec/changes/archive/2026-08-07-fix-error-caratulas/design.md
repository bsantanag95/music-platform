## Context

`album-detail.ts` arma `cover` con `coverThumbUrl(releaseRow.mbid)`, generando `coverartarchive.org/release/{mbid}/front-250`. Cover Art Archive (CAA) guarda el arte por release y solo responde en `/release/{mbid}/front-250` para la release que realmente lleva la imagen. `findOrIngestTracklist` elige la primera edición "Official" del `release-group`, que no siempre es la portadora del arte → 404 para álbumes oficiales y para demos/outtakes sin carátula (imagen rota + error de consola).

Verificado contra CAA en vivo: `75363d98` ("emails I can't send", 1ª oficial) y `44291b31` ("Night of the Crime") devuelven 404 en `/release/...`, mientras los endpoints de sus release-groups resuelven la portada correctamente.

Restricciones que condicionan el diseño:
- La columna `release.cover_thumb_url` ya existe (migración `0000`) y hoy no se escribe.
- `00-backend-analysis.md` descartó ingerir carátulas junto con la discografía por el rate limit de MusicBrainz (1 req/seg). La resolución va en `findOrIngestTracklist`, que es per-álbum y bajo demanda — no choca con esa decisión.
- `src/services/cover-art.ts` es el único lugar autorizado para construir URLs de CAA (convención de licencia, `04-risks.md` #6).
- El frontend ya maneja `cover: null` con `DiscPlaceholder` (`AlbumCover` y `LazyCoverImage`).

## Goals / Non-Goals

**Goals:**
- Que todo álbum con portada en CAA la muestre usando el MBID del **release-group** (independiente de qué release se ingirió).
- Que los álbumes sin carátula devuelvan `cover: null` y el frontend muestre el placeholder, sin 404 en el navegador.
- Cachear el resultado en la base (patrón "cacheo bajo demanda") y recuperar los álbumes ya cacheados antes del fix.

**Non-Goals:**
- Cambiar el shape del contrato REST (`cover` y `release.coverThumbUrl` siguen siendo `string | null`).
- Traer carátulas en `search`/`artist/[id]`.
- Resolución a resolución completa (se mantiene la política de 250px).
- Migración de esquema nueva.

## Decisions

### 1. URL de carátula a nivel de release-group

`coverThumbUrl(releaseGroupMbid)` → `https://coverartarchive.org/release-group/{mbid}/front-250`. CAA resuelve la portada del álbum completo sin importar qué release cargó el arte.

Alternativas descartadas:
- **Elegir la release con `front: true`** al ingestar: inestable (el flag depende de CAA, no de MusicBrainz; no está disponible en el browse de releases) y más lento (requiere consultar el JSON completo de CAA).
- **Probar releases hasta encontrar una con arte**: multiplica requests y no cubre el caso "la portada la carga una release no ingerida".

### 2. Resolver en la ingesta y cachear en `release.cover_thumb_url`

`findOrIngestTracklist` llama a `resolveCoverThumbUrl(releaseGroupMbid)` al crear la release y escribe el resultado en `values` y en el `set` del `onConflictDoUpdate`. `album-detail.ts` pasa a devolver `releaseRow.coverThumbUrl` directamente (sin construir la URL en el request path).

Racional: usa la columna existente, mantiene el patrón cache-first, y evita un HEAD por cada vista de álbum. La alternativa de resolver en cada request viola el patrón de cacheo y agrega latencia a la página.

### 3. Detección de existencia con `HEAD` y regla de status

`resolveCoverThumbUrl` hace `fetch(url, { method: "HEAD", redirect: "manual" })`. Regla: si `status >= 200 && status < 400` hay carátula (los 3xx de CAA redirigen al arte en archive.org; un 2xx directo también); cualquier otro status o error de red (try/catch) → `null`. Esta regla es robusta frente a la semántica de redirects de CAA sin depender de seguir redirecciones.

### 4. Self-heal de filas legacy

En `findOrIngestTracklist`, si ya existe una release con `cover_thumb_url` nulo, se re-resuelve y actualiza antes de devolverla. Recupera álbumes cacheados antes del fix y capta portadas que CAA agregue después, sin migración ni script manual.

### 5. Mejor esfuerzo, sin romper la ingesta

Si CAA responde 5xx o hay error de red, se persiste `null` y la ingesta sigue. El self-heal reintenta en la siguiente visita del álbum, así un error transitorio no deja el dato bloqueado para siempre.

## Risks / Trade-offs

- **[HEAD por cada visita de un álbum sin carátula]** → El self-heal re-resuelve en cada vista cuando el valor es nulo. Coste acotado: los álbumes sin arte son minoría y el request es liviano. Mitigación adicional si molestara: marcar "ya verificado" — no se hace en este cambio para mantenerlo simple.
- **[Covers añadidas a CAA después de la ingesta]** → Cubiertas por el self-heal (se captan en la siguiente visita). Es una propiedad deseable, no un defecto.
- **[CAA cambia la semántica de status/redirects]** → La regla `[200,400)` admite 2xx directos y 3xx; si CAA empezara a responder distinto, el peor caso es una carátula tratada como inexistente (placeholder), nunca una imagen rota.
- **[`smoke-test-ingestion.ts` mockea `global.fetch`]** → Requiere añadir mocks para los hosts de CAA; de lo contrario el smoke test falla por "no hay mock" (comportamiento existente del script).

## Migration Plan

- Sin migración de esquema.
- Datos existentes: los álbumes ya cacheados con `cover_thumb_url` nulo se auto-reparan en la primera visita posterior al deploy (decisión 4).
- Rollback: revertir el commit restaura el comportamiento anterior sin pasos adicionales (el endpoint vuelve a armar la URL por release).

## Open Questions

- Ninguna bloqueante. El criterio de "existe carátula" (`[200,400)`) quedará validado en el smoke test con respuestas 200 y 404 simuladas.
