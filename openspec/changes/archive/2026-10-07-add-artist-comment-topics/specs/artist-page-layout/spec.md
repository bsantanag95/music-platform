## REMOVED Requirements

### Requirement: Notas de la comunidad al final

**Reason**: La sección "Notas de la comunidad" pasa a ser "Comentarios" con temas (capability `artist-comment-topics`).
**Migration**: Ver el requisito "Comentarios de la comunidad al final".

## ADDED Requirements

### Requirement: Comentarios de la comunidad al final

Los comentarios de la comunidad (capability `artist-comment-topics`) SHALL mostrarse al final de
la página, después del contenido de la pestaña, con cualquier pestaña activa.

#### Scenario: Comentarios con la pestaña Integrantes activa

- **WHEN** la pestaña activa es Integrantes
- **THEN** los comentarios de la comunidad se ven debajo de la alineación

## MODIFIED Requirements

### Requirement: Zonas de la página de artista

La página de artista SHALL organizarse, de arriba hacia abajo, en: breadcrumb; cabecera con
la foto, la identidad (antetítulo de tipo, nombre, descripción), la ficha, el
resumen de la biografía, el bloque de comunidad y el panel "Tu relación"; la barra de
pestañas; el contenido de la pestaña activa; y los comentarios de la comunidad. Los integrantes o
grupos SHALL mostrarse en su pestaña (capability `artist-lineup-view`), no debajo de las
pestañas. En escritorio el panel "Tu relación" SHALL ocupar una columna lateral solo a
la altura de la cabecera, de modo que las pestañas y su contenido usen el ancho completo.

#### Scenario: Escritorio

- **WHEN** una persona abre un artista en un viewport de escritorio
- **THEN** la cabecera muestra foto, identidad, ficha y resumen junto al panel
  "Tu relación", y la discografía ocupa el ancho completo bajo las pestañas

#### Scenario: Móvil

- **WHEN** una persona abre un artista en un viewport móvil
- **THEN** las zonas se apilan en este orden: foto chica junto al tipo, el nombre y la
  descripción; ficha; resumen de la biografía; panel "Tu relación"; bloque de
  comunidad; pestañas; contenido de la pestaña; comentarios, sin desbordamiento horizontal de la
  página
