# Delta: cover-art-resolution

## MODIFIED Requirements

### Requirement: Cacheo de la resolución en la ingesta

El sistema SHALL guardar la carátula del release-group en la columna `release_group.cover_thumb_url` como única fuente escribible, resolviéndola bajo demanda con un `HEAD` a Cover Art Archive sin ingestar el tracklist de una edición, y SHALL re-resolverla cuando el valor cacheado sea nulo antes de devolverla. El sistema SHALL dejar de escribir la columna `release.cover_thumb_url`, que queda deprecada como lectura legada (fallback de compatibilidad para filas pre-migración).

#### Scenario: Resolución bajo demanda de un release-group

- **WHEN** se solicita la carátula de un release-group sin valor cacheado y con `mbid`
- **THEN** el sistema consulta Cover Art Archive, persiste el resultado en `release_group.cover_thumb_url` y lo devuelve

#### Scenario: Valor cacheado existente

- **WHEN** `release_group.cover_thumb_url` ya tiene una URL
- **THEN** la resolución la devuelve sin consultar Cover Art Archive

#### Scenario: Valor cacheado nulo re-resuelto

- **WHEN** el valor cacheado es nulo y ahora sí existe carátula en Cover Art Archive
- **THEN** el sistema re-resuelve la carátula y actualiza el valor cacheado antes de devolverla

#### Scenario: Release-group sin carátula

- **WHEN** Cover Art Archive responde 404 para el release-group
- **THEN** el valor cacheado queda nulo y la resolución devuelve `null`

#### Scenario: Ingesta de una edición

- **WHEN** se ingesta la edición de un álbum
- **THEN** la columna legada `release.cover_thumb_url` ya no se escribe y la carátula se resuelve a nivel de release-group

## ADDED Requirements

### Requirement: Endpoint cover-only de release-group

El endpoint `GET /api/catalog/release-group/{id}/cover` SHALL devolver `{ cover: string | null }` resolviendo la carátula del release-group sin ingestar su tracklist ni consultar MusicBrainz, y SHALL responder `ALBUM_NOT_FOUND` cuando el id no corresponda a ningún release-group.

#### Scenario: Carátula disponible

- **WHEN** el release-group tiene carátula (cacheada o recién resuelta)
- **THEN** el endpoint responde `{ cover: <url miniatura del release-group> }`

#### Scenario: Carátula ausente

- **WHEN** el release-group no tiene carátula en Cover Art Archive
- **THEN** el endpoint responde `{ cover: null }`

#### Scenario: Release-group inexistente

- **WHEN** el id no corresponde a ningún release-group
- **THEN** el endpoint responde 404 con `code: ALBUM_NOT_FOUND`
