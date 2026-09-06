# Proposal — add-recording-album-search

## Why

Hoy una búsqueda como `Led Zeppelin stairway to heaven` no encuentra el objetivo del usuario:
las canciones quedaron fuera de los resultados (decisión vigente de `catalog-search`), pero el
usuario que busca una canción lo que realmente necesita es **llegar al álbum que la contiene**.
Esta versión cierra ese hueco sin romper la decisión de producto: la canción no se convierte en
resultado navegable, sino en una señal de búsqueda que resuelve hacia álbumes.

## What Changes

- El servicio de búsqueda (`searchCatalog`) reconoce cuando la consulta coincide con una
  **grabación** (`recording`) en MusicBrainz o en la base local, y resuelve los **álbumes
  (`release_group`) que contienen esa canción**.
- Nuevo camino de ingesta fría de una grabación suelta: `findOrIngestRecording(mbid)` persiste
  la `recording`, sus créditos y **al menos las apariciones** (release → release_group → track)
  necesarias para listar álbumes. Era la precondición declarada para desdiferir D2 en
  `add-search-results-page`.
- `musicbrainz/client.ts` agrega `searchRecording(query)` (búsqueda por texto o consulta
  estructurada por campos, con caché TTL como las otras búsquedas) y
  `browseReleasesByRecording(mbid)` (`/release?recording=&inc=release-groups`, hasta 100).
- `GET /api/catalog/search` **extiende** su respuesta con una clave opcional `songContext`
  (canción detectada + álbumes que la contienen). Los `results` de artistas/álbumes mantienen su
  contrato exacto — sin breaking change.
- La página `/search` muestra una sección **"Álbumes que contienen «<canción>»"** cuando existe
  contexto de canción, con álbumes deduplicados por `release_group`. **No** se añade pestaña de
  canciones: los resultados siguen siendo solo artistas y álbumes.
- Límites de coste: máximo 1 request de búsqueda de recordings por consulta (ya cacheado TTL),
  hasta 4 browses del clúster de duplicados (cacheados por mbid, cortan ante un candidato
  dominante), un tope de álbumes mostrados y una sola ingesta de grabación por búsqueda.

### Goals

- Que `artista + canción` o `canción` a secas devuelvan los álbumes que la contienen.
- Reutilizar el modelo existente (`recording → track → release → release_group`) sin migración de
  esquema.
- Mantener la decisión de producto: canciones fuera de los resultados principales.

### Non-Goals

- No añadir pestaña **Canciones** ni página de canción desde la búsqueda como resultado propio.
- No mostrar la canción como tarjeta enlazable en los resultados.
- No ingerir el tracklist completo de cada álbum encontrado (la ingesta pesada sigue ocurriendo
  al abrir el álbum).
- No full-text search ni ranking sofisticado (siguen diferidos en `add-search-results-page`).
- No paginación de resultados.

## Capabilities

### New Capabilities

- `catalog-recording-ingestion`: ingesta bajo demanda de una grabación suelta (recording +
  créditos + apariciones en álbumes), idempotente por `mbid`, única fuente de salida a
  MusicBrainz vía el cliente existente.

### Modified Capabilities

- `catalog-search`: la requirement "Búsqueda de canciones fuera de alcance en esta versión" se
  reemplaza por "Resolución de canciones hacia álbumes": la búsqueda detecta grabaciones y
  expone los álbumes que las contienen como sección contextual; `results` mantiene el contrato
  de artistas/álbumes y se agrega `songContext` opcional a la respuesta del endpoint.

## Impact

- `src/services/musicbrainz/client.ts` y `types.ts` — métodos de recording.
- `src/services/catalog/` — nuevo `ingest-recording.ts`; extensión de `search-catalog.ts`.
- `src/app/api/catalog/search/route.ts` — respuesta extendida (compat).
- `src/lib/api/schemas.ts`, `src/lib/api/catalog.ts` — zod del nuevo campo.
- `src/components/catalog/SearchResults.tsx` y página `/search` — sección contextual.
- Mensajes i18n (`messages/es|en` namespace `catalog`) para la nueva sección.
- Docs: `04-api/contracts.md`, `02-architecture/code-walkthrough.md`, roadmap (D2 resuelto),
  specs OpenSpec.
- Smoke tests: nuevo `scripts/smoke-test-recording-search.ts` (BD de scratch, `fetch` mockeado).
