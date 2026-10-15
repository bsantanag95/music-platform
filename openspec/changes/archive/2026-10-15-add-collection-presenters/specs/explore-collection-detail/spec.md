## ADDED Requirements

### Requirement: Contexto de la colección en su detalle

El detalle de una colección generada SHALL explicar por qué esos discos están ahí con el **contexto de su plantilla**
(capacidad `collection-presenters`): una frase de resumen en la cabecera, una cartela bajo el artista de cada disco y,
cuando el presentador agrupe los discos, un encabezado por grupo. La página SHALL NOT decidir ese contexto por
familia ni por plantilla: SHALL pintar lo que resuelve el registro de presentadores. El resumen de la cabecera SHALL
resolverse en este orden: la descripción escrita de la lista, el resumen del presentador y, si no hay ninguno, la
descripción genérica de la familia. Las carátulas SHALL llevar número de orden solo cuando el presentador lo pida.

#### Scenario: Resumen del presentador

- **WHEN** se abre el detalle de una colección cuya plantilla tiene presentador con resumen
- **THEN** la cabecera muestra ese resumen en lugar de la descripción genérica de la familia

#### Scenario: Descripción escrita

- **WHEN** la lista de la colección tiene una descripción escrita
- **THEN** la cabecera muestra esa descripción y no el resumen del presentador

#### Scenario: Sin presentador propio

- **WHEN** la plantilla de la colección no tiene presentador
- **THEN** el detalle muestra la cartela y la descripción de su familia, sin ninguna rama propia de esa plantilla

#### Scenario: Cartela por disco

- **WHEN** el presentador produce una cartela para un disco
- **THEN** aparece bajo el artista de ese disco; los discos sin cartela no muestran línea vacía

#### Scenario: Discos agrupados

- **WHEN** el presentador agrupa los discos
- **THEN** el detalle muestra una sección por grupo, con su encabezado y las mismas tarjetas, y ningún disco queda fuera

#### Scenario: Colección sin agrupar

- **WHEN** el presentador no agrupa
- **THEN** el detalle muestra una sola rejilla de discos, como hasta ahora

#### Scenario: Numeración

- **WHEN** el presentador no pide numerar
- **THEN** las carátulas no llevan número de orden
