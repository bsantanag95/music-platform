# album-page-layout Specification

## Purpose
Definir la estructura de la página de álbum como ficha de biblioteca: cabecera, pestañas, franja de discografía y comentarios separados de las reseñas.

## Requirements
### Requirement: Zonas de la página de álbum

La página de álbum SHALL organizarse, de arriba hacia abajo, en: breadcrumb; cabecera con
la carátula, el bloque de identidad (antetítulo de tipo de obra, título, artistas), la
ficha técnica, el bloque de comunidad y el panel "Tu relación"; la barra de pestañas; el
contenido de la pestaña activa; la franja de discografía del artista; y los comentarios.
En escritorio el panel "Tu relación" SHALL ocupar una columna lateral solo a la altura de
la cabecera, de modo que las pestañas y su contenido usen el ancho completo. La carátula
SHALL mostrarse como máximo a 250 px de lado.

#### Scenario: Escritorio

- **WHEN** una persona abre un álbum en un viewport de escritorio
- **THEN** la cabecera muestra carátula, identidad y ficha, y comunidad junto al panel
  "Tu relación", y la tracklist ocupa el ancho completo bajo las pestañas

#### Scenario: Móvil

- **WHEN** una persona abre un álbum en un viewport móvil
- **THEN** las zonas se apilan en este orden: carátula e identidad, una línea resumen de
  comunidad, el panel "Tu relación" compacto, la ficha técnica colapsable, las pestañas, la
  discografía y los comentarios, sin desbordamiento horizontal de la página

### Requirement: Pestañas de contenido

La página SHALL ofrecer las pestañas Canciones, Créditos, Ediciones y Reseñas, en ese
orden. Canciones SHALL ser siempre la pestaña activa al llegar a la página sin pestaña
explícita. Solo la pestaña Reseñas SHALL mostrar un contador (cantidad de reseñas
visibles). Una pestaña sin contenido que mostrar SHALL ocultarse, salvo Canciones y
Reseñas. La página SHALL NOT ofrecer una pestaña de notas adicionales.

#### Scenario: Llegada a la página

- **WHEN** una persona abre `/{locale}/album/{id}`
- **THEN** la pestaña activa es Canciones, sin importar cuántas reseñas tenga el álbum

#### Scenario: Contador de reseñas

- **WHEN** el álbum tiene 17 reseñas visibles
- **THEN** la pestaña se rotula "Reseñas (17)" y ninguna otra pestaña muestra contador

#### Scenario: Pestaña sin contenido

- **WHEN** el álbum no tiene créditos de personal registrados
- **THEN** la pestaña Créditos no se muestra

### Requirement: Pestañas enlazables

Cada pestaña SHALL tener una URL propia locale-aware, de modo que abrir esa URL muestre la
página con la pestaña activa, que el historial del navegador recorra los cambios de
pestaña y que el contenido de cada pestaña se entregue renderizado desde el servidor.
Cambiar de pestaña SHALL NOT volver a ingerir el tracklist ni recargar la cabecera.

#### Scenario: Enlace directo a Reseñas

- **WHEN** una persona abre la URL de la pestaña Reseñas de un álbum
- **THEN** la página se muestra con la pestaña Reseñas activa y la cabecera completa

#### Scenario: Botón atrás

- **WHEN** una persona pasa de Canciones a Reseñas y pulsa "atrás" en el navegador
- **THEN** vuelve a la pestaña Canciones del mismo álbum

### Requirement: Comentarios fuera de las pestañas

Los comentarios del álbum SHALL mostrarse al final de la página, después de la franja de
discografía, fuera de la barra de pestañas y visibles con cualquier pestaña activa.

#### Scenario: Comentarios con otra pestaña activa

- **WHEN** la pestaña activa es Ediciones
- **THEN** los comentarios siguen visibles al final de la página

### Requirement: Franja de discografía

La página SHALL mostrar, bajo el contenido de las pestañas, una franja con los álbumes del
artista principal ordenados por fecha de lanzamiento, con el álbum actual resaltado y
enlaces directos al álbum anterior y al siguiente cuando existan.

#### Scenario: Álbum intermedio

- **WHEN** el álbum tiene uno anterior y uno posterior en la discografía del artista
- **THEN** la franja enlaza a ambos y resalta el álbum actual

#### Scenario: Primer álbum

- **WHEN** el álbum es el primero de la discografía
- **THEN** la franja no muestra enlace al anterior

