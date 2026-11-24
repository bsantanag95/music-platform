## MODIFIED Requirements

### Requirement: Zonas de la página de álbum

La página de álbum SHALL organizarse, de arriba hacia abajo, en: la portada a todo el ancho con la miga de pan y Compartir, la
carátula en su funda, la identidad (tipo de obra y año, título, artistas), la ficha, el bloque de comunidad y la acción principal (el
botón «Valorar este disco» sin sesión o el panel "Tu relación" con sesión); la barra de pestañas; el contenido de la pestaña activa;
la franja de discografía del artista; y los comentarios. El contenido SHALL usar el mismo ancho máximo que el resto del sitio (88rem).
La portada SHALL tener de fondo la propia carátula desenfocada (solo color) o, sin carátula, un disco dibujado; ese fondo SHALL ser
decorativo. En escritorio la acción principal SHALL ocupar una columna a la derecha de la portada, de modo que las pestañas y su
contenido usen el ancho completo. La carátula SHALL mostrarse como máximo a 250 px de lado, con un disco de vinilo decorativo
asomando detrás. Cuando el panel lateral crece (por ejemplo, al abrir el selector de listas), la identidad, la ficha y el bloque de
comunidad SHALL conservar su espaciado vertical y SHALL NOT separarse para acompañar la altura del panel. En móvil la carátula SHALL
mostrarse primero, a media anchura, y la primera canción SHALL NOT quedar más abajo que con la cabecera anterior.

#### Scenario: Escritorio

- **WHEN** una persona abre un álbum en un viewport de escritorio
- **THEN** la portada muestra la carátula con el vinilo asomando, la identidad, la ficha y la comunidad junto a la acción principal,
  y la tracklist ocupa el ancho completo bajo las pestañas

#### Scenario: Móvil

- **WHEN** una persona abre un álbum en un viewport móvil
- **THEN** las zonas se apilan en este orden: carátula, identidad, ficha, comunidad, acción principal, pestañas, contenido de la
  pestaña, discografía y comentarios, sin desbordamiento horizontal de la página

#### Scenario: Panel lateral expandido

- **WHEN** un usuario abre el selector de listas en escritorio y el panel supera la altura de la columna central
- **THEN** título, ficha y comunidad quedan juntos arriba y el espacio sobrante queda debajo de ellos

#### Scenario: Álbum sin carátula

- **WHEN** una persona abre un álbum sin carátula
- **THEN** la portada muestra el disco dibujado de fondo y la funda con el relleno del disco, sin imagen rota
