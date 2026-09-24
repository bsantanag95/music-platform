## MODIFIED Requirements

### Requirement: Resolución de carátula a nivel de release-group

El sistema SHALL resolver la carátula de un álbum construyendo la URL de miniatura a partir del MBID del `release_group` (`coverartarchive.org/release-group/{mbid}/front-250`). Cuando la resolución espeja en el acto (ver `cover-art-mirror`), SHALL determinar la existencia con un único `GET` a esa URL siguiendo sus redirecciones; en el render del detalle de álbum en el servidor, SHALL determinarla con un `HEAD` sin seguir redirecciones. El sistema SHALL considerar que existe carátula cuando la respuesta tenga status en el rango `[200, 400)` y SHALL devolver `null` cuando responda `404`, otro status de error o falle la red. La URL devuelta SHALL ser la del storage propio cuando la carátula esté espejada y la de Cover Art Archive en otro caso. El sistema SHALL devolver `null` sin consultar Cover Art Archive para un release-group con carátula retirada (`cover_blocked_at`).

#### Scenario: Release-group con carátula

- **WHEN** el release-group tiene carátula en Cover Art Archive
- **THEN** la resolución devuelve la URL de miniatura de 250px del release-group, servida desde el storage propio si fue espejada

#### Scenario: Release-group sin carátula

- **WHEN** el release-group no tiene carátula en Cover Art Archive (respuesta `404`)
- **THEN** la resolución devuelve `null`

#### Scenario: Error transitorio de Cover Art Archive

- **WHEN** Cover Art Archive responde con un error de servidor o la red falla
- **THEN** la resolución devuelve `null` sin interrumpir el flujo de ingesta

#### Scenario: Carátula retirada

- **WHEN** el release-group tiene `cover_blocked_at`
- **THEN** la resolución devuelve `null` sin consultar Cover Art Archive

### Requirement: Cacheo de la resolución en la ingesta

El sistema SHALL guardar la carátula del release-group en la columna `release_group.cover_thumb_url` como única fuente escribible de la URL servible, resolviéndola bajo demanda sin ingestar el tracklist de una edición. SHALL registrar en `release_group.cover_checked_at` el momento de cada verificación concluyente (carátula encontrada o `404`). Cuando el valor cacheado sea nulo, SHALL re-resolverlo solo si no hay una verificación concluyente en los últimos 7 días; los errores transitorios no cuentan como verificación. El sistema SHALL dejar de escribir la columna `release.cover_thumb_url`, que queda deprecada como lectura legada (fallback de compatibilidad para filas pre-migración).

#### Scenario: Resolución bajo demanda de un release-group

- **WHEN** se solicita la carátula de un release-group sin valor cacheado, sin verificación reciente y con `mbid`
- **THEN** el sistema consulta Cover Art Archive, persiste el resultado en `release_group.cover_thumb_url`, registra `cover_checked_at` y lo devuelve

#### Scenario: Valor cacheado existente

- **WHEN** `release_group.cover_thumb_url` ya tiene una URL
- **THEN** la resolución la devuelve sin consultar Cover Art Archive

#### Scenario: Valor cacheado nulo re-resuelto

- **WHEN** el valor cacheado es nulo, la última verificación concluyente tiene más de 7 días y ahora sí existe carátula en Cover Art Archive
- **THEN** el sistema re-resuelve la carátula y actualiza el valor cacheado antes de devolverla

#### Scenario: Negativo reciente no se re-consulta

- **WHEN** el valor cacheado es nulo y la última verificación concluyente tiene menos de 7 días
- **THEN** la resolución devuelve `null` sin consultar Cover Art Archive

#### Scenario: Release-group sin carátula

- **WHEN** Cover Art Archive responde 404 para el release-group
- **THEN** el valor cacheado queda nulo, se registra `cover_checked_at` y la resolución devuelve `null`

#### Scenario: Ingesta de una edición

- **WHEN** se ingesta la edición de un álbum
- **THEN** la columna legada `release.cover_thumb_url` ya no se escribe y la carátula se resuelve a nivel de release-group
