# explore-collection-generation Specification

## Purpose
Generación automática de las colecciones destacadas de `/explore`: plantillas en código que producen
listas públicas de `@exploracion`, con reemplazo completo de ítems, rotación por período y refresco
semanal bajo demanda (sin cron, con lock y conservación ante fallo). Las colecciones generadas quedan
fuera de la consola editorial y del feed (ADR 0033).
## Requirements
### Requirement: Colecciones generadas por plantillas

El sistema SHALL generar colecciones editoriales a partir de plantillas definidas en código. Cada
plantilla SHALL producir una lista pública de álbumes (`kind='standard'`) propiedad de la cuenta
curadora `@exploracion`, identificada por la pareja (clave de plantilla, clave de período) y
registrada en `user_list_featured` con `source='template'`. Las plantillas SHALL basarse en datos
propios de la plataforma y del catálogo; SHALL NOT usar personalización por afinidad.

#### Scenario: Primera generación

- **WHEN** se ejecuta la generación y una plantilla devuelve al menos `MIN_ALBUMS_FOR_SECTION` álbumes
- **THEN** existe una lista pública de `@exploracion` con esos álbumes en orden y una fila
  `user_list_featured` con `source='template'`, la clave de plantilla y la de período

#### Scenario: Generación idempotente

- **WHEN** la generación se ejecuta dos veces con los mismos datos
- **THEN** no se crean listas ni filas duplicadas para la misma pareja plantilla/período

#### Scenario: Plantilla con pocos álbumes

- **WHEN** una plantilla devuelve menos de `MIN_ALBUMS_FOR_SECTION` álbumes
- **THEN** no se crea ni se modifica ninguna lista para esa plantilla

### Requirement: Reemplazo completo de ítems

Cada corrida de una plantilla SHALL reemplazar por completo los ítems de su lista, conservando el
orden del selector, y SHALL NOT acumular ítems de corridas anteriores. La corrida SHALL NOT
actualizar la fila de `user_list` de una lista existente, de modo que no se generen eventos de feed.

#### Scenario: Ítems que dejan de cumplir la regla

- **WHEN** un álbum de la corrida anterior ya no cumple el selector
- **THEN** tras la nueva corrida la lista ya no lo contiene

#### Scenario: Sin eventos de feed

- **WHEN** se reemplazan los ítems de una lista generada
- **THEN** `user_list.updated_at` de esa lista no cambia

### Requirement: Períodos y rotación

Las plantillas con período (trimestre, mes) SHALL crear una lista nueva por período, con el período
en el título, y al crearla SHALL fijar `expires_at` en la fila del período anterior de la misma
plantilla. Las plantillas sin período SHALL usar la clave `evergreen` y mantener una única lista. Una
lista vencida SHALL seguir siendo pública y accesible por su URL.

#### Scenario: Cambio de trimestre

- **WHEN** empieza un trimestre nuevo y corre `top-rated-quarter`
- **THEN** se crea la lista del trimestre nuevo y la del anterior queda con `expires_at` definido,
  sin dejar de ser visible por su URL

### Requirement: Refresco semanal bajo demanda

El sistema SHALL regenerar cada plantilla cuya última corrida exitosa tenga más de 7 días, disparado
por una visita a `/explore` mediante una tarea posterior a la respuesta, sin cron externo ni
bloquear la respuesta. Solo una corrida por plantilla SHALL estar activa a la vez: una fila `running`
de menos de 15 minutos en `explore_collection_sync` SHALL bloquear a las demás. Cada corrida SHALL
registrar su estado (`running`, `succeeded`, `failed`). Un fallo SHALL conservar las colecciones
anteriores y SHALL NOT impedir la corrida de las demás plantillas.

#### Scenario: Plantilla vencida

- **WHEN** una persona abre `/explore` y una plantilla no tiene corrida exitosa en los últimos 7 días
- **THEN** se programa su regeneración en segundo plano y la respuesta no espera a que termine

#### Scenario: Corrida concurrente

- **WHEN** hay una corrida `running` de menos de 15 minutos para la misma plantilla
- **THEN** una segunda visita no inicia otra corrida

#### Scenario: Fallo

- **WHEN** una corrida falla
- **THEN** queda registrada como `failed`, las colecciones previas siguen en el riel y las demás
  plantillas se ejecutan

#### Scenario: Forzar desde el script

- **WHEN** se ejecuta `scripts/sync-explore-collections.ts`
- **THEN** se regeneran las plantillas sin importar la antigüedad de su última corrida

### Requirement: Colecciones generadas fuera de la consola y del feed

Las listas con `source='template'` SHALL NOT aparecer en el listado de la consola editorial
(`/admin`) y SHALL NOT producir actividad en el feed.

#### Scenario: Consola editorial

- **WHEN** una persona con `editorial.author` abre `/admin`
- **THEN** el listado no incluye las colecciones generadas por plantilla

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

