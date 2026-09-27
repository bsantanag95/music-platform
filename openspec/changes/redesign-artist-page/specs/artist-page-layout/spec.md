## ADDED Requirements

### Requirement: Zonas de la página de artista

La página de artista SHALL organizarse, de arriba hacia abajo, en: breadcrumb; cabecera con
la foto, la identidad (antetítulo de tipo, nombre, descripción), la ficha, el
resumen de la biografía, el bloque de comunidad y el panel "Tu relación"; la barra de
pestañas; el contenido de la pestaña activa; la sección de integrantes o grupos; y las notas
de la comunidad. En escritorio el panel "Tu relación" SHALL ocupar una columna lateral solo a
la altura de la cabecera, de modo que las pestañas y su contenido usen el ancho completo.

#### Scenario: Escritorio

- **WHEN** una persona abre un artista en un viewport de escritorio
- **THEN** la cabecera muestra foto, identidad, ficha y resumen junto al panel
  "Tu relación", y la discografía ocupa el ancho completo bajo las pestañas

#### Scenario: Móvil

- **WHEN** una persona abre un artista en un viewport móvil
- **THEN** las zonas se apilan en este orden: foto chica junto al tipo, el nombre y la
  descripción; ficha; resumen de la biografía; panel "Tu relación"; bloque de
  comunidad; pestañas; integrantes; notas, sin desbordamiento horizontal de la página

### Requirement: Pestañas del artista

La página SHALL ofrecer las pestañas Discografía y Biografía, en ese orden. Discografía SHALL
ser la pestaña activa al llegar a la página sin pestaña explícita. La pestaña Biografía SHALL
ocultarse cuando el artista no tiene resumen de Wikipedia en ningún idioma, y su URL directa
SHALL responder 404 en ese caso.

#### Scenario: Llegada a la página

- **WHEN** una persona abre `/{locale}/artist/{id}`
- **THEN** la pestaña activa es Discografía

#### Scenario: Artista sin biografía

- **WHEN** un artista no tiene resumen de Wikipedia
- **THEN** la barra de pestañas no muestra Biografía y `/{locale}/artist/{id}/biography`
  responde 404

### Requirement: Pestañas enlazables

Cada pestaña SHALL tener una URL propia locale-aware, de modo que abrir esa URL muestre la
página con la pestaña activa, que el historial del navegador recorra los cambios de pestaña
y que el contenido se entregue renderizado desde el servidor. Cambiar de pestaña SHALL NOT
volver a sincronizar la discografía ni recargar la cabecera.

#### Scenario: Enlace directo a Biografía

- **WHEN** una persona abre la URL de la pestaña Biografía de un artista
- **THEN** la página se muestra con la pestaña Biografía activa y la cabecera completa

#### Scenario: Botón atrás

- **WHEN** una persona pasa de Discografía a Biografía y pulsa "atrás"
- **THEN** vuelve a la pestaña Discografía del mismo artista

### Requirement: Integrantes y notas fuera de las pestañas

La sección de integrantes (grupos) o de grupos (personas) SHALL mostrarse después del
contenido de las pestañas con el mismo contenido y comportamiento que antes de este cambio,
y las notas de la comunidad SHALL mostrarse al final de la página. Ambas SHALL verse con
cualquier pestaña activa.

#### Scenario: Notas con la pestaña Biografía activa

- **WHEN** la pestaña activa es Biografía
- **THEN** la sección de integrantes y las notas de la comunidad siguen visibles debajo
