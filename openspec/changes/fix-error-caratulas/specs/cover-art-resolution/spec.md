# cover-art-resolution

Resolución y cacheo de la carátula miniatura de un álbum contra Cover Art Archive a nivel de release-group.

## ADDED Requirements

### Requirement: Resolución de carátula a nivel de release-group

El sistema SHALL resolver la carátula de un álbum construyendo la URL de miniatura a partir del MBID del `release_group` (`coverartarchive.org/release-group/{mbid}/front-250`), y SHALL determinarlo consultando Cover Art Archive con un request `HEAD` a esa URL. El sistema SHALL considerar que existe carátula cuando la respuesta tenga status en el rango `[200, 400)` y SHALL devolver `null` cuando responda `404`, otro status de error o falle la red.

#### Scenario: Release-group con carátula

- **WHEN** el release-group tiene carátula en Cover Art Archive
- **THEN** la resolución devuelve la URL de miniatura de 250px del release-group

#### Scenario: Release-group sin carátula

- **WHEN** el release-group no tiene carátula en Cover Art Archive (respuesta `404`)
- **THEN** la resolución devuelve `null`

#### Scenario: Error transitorio de Cover Art Archive

- **WHEN** Cover Art Archive responde con un error de servidor o la red falla
- **THEN** la resolución devuelve `null` sin interrumpir el flujo de ingesta

### Requirement: Cacheo de la resolución en la ingesta

El sistema SHALL resolver y guardar la carátula del release-group en la columna `release.cover_thumb_url` al ingestar la edición de un álbum, y SHALL re-resolverla cuando una edición ya cacheada tenga ese valor nulo antes de devolverla.

#### Scenario: Ingesta de una edición nueva

- **WHEN** se ingesta una edición de un álbum con carátula disponible
- **THEN** la edición queda cacheada con la URL de miniatura del release-group en `cover_thumb_url`

#### Scenario: Edición sin carátula

- **WHEN** se ingesta una edición de un álbum sin carátula
- **THEN** la edición queda cacheada con `cover_thumb_url` nulo

#### Scenario: Edición ya cacheada sin carátula

- **WHEN** se solicita un álbum cuya edición cacheada tiene `cover_thumb_url` nulo y ahora sí existe carátula en Cover Art Archive
- **THEN** el sistema re-resuelve la carátula y actualiza el valor cacheado antes de devolver el detalle

### Requirement: Contrato de carátula conservado

El endpoint `GET /api/catalog/release-group/{id}` SHALL mantener `cover` como `string | null`, devolviendo la URL de miniatura del release-group cuando exista carátula y `null` cuando no.

#### Scenario: Carátula disponible

- **WHEN** la edición cacheada tiene `cover_thumb_url`
- **THEN** el endpoint devuelve `cover` con esa URL

#### Scenario: Carátula ausente

- **WHEN** la edición cacheada tiene `cover_thumb_url` nulo
- **THEN** el endpoint devuelve `cover` nulo y el frontend muestra el placeholder
