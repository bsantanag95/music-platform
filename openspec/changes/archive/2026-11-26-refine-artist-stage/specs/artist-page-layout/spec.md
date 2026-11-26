## MODIFIED Requirements

### Requirement: Zonas de la página de artista

La página de artista SHALL organizarse, de arriba hacia abajo, en: la portada a todo el ancho con la miga de pan y Compartir, el
retrato, la identidad (nombre y descripción), la ficha y, sin sesión, el botón «Seguir a {artista}»; con sesión, el panel «Tu
relación» en una franja a todo el ancho del contenido justo debajo de la portada; la barra de pestañas; el contenido de la pestaña
activa; y los comentarios de la comunidad. El contenido SHALL usar el mismo ancho máximo que el resto del sitio (88rem). Los
integrantes o grupos SHALL mostrarse en su pestaña (capability `artist-lineup-view`), no debajo de las pestañas. La portada SHALL
NOT estirarse por el alto del panel.

#### Scenario: Escritorio

- **WHEN** una persona abre un artista en un viewport de escritorio
- **THEN** la portada muestra retrato, identidad y ficha (y «Seguir a {artista}» sin sesión), y la discografía ocupa el ancho
  completo bajo las pestañas

#### Scenario: Móvil

- **WHEN** una persona abre un artista en un viewport móvil
- **THEN** las zonas se apilan en este orden: retrato; nombre y descripción; ficha; acción principal o panel; pestañas; contenido
  de la pestaña; comentarios, sin desbordamiento horizontal de la página

#### Scenario: Con sesión

- **WHEN** un usuario autenticado abre un artista en escritorio
- **THEN** el nombre queda a la altura de siempre de la portada y el panel «Tu relación» aparece debajo de ella, antes de las
  pestañas
