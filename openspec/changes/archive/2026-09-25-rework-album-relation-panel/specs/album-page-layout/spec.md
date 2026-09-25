## MODIFIED Requirements

### Requirement: Zonas de la página de álbum

La página de álbum SHALL organizarse, de arriba hacia abajo, en: breadcrumb; cabecera con
la carátula, el bloque de identidad (antetítulo de tipo de obra, título, artistas), la
ficha técnica, el bloque de comunidad y el panel "Tu relación"; la barra de pestañas; el
contenido de la pestaña activa; la franja de discografía del artista; y los comentarios.
En escritorio el panel "Tu relación" SHALL ocupar una columna lateral solo a la altura de
la cabecera, de modo que las pestañas y su contenido usen el ancho completo. La carátula
SHALL mostrarse como máximo a 250 px de lado. Cuando el panel lateral crece (por ejemplo,
al abrir el selector de listas), la identidad, la ficha técnica y el bloque de comunidad
SHALL conservar su espaciado vertical y SHALL NOT separarse para acompañar la altura del
panel.

#### Scenario: Escritorio

- **WHEN** una persona abre un álbum en un viewport de escritorio
- **THEN** la cabecera muestra carátula, identidad y ficha, y comunidad junto al panel
  "Tu relación", y la tracklist ocupa el ancho completo bajo las pestañas

#### Scenario: Móvil

- **WHEN** una persona abre un álbum en un viewport móvil
- **THEN** las zonas se apilan en este orden: carátula e identidad, una línea resumen de
  comunidad, el panel "Tu relación", la ficha técnica colapsable, las pestañas, la
  discografía y los comentarios, sin desbordamiento horizontal de la página

#### Scenario: Panel lateral expandido

- **WHEN** un usuario abre el selector de listas en escritorio y el panel supera la altura
  de la columna central
- **THEN** título, ficha y comunidad quedan juntos arriba y el espacio sobrante queda debajo
  de ellos
