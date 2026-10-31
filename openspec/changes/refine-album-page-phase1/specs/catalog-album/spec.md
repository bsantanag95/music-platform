## ADDED Requirements

### Requirement: Fila de canción compacta en móvil

En móvil cada fila de la tracklist SHALL mostrar en una sola línea el número, el título y, a
la derecha, la valoración propia (si existe), la marca de escucha (si existe), el corazón de
favorito (con sesión), la duración y el menú. Las marcas que no existen SHALL NOT reservar
espacio. Una segunda línea SHALL aparecer solo para el artista distinto del principal, el
featuring o la versión de origen. En escritorio las columnas alineadas SHALL mantenerse.

#### Scenario: Pista sin valoración propia en móvil

- **WHEN** un usuario autenticado sin valoración de la pista 1 abre el álbum en 375 px
- **THEN** el corazón queda junto a la duración, a la derecha de la fila, sin hueco intermedio

#### Scenario: Visitante anónimo en móvil

- **WHEN** una persona sin sesión abre el álbum en 375 px
- **THEN** cada fila muestra número, título, duración y menú en una sola línea

### Requirement: Título de Ediciones para lectores de pantalla

La pestaña Ediciones SHALL conservar su título para lectores de pantalla sin mostrarlo,
como Canciones y Créditos: la pestaña activa ya lo nombra. El resumen de cantidades y los
filtros SHALL quedar en la primera fila de la pestaña.

#### Scenario: Pestaña Ediciones

- **WHEN** una persona abre la pestaña Ediciones
- **THEN** no ve un título "Ediciones" bajo la pestaña activa y sí el resumen y los filtros
