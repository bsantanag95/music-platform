## ADDED Requirements

### Requirement: Presentación del cuerpo de Inicio sin sesión

En la portada sin sesión, el sistema SHALL presentar las colecciones curadas como un
mosaico de hasta seis colecciones —una destacada de mayor tamaño y el resto en un tamaño
menor— con un enlace a todas las colecciones, y en pantallas angostas SHALL presentarlas
como un riel de desplazamiento horizontal en lugar de apilarlas a ancho completo. El
sistema SHALL presentar los álbumes mejor valorados como un riel horizontal que muestra
de cada álbum su carátula, su título, su artista principal y su promedio de estrellas. El
sistema SHALL presentar la actividad reciente de la comunidad como tarjetas que muestran
la carátula del objetivo, el autor, la valoración en la forma compacta que fija
`rating-display` para la actividad de la comunidad (`★ 86/100` si tiene puntaje
detallado, `★ 4,5` si no) y, cuando la entrada es un comentario o una reseña, un extracto
de su texto. La entrada de ejemplo del hero sin sesión SHALL mostrar la fila de estrellas
y el puntaje como `92/100` en un tono neutro, sin colorearlo según su valor.
Desde anchos de escritorio, la actividad SHALL ocupar la columna principal y los
comentarios populares y las listas públicas recientes SHALL ir en una columna lateral.
Estas presentaciones SHALL NOT aplicarse al Inicio con sesión ni a la página de
descubrimiento.

#### Scenario: Colecciones en mosaico en escritorio
- **WHEN** un visitante sin sesión abre `/[locale]` en una pantalla de 1440 px y hay
  ocho colecciones curadas
- **THEN** ve seis colecciones en un mosaico, una de ellas destacada, y un enlace a todas
  las colecciones

#### Scenario: Colecciones en riel en un teléfono
- **WHEN** un visitante sin sesión abre `/[locale]` en una pantalla de 390 px con
  colecciones curadas
- **THEN** las colecciones forman una sola fila que se desplaza en horizontal y no se
  apilan una debajo de otra

#### Scenario: Mejor valorados con artista y promedio
- **WHEN** un visitante sin sesión abre `/[locale]` y hay álbumes con suficientes
  valoraciones
- **THEN** cada álbum del riel muestra su artista principal y su promedio de estrellas

#### Scenario: Comentario de la comunidad como tarjeta
- **WHEN** la actividad reciente de la comunidad incluye un comentario público sobre un
  álbum
- **THEN** la portada sin sesión lo muestra como una tarjeta con la carátula del álbum,
  el autor y un extracto del comentario

#### Scenario: Valoración con puntaje en una tarjeta de la comunidad
- **WHEN** la actividad reciente de la comunidad incluye una valoración de 4,5 estrellas
  con puntaje 86
- **THEN** su tarjeta muestra `★ 86/100`, sin `4,5`

#### Scenario: Puntaje neutro en la entrada de ejemplo
- **WHEN** un visitante sin sesión ve la entrada de ejemplo del hero
- **THEN** ve la fila de estrellas y `92/100` con el mismo tono que cualquier otro
  puntaje

#### Scenario: El Inicio con sesión conserva su presentación
- **WHEN** un usuario autenticado abre `/[locale]`
- **THEN** la actividad de la comunidad y las listas públicas conservan su presentación
  en filas compactas y no aparece el mosaico de colecciones

### Requirement: Acceso a personas en Inicio sin sesión

La portada sin sesión SHALL ofrecer un acceso a la búsqueda de usuarios (`/users`) dentro
del bloque de la comunidad, y ese acceso SHALL mostrarse aunque no haya actividad reciente
de la comunidad.

#### Scenario: Acceso a personas con actividad
- **WHEN** un visitante sin sesión abre `/[locale]` y hay actividad reciente de la
  comunidad
- **THEN** ve en el bloque de la comunidad un acceso «Conoce a quienes escuchan» que abre
  `/users`

#### Scenario: Acceso a personas sin actividad
- **WHEN** un visitante sin sesión abre `/[locale]` y no hay actividad reciente de la
  comunidad, comentarios populares ni listas públicas
- **THEN** sigue viendo el acceso «Conoce a quienes escuchan» que abre `/users`
