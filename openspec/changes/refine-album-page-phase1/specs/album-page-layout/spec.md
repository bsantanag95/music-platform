## MODIFIED Requirements

### Requirement: Pestañas de contenido

La página SHALL ofrecer las pestañas Canciones, Créditos, Ediciones y Reseñas, en ese
orden. Canciones SHALL ser siempre la pestaña activa al llegar a la página sin pestaña
explícita. Solo la pestaña Reseñas SHALL mostrar un contador (cantidad de reseñas
visibles), escrito tras el nombre sin paréntesis. Una pestaña sin contenido que mostrar
SHALL ocultarse, salvo Canciones y Reseñas. La página SHALL NOT ofrecer una pestaña de
notas adicionales.

#### Scenario: Llegada a la página

- **WHEN** una persona abre `/{locale}/album/{id}`
- **THEN** la pestaña activa es Canciones, sin importar cuántas reseñas tenga el álbum

#### Scenario: Contador de reseñas

- **WHEN** el álbum tiene 17 reseñas visibles
- **THEN** la pestaña se rotula "Reseñas 17" y ninguna otra pestaña muestra contador

#### Scenario: Pestaña sin contenido

- **WHEN** el álbum no tiene créditos de personal registrados
- **THEN** la pestaña Créditos no se muestra

## ADDED Requirements

### Requirement: Barra de pestañas fija y sin desborde visible

La barra de pestañas SHALL quedar fija bajo el encabezado del sitio al desplazarse por la
página, como en la página de artista. Cuando las pestañas no caben en el ancho disponible,
la barra SHALL desplazarse en horizontal sin mostrar la barra de desplazamiento del sistema,
SHALL desvanecer el borde por el que quedan pestañas ocultas y SHALL mostrar la pestaña
activa al cargar. Cuando todas caben, ninguna pestaña SHALL aparecer desvanecida. La página
SHALL NOT desplazarse en horizontal.

#### Scenario: Desplazamiento por la tracklist

- **WHEN** una persona baja por la pestaña Canciones más allá de la cabecera
- **THEN** la barra de pestañas sigue visible bajo el encabezado del sitio

#### Scenario: Pestañas en 375 px

- **WHEN** una persona abre un álbum con las cuatro pestañas en 375 px
- **THEN** no se ve barra de desplazamiento bajo las pestañas y el borde con pestañas ocultas se ve desvanecido

#### Scenario: Pestaña activa fuera de la vista

- **WHEN** una persona abre la URL de la pestaña Reseñas en 375 px
- **THEN** la pestaña Reseñas aparece completa dentro de la barra

### Requirement: Comentarios con ancho de lectura

Los comentarios del álbum SHALL limitarse al mismo ancho de lectura que los de la página de
artista (`max-w-3xl`).

#### Scenario: Comentarios en escritorio

- **WHEN** una persona abre un álbum en 1440 px
- **THEN** el bloque de comentarios no ocupa todo el ancho del contenido

### Requirement: Controles y enlaces secundarios coherentes

Los controles segmentados de la página (vista de Créditos, formato de Ediciones y orden de
Reseñas) SHALL usar el mismo estilo que los de la discografía del artista: un grupo con
borde y la opción activa sobre la superficie. Los enlaces secundarios (ver ediciones, pistas
adicionales, enlaces a MusicBrainz, iniciar sesión, navegación entre reseñas) SHALL mostrarse
neutros en reposo y en ámbar al pasar el cursor o con el foco. Los indicadores de
despliegue y de navegación SHALL usar el chevron SVG común, no glifos de texto.

#### Scenario: Orden de reseñas

- **WHEN** una persona abre la pestaña Reseñas de un álbum con dos o más reseñas
- **THEN** el orden se elige con un control segmentado igual al de Créditos y Ediciones

#### Scenario: Enlace a ediciones en reposo

- **WHEN** una persona ve "Ver ediciones" en la ficha técnica sin pasar el cursor
- **THEN** el enlace se muestra en el color del texto, no en ámbar
