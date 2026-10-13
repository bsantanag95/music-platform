## MODIFIED Requirements

### Requirement: Panel de destacadas en la consola editorial

La consola `/admin` SHALL ofrecer un panel "Destacadas en Explorar" visible para quien tenga
`editorial.author`, que liste las colecciones con fila en `user_list_featured` en **dos grupos** —selección editorial
(`curated`) y colecciones automáticas (`template`)— con su origen, orden, peso, vigencia y si están actualmente en
el riel de su grupo. Las acciones de escritura del panel SHALL requerir `editorial.publish`; el servidor SHALL
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
- **THEN** el panel las muestra en dos grupos y el estado "dentro del tope" de cada fila se evalúa contra el tope de su
  propio rail

### Requirement: Orden, peso y vigencia

El sistema SHALL permitir reordenar las destacadas **de un grupo** (`curated` o `automatic`) enviando el grupo y la
lista completa de ids de ese grupo, fijar `starts_at` y `expires_at` (con `expires_at` posterior a `starts_at`) y quitar
una destacada. El reordenamiento SHALL aplicarse de forma atómica, SHALL NOT afectar el orden del otro grupo y SHALL
fallar con `FEATURED_ORDER_CONFLICT` si el conjunto de ids enviado no coincide con el vigente de ese grupo. El riel
público correspondiente SHALL reflejar el nuevo orden.

#### Scenario: Reordenar

- **WHEN** una persona con `editorial.publish` envía un nuevo orden completo de un grupo
- **THEN** `/explore` muestra las colecciones de ese rail en ese orden

#### Scenario: Orden desactualizado

- **WHEN** el conjunto de ids enviado difiere del vigente del grupo
- **THEN** la operación falla con `FEATURED_ORDER_CONFLICT` y no cambia nada

#### Scenario: Grupos independientes

- **WHEN** se reordena la selección editorial
- **THEN** el orden de las colecciones automáticas no cambia

#### Scenario: Programar una colección

- **WHEN** se fija `starts_at` en el futuro
- **THEN** la colección no aparece en el riel hasta esa fecha
