## MODIFIED Requirements

### Requirement: Panel de destacadas en la consola editorial

La consola `/admin` SHALL ofrecer un panel "Destacadas en Explorar" visible para quien tenga
`editorial.author`, que liste las colecciones con fila en `user_list_featured` en **una sola secuencia**, en el mismo
orden que el riel público, cada fila con su origen (curada o automática), su familia, su orden, su peso, su vigencia y
si está actualmente en el riel. El panel SHALL NOT dividir las destacadas en dos grupos con órdenes separados: el
orden es uno solo y el estado "dentro del tope" de cada fila SHALL evaluarse contra el tope único del riel de
`/explore`, contando curadas y generadas juntas. El origen de cada fila SHALL seguir visible, porque es lo que dice a
quien edita qué sobreescribirá la próxima corrida de la plantilla. La distinción entre lo manual y lo automático
SHALL seguir viviendo en las pestañas de la consola ("Destacadas en Explorar" y "Generadas automáticamente"). Las
acciones de escritura del panel SHALL requerir `editorial.publish`; el servidor SHALL
rechazarlas con `403` si falta, aunque la UI las oculte.

#### Scenario: Curador solo con autoría

- **WHEN** una persona con `editorial.author` y sin `editorial.publish` abre el panel
- **THEN** ve la lista de destacadas sin controles de escritura, y una llamada directa de escritura
  recibe `403`

#### Scenario: Administración

- **WHEN** una persona con `editorial.publish` abre el panel
- **THEN** ve los controles para destacar, quitar, reordenar y programar

#### Scenario: Dos grupos

- **WHEN** hay filas curadas y generadas
- **THEN** el panel las muestra en una sola secuencia, cada fila rotulada con su origen, y el estado "dentro del
  tope" se evalúa contra el tope único del riel, contando curadas y generadas juntas

### Requirement: Destacar solo listas elegibles

El sistema SHALL permitir destacar únicamente listas de `@exploracion` con `kind='standard'`,
`audience='public'`, `moderation_status='visible'`, oficiales (`is_official`) y no retiradas, y SHALL exigir una
familia válida al destacar. Intentar destacar otra lista, o hacerlo sin familia o con una familia desconocida, SHALL
fallar con un código de error estable y SHALL NOT crear la fila. Una lista
curada destacada que se retira o deja de ser pública SHALL salir del riel sin borrar su fila.

#### Scenario: Lista no publicada

- **WHEN** se intenta destacar una lista en borrador o propuesta
- **THEN** la operación falla con `FEATURE_NOT_PUBLISHED` y no se crea fila

#### Scenario: Lista ajena

- **WHEN** se intenta destacar una lista que no es de `@exploracion`
- **THEN** la operación falla con `FEATURE_NOT_ELIGIBLE`

#### Scenario: Retiro de una destacada

- **WHEN** se retira una lista oficial que estaba destacada
- **THEN** deja de aparecer en el riel de `/explore` y su fila se conserva

#### Scenario: Sin familia

- **WHEN** se intenta destacar una lista elegible sin indicar familia, o con una familia que no existe
- **THEN** la operación falla con un error de validación y no se crea fila

### Requirement: Orden, peso y vigencia

El sistema SHALL permitir reordenar las destacadas enviando la lista completa de ids de **todas** las colecciones
vigentes, sin distinguir el origen, fijar `starts_at` y `expires_at` (con `expires_at` posterior a `starts_at`) y
quitar una destacada. El reordenamiento SHALL aplicarse de forma atómica sobre esa única secuencia y SHALL
fallar con `FEATURED_ORDER_CONFLICT` si el conjunto de ids enviado no coincide con el vigente. El riel
público SHALL reflejar el nuevo orden. Una colección generada por una corrida posterior de su plantilla SHALL
incorporarse al final de la secuencia, y `weight` SHALL seguir primando sobre `rank` en la lectura del riel.

#### Scenario: Reordenar

- **WHEN** una persona con `editorial.publish` envía un nuevo orden completo de las colecciones vigentes
- **THEN** `/explore` muestra el riel en ese orden

#### Scenario: Orden desactualizado

- **WHEN** el conjunto de ids enviado difiere del vigente
- **THEN** la operación falla con `FEATURED_ORDER_CONFLICT` y no cambia nada

#### Scenario: Grupos independientes

- **WHEN** se reordena la secuencia moviendo una colección curada por delante de una generada
- **THEN** el riel refleja ese orden: no existen dos órdenes separados por origen

#### Scenario: Programar una colección

- **WHEN** se fija `starts_at` en el futuro
- **THEN** la colección no aparece en el riel hasta esa fecha
