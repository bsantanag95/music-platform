## MODIFIED Requirements

### Requirement: Panel "Tu relación" del artista

La página del artista SHALL incluir, para un usuario autenticado, un panel "Tu relación" en una franja a todo el ancho del contenido
justo debajo de la portada, que reúna todas las acciones personales sobre el artista, en este orden: Siguiendo, Favorito,
Pendiente, Escuchas, Colección, En vivo, Listas y Recorrido. En escritorio los tres conmutadores SHALL ir a un lado y las demás filas
en columnas. La página SHALL NOT mostrar estas acciones fuera del panel. El panel SHALL NOT ofrecer valoración con estrellas ni
reseña del artista. Las filas SHALL rotularse sin posesivo, como en el panel del álbum.

#### Scenario: Acciones reunidas

- **WHEN** un usuario autenticado abre un artista
- **THEN** todas las acciones personales están en el panel y no hay una columna de botones
  aparte

#### Scenario: Sin estrellas

- **WHEN** un usuario autenticado mira el panel
- **THEN** no encuentra estrellas ni una acción de reseña

#### Scenario: Franja en escritorio

- **WHEN** un usuario autenticado abre un artista en 1440 px
- **THEN** ve el panel bajo la portada con Siguiendo, Favorito y Pendiente a la izquierda y las demás filas en columnas

### Requirement: Panel del artista en móvil

En móvil el panel SHALL mostrarse después de la portada y antes de la barra de pestañas, con las mismas filas que en
escritorio, en una sola columna y con conmutadores de al menos 40 px de alto.

#### Scenario: Panel compacto

- **WHEN** un usuario autenticado abre un artista en móvil
- **THEN** ve las ocho filas sin abrir ningún menú, entre la portada y las pestañas
