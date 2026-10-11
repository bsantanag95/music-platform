## ADDED Requirements

### Requirement: Panel de destacadas en la consola editorial

La consola `/admin` SHALL ofrecer un panel "Destacadas en Explorar" visible para quien tenga
`editorial.author`, que liste las colecciones con fila en `user_list_featured` (curadas y generadas)
con su origen, orden, peso, vigencia y si están actualmente en el riel. Las acciones de escritura del
panel SHALL requerir `editorial.publish`; el servidor SHALL rechazarlas con `403` si falta, aunque la
UI las oculte.

#### Scenario: Curador solo con autoría

- **WHEN** una persona con `editorial.author` y sin `editorial.publish` abre el panel
- **THEN** ve la lista de destacadas sin controles de escritura, y una llamada directa de escritura
  recibe `403`

#### Scenario: Administración

- **WHEN** una persona con `editorial.publish` abre el panel
- **THEN** ve los controles para destacar, quitar, reordenar y programar

### Requirement: Destacar solo listas elegibles

El sistema SHALL permitir destacar únicamente listas de `@exploracion` con `kind='standard'`,
`audience='public'`, `moderation_status='visible'`, oficiales (`is_official`) y no retiradas. Intentar
destacar otra lista SHALL fallar con un código de error estable y SHALL NOT crear la fila. Una lista
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

### Requirement: Orden, peso y vigencia

El sistema SHALL permitir reordenar las destacadas enviando la lista completa de ids, fijar
`starts_at` y `expires_at` (con `expires_at` posterior a `starts_at`) y quitar una destacada. El
reordenamiento SHALL aplicarse de forma atómica y SHALL fallar con `FEATURED_ORDER_CONFLICT` si el
conjunto de ids enviado no coincide con el vigente. El riel público SHALL reflejar el nuevo orden.

#### Scenario: Reordenar

- **WHEN** una persona con `editorial.publish` envía un nuevo orden completo
- **THEN** `/explore` muestra las colecciones en ese orden

#### Scenario: Orden desactualizado

- **WHEN** el conjunto de ids enviado difiere del vigente
- **THEN** la operación falla con `FEATURED_ORDER_CONFLICT` y no cambia nada

#### Scenario: Programar una colección

- **WHEN** se fija `starts_at` en el futuro
- **THEN** la colección no aparece en el riel hasta esa fecha

### Requirement: Control de plantillas automáticas

El panel "Generadas automáticamente" SHALL mostrar, por plantilla, su última corrida, estado, último
error y colección vigente, y SHALL permitir —con `editorial.publish`— pausar, reanudar y forzar la
regeneración. Una plantilla pausada SHALL NOT regenerarse por visita ni por el script salvo
forzado explícito, y pausarla SHALL retirar su colección vigente del riel. Forzar SHALL responder
`202` y ejecutarse en segundo plano respetando el lock de corridas.

#### Scenario: Pausar

- **WHEN** se pausa una plantilla
- **THEN** su colección vigente sale del riel y las visitas posteriores no la regeneran

#### Scenario: Reanudar y forzar

- **WHEN** se reanuda una plantilla y se fuerza su regeneración
- **THEN** la respuesta es `202` y, al terminar, la colección vuelve al riel con los ítems nuevos

### Requirement: Auditoría de acciones sobre destacadas

Cada destacado, retiro de destacado, cambio de orden o vigencia SHALL registrarse en
`editorial_action` con la persona actora; las pausas y reanudaciones de plantillas SHALL registrar
quién y cuándo. La autoría SHALL NOT exponerse en superficies públicas.

#### Scenario: Registro de la acción

- **WHEN** una persona destaca una lista
- **THEN** existe una fila `editorial_action` con `action='feature'`, la lista y la persona actora
