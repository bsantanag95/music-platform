## ADDED Requirements

### Requirement: Facetas de estrellas y tipo
La respuesta de `GET /api/me/ratings` SHALL incluir, junto a `facets.years`, las facetas `facets.stars` y
`facets.types`. `facets.stars` SHALL ser una lista de diez entradas `{ value, count }`, una por cada valor de ½
a 5 en pasos de ½ (de menor a mayor, con `count` 0 si no hay valoraciones de ese valor), calculada con la
búsqueda, el año o la década y el tipo vigentes pero **sin** el filtro de estrellas. `facets.types` SHALL ser
`{ "release-group": number, recording: number }`, calculada con la búsqueda, el año o la década y las
estrellas vigentes pero **sin** el filtro de tipo. Así cada faceta sigue mostrando las alternativas de su
propio filtro. `total`, `counts` e `items` NO SHALL cambiar. Las facetas SHALL calcularse con una sola
consulta agrupada adicional, no con una por faceta.

#### Scenario: Faceta de estrellas ignora el filtro de estrellas
- **WHEN** la persona filtra por 5 estrellas y tiene 3 valoraciones de 5★ y 2 de 4,5★
- **THEN** `items` y `total` traen solo las de 5★ y `facets.stars` sigue reportando 3 en 5★ y 2 en 4,5★

#### Scenario: Faceta de estrellas respeta tipo y búsqueda
- **WHEN** filtra por tipo canción y busca "floyd"
- **THEN** `facets.stars` cuenta solo canciones que coinciden con "floyd", repartidas por estrellas

#### Scenario: Faceta de tipo ignora el filtro de tipo
- **WHEN** filtra por tipo canción y tiene 12 álbumes y 3 canciones
- **THEN** `counts` trae 0 álbumes y 3 canciones, y `facets.types` sigue trayendo 12 álbumes y 3 canciones

#### Scenario: Faceta de tipo respeta las estrellas
- **WHEN** filtra por 5 estrellas y de sus 15 valoraciones 4 son de 5★ (3 álbumes y 1 canción)
- **THEN** `facets.types` trae 3 álbumes y 1 canción

#### Scenario: Biblioteca vacía
- **WHEN** una persona sin valoraciones pide la lista
- **THEN** `facets.stars` trae diez entradas con `count` 0 y `facets.types` trae 0 y 0
