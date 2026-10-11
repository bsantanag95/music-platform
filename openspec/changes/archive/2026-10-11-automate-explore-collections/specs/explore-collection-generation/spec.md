## ADDED Requirements

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
