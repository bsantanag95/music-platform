# ADR 0011 — Idempotencia y concurrencia en ingestión del catálogo

**Estado:** Aceptado

## Contexto

El patrón de ingestión del catálogo es "cacheo bajo demanda": consultar la base propia; solo si falta, pedir a MusicBrainz y cachear el resultado. No hay cola, job de fondo ni tabla staging — todo es síncrono dentro de la request HTTP. Las tres reglas de idempotencia que gobiernan este patrón ya están implementadas y funcionando en `ingest-artist.ts`, `ingest-discography.ts` e `ingest-release.ts`, pero no estaban documentadas como decisión arquitectónica. Este ADR formaliza lo que el código ya resolvió.

## Decisión

Tres reglas para idempotencia y concurrencia en ingestión del catálogo:

### Regla 1: `ON CONFLICT` como mecanismo general (no locks)

Toda entidad de catálogo que se ingesta desde MusicBrainz usa `mbid` (UUID de MusicBrainz) como columna `UNIQUE` y resuelve concurrencia con `INSERT ... ON CONFLICT (mbid) DO UPDATE/NOTHING`. No se usan advisory locks para prevenir escrituras duplicadas — la constraint de unicidad de Postgres es el mecanismo definitivo.

| Entidad | Operación | Fuente |
|---|---|---|
| `artist` | `ON CONFLICT (mbid) DO UPDATE SET name, type, bio` | `ingest-artist.ts:176` |
| `release_group` | `ON CONFLICT (mbid) DO UPDATE SET title, category` | `ingest-discography.ts:65` |
| `release` | `ON CONFLICT (mbid) DO UPDATE SET release_date` | `ingest-release.ts:53` |
| `recording` | `ON CONFLICT (mbid) DO UPDATE SET title` | `ingest-release.ts:70` |
| `credit` | `ON CONFLICT DO NOTHING` (índices únicos parciales) | `ingest-discography.ts:107` |
| `track` | `ON CONFLICT DO NOTHING` (unique compuesto) | `ingest-release.ts:84` |

### Regla 2: Advisory lock solo para reconciliación destructiva (DELETE)

`pg_advisory_xact_lock` se usa únicamente cuando la ingestión incluye una operación DELETE que podría corromper datos bajo concurrencia. Hoy, la única función que califica es `ensureArtistMemberships` (`ingest-artist.ts:63-96`), que elimina relaciones stale antes de marcar el flag `memberships_synced_at`. Las demás funciones de ingestión son puramente aditivas (INSERT/UPDATE, nunca DELETE), por lo que el costo de un lock supera el beneficio.

Razón: sin DELETE, la peor consecuencia de concurrencia es trabajo desperdiciado (llamadas MB duplicadas + upserts idempotentes que sobreescriben los mismos datos). Con DELETE, la consecuencia es corrupción de datos (relaciones eliminadas incorrectamente).

### Regla 3: `DO UPDATE` para atributos descriptivos, `DO NOTHING` para relaciones estructurales

- **`DO UPDATE`** cuando los datos vienen de MusicBrainz como source of truth y pueden cambiar (nombre, tipo, bio, fecha, título, categoría). La siguiente visita refresca con la versión más reciente.
- **`DO NOTHING`** cuando la primera escritura es la definitiva (posición de un credit, posición de un track). Estas relaciones son inmutables — si cambian, es una nueva versión del release, no una corrección del credit.

## Justificación

- La constraint `UNIQUE` en `mbid` ya resuelve la concurrencia a nivel de base de datos. Un advisory lock para el mismo propósito sería redundante y agregaría latencia innecaria a requests concurrentes.
- La distinción DELETE vs. aditivo es la línea correcta porque determina la consecuencia de la concurrencia: corrupción vs. desperdicio. Serializar trabajo desperdiciado no tiene sentido; serializar operaciones destructivas sí.
- La distinción descriptivo vs. estructural refleja la semántica de los datos: un nombre de artista en MusicBrainz puede corregirse (source of truth externa), pero la posición de un credit es inmutable una vez creada.

## Alternativas consideradas

- **Advisory lock generalizado para toda escritura de cache-miss:** descartado. El costo de serializar todas las escrituras de catálogo detrás de un lock no se justifica cuando el peor caso real es trabajo desperdiciado, no corrupción. Ver riesgo #10 en `04-risks.md`.
- **Transacción de grafo (todo o nada) para la request completa:** descartado. El patrón actual es "single-entity por función, compuesto secuencialmente sin transacción". Estados parciales son el caso normal y se resuelven en la siguiente request vía flags de sync (`discographySyncedAt`, `membershipsSyncedAt`, `creditsSyncedAt`).

## Consecuencias

- Toda nueva entidad de catálogo que se ingesta desde MusicBrainz debe usar `mbid` como columna `UNIQUE` y resolver concurrencia con `ON CONFLICT`.
- Ninguna nueva función de ingestión debe usar `pg_advisory_xact_lock` sin una operación DELETE que lo justifique — si la ingestión es puramente aditiva, el `ON CONFLICT` es suficiente.
- Si en el futuro se agrega una operación DELETE a una función de ingestión actualmente aditiva, se debe reevaluar si necesita advisory lock.
- El riesgo de dogpile sobre MusicBrainz (llamadas duplicadas bajo concurrencia) se acepta por ahora. Se revisita cuando la profundidad de cola sostenida o el p95 de latencia en rutas de cache-miss indiquen que el costo supera el beneficio (conexión con B.3 de `scalability-infrastructure.md`, fuente única del checklist de métricas).
