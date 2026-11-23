## MODIFIED Requirements

### Requirement: Zonas de la página de artista

La página de artista SHALL organizarse, de arriba hacia abajo, en: la portada a todo el ancho con la miga de pan y Compartir, el
retrato, la identidad (nombre y descripción), la ficha y la acción principal (el botón «Seguir a {artista}» sin sesión o el panel
«Tu relación» con sesión); la barra de pestañas; el contenido de la pestaña activa; y los comentarios de la comunidad. El contenido
SHALL usar el mismo ancho máximo que el resto del sitio (88rem). Los integrantes o grupos SHALL mostrarse en su pestaña
(capability `artist-lineup-view`), no debajo de las pestañas. En escritorio la acción principal SHALL ocupar una columna a la
derecha de la portada, de modo que las pestañas y su contenido usen el ancho completo.

#### Scenario: Escritorio

- **WHEN** una persona abre un artista en un viewport de escritorio
- **THEN** la portada muestra retrato, identidad y ficha junto a la acción principal, y la discografía ocupa el ancho completo
  bajo las pestañas

#### Scenario: Móvil

- **WHEN** una persona abre un artista en un viewport móvil
- **THEN** las zonas se apilan en este orden: retrato; nombre y descripción; ficha; acción principal; pestañas; contenido de la
  pestaña; comentarios, sin desbordamiento horizontal de la página

## REMOVED Requirements

### Requirement: Bloque de comunidad en una fila

**Reason**: las tres tarjetas de comunidad pasan a una parte de la línea de la ficha que omite las cifras en 0 (capability
`artist-community-stats`).

**Migration**: oyentes, seguidores y listas se leen en la ficha de la portada; la línea no desborda en ningún viewport.
