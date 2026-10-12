## ADDED Requirements

### Requirement: Carátulas resueltas al generar

El generador SHALL garantizar que todos los álbumes de una colección generada tengan carátula resuelta. Para
ello SHALL recorrer los candidatos en orden, aceptar los que ya la tienen, resolver los demás contra Cover Art
Archive sin pasar por la cola de MusicBrainz y descartar los que no la confirman, deteniéndose al reunir
`COLLECTION_SIZE`. SHALL limitar las resoluciones por corrida a un presupuesto fijo. Si tras el recorrido hay
menos de `MIN_ALBUMS_FOR_SECTION`, la plantilla SHALL omitirse conservando lo anterior.

#### Scenario: Candidatos sin carátula resuelta

- **WHEN** parte de los candidatos no tiene carátula resuelta
- **THEN** se resuelven en el orden de la plantilla y la colección incluye solo los que la tienen

#### Scenario: Carátula inexistente

- **WHEN** un candidato no tiene carátula en Cover Art Archive
- **THEN** se descarta y se completa con el siguiente candidato

#### Scenario: Presupuesto agotado

- **WHEN** se alcanza el presupuesto de resoluciones antes de reunir el mínimo
- **THEN** la plantilla se omite sin modificar la colección anterior y lo resuelto queda guardado para la próxima corrida

### Requirement: Señal de calidad para ordenar y desempatar

Las plantillas que necesiten elegir entre álbumes sin valoración de la comunidad SHALL ordenar por esta señal,
en este orden: promedio de valoraciones (solo con `MIN_RATINGS_PER_ALBUM` o más), ganador antes que nominado a
un premio, rango de popularidad del calendario, carátula ya resuelta y, por último, el id para que el resultado
sea determinista. Con valoraciones suficientes la comunidad SHALL prevalecer sobre las demás señales.

#### Scenario: Sin comunidad

- **WHEN** ningún candidato tiene valoraciones suficientes
- **THEN** el orden lo deciden premios, calendario y carátula, y es idéntico en dos corridas con los mismos datos

#### Scenario: Con comunidad

- **WHEN** un candidato tiene valoraciones suficientes
- **THEN** queda por delante de los que solo tienen premios o rango de calendario

### Requirement: Simulación sin escritura

`scripts/sync-explore-collections.ts --dry-run` SHALL ejecutar la planificación y la resolución de carátulas de
cada plantilla sin crear ni modificar listas, filas destacadas ni corridas, e imprimir por plantilla el período,
el título, los candidatos, cuántos tienen carátula y, si no llega a `MIN_ALBUMS_FOR_SECTION`, el motivo.

#### Scenario: Verificación previa al lanzamiento

- **WHEN** se ejecuta con `--dry-run` y las seis plantillas del día 0 alcanzan el mínimo
- **THEN** el informe lo indica para cada una y la base de datos de colecciones no cambia

#### Scenario: Plantilla que no llega

- **WHEN** una plantilla no alcanza el mínimo
- **THEN** el informe muestra cuántos álbumes reunió y por qué (sin premios cargados, calendario vacío, sin carátulas)
