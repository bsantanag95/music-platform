## MODIFIED Requirements

### Requirement: Diálogo de acciones rápidas en el Header

El Header SHALL ofrecer, solo con sesión, un control **"Añadir"** en la zona de usuario —junto al menú de
usuario, no en la barra general de navegación de contenido— que abre un diálogo de acciones rápidas sin navegar
a otra ruta. El diálogo SHALL presentar sus acciones como una fila de chips con
semántica de grupo de opciones (`radiogroup`, navegables con flechas), en este orden: **Escucha**, **Valorar**,
**Favorito**, **Pendiente**, **Colección**, **Recorrido**, **A lista**, **Nueva lista** y **Nuevo Camino**. El
diálogo SHALL abrirse siempre con **Escucha** seleccionada y el
foco en el buscador, sin recordar la acción usada la última vez. El diálogo SHALL ser accesible: renderizarse en
un portal, atrapar el foco, cerrarse con `Escape` devolviendo el foco al control, bloquear el desplazamiento de la
página y rotular cada chip y cada estado. Cerrar el diálogo SHALL NOT deshacer lo ya guardado.

#### Scenario: Abre en Escucha con el buscador enfocado

- **WHEN** una persona con sesión activa el control "Añadir"
- **THEN** se abre el diálogo con el chip "Escucha" seleccionado y el foco en el buscador de objetivos

#### Scenario: Sin sesión no se ofrece

- **WHEN** se renderiza el Header sin sesión
- **THEN** la zona de usuario no muestra el control "Añadir"

#### Scenario: Cambiar de acción conserva la búsqueda

- **WHEN** una persona escribe "Dr. Feelgood" con el chip "Escucha" y cambia al chip "Valorar"
- **THEN** el texto de búsqueda y el tipo de objetivo se conservan y no se registra ninguna escucha

#### Scenario: Cerrar no deshace

- **WHEN** una persona marca un favorito desde el diálogo y lo cierra con `Escape`
- **THEN** el favorito persiste y el foco vuelve al control "Añadir"

### Requirement: Buscador de objetivos compartido

Las acciones que operan sobre un objetivo (Escucha, Valorar, Favorito, Pendiente, Colección, Recorrido y A lista)
SHALL elegir el objetivo con un mismo buscador del catálogo con un tipo por búsqueda —álbum (por defecto), canción
o artista—, con espera de 300 ms tras la última tecla, mínimo de dos letras y estados de cargando, error y sin
resultados. Los resultados de canción SHALL limitarse a canciones con grabación identidad registrable. La acción
**Pendiente** SHALL ofrecer solo los tipos álbum y artista, porque Pendiente no admite canciones; **Colección**
SHALL ofrecer solo álbumes y **Recorrido** solo artistas.

#### Scenario: Un tipo por búsqueda

- **WHEN** una persona busca con el tipo "Canción"
- **THEN** la petición busca solo canciones y los resultados no mezclan álbumes ni artistas

#### Scenario: Pendiente no ofrece canciones

- **WHEN** una persona selecciona el chip "Pendiente"
- **THEN** el buscador ofrece los tipos álbum y artista y no el tipo canción

#### Scenario: Menos de dos letras

- **WHEN** una persona escribe una sola letra
- **THEN** no se hace ninguna búsqueda y se muestra la indicación de escribir al menos dos letras

#### Scenario: Colección y Recorrido restringen el tipo

- **WHEN** una persona selecciona el chip "Colección" y luego el chip "Recorrido"
- **THEN** Colección busca solo álbumes y Recorrido busca solo artistas, sin conmutador de tipo

## ADDED Requirements

### Requirement: Acción Colección

El chip **Colección** SHALL, tras elegir un álbum, ofrecer los formatos vinilo, CD, casete y otro, y agregar una
copia a la colección propia al tocar uno, con la audiencia por defecto de la persona. Tras agregar SHALL confirmar
con el formato elegido y ofrecer **Deshacer**, que quita esa copia. El diálogo SHALL NOT pedir atributos de
edición ni nota: se editan en la página de colección. Agregar un álbum que ya está en la colección SHALL crear
otra copia, no reemplazar la existente.

#### Scenario: Agregar una copia en vinilo

- **WHEN** una persona elige un álbum con el chip "Colección" y toca "Vinilo"
- **THEN** se agrega una copia en vinilo y el diálogo ofrece "Deshacer"

#### Scenario: Deshacer

- **WHEN** una persona activa "Deshacer" tras agregar una copia
- **THEN** esa copia se quita

### Requirement: Acción Recorrido

El chip **Recorrido** SHALL, tras elegir un artista, consultar primero si la persona ya tiene un recorrido sobre
él. Si ya existe, SHALL informarlo y enlazar a su gestión sin modificar nada. Si no existe, SHALL activarlo y
confirmar con un enlace a su gestión, mostrando un estado de progreso mientras se activa.

#### Scenario: Activar un recorrido

- **WHEN** una persona elige un artista sin recorrido con el chip "Recorrido"
- **THEN** se activa su recorrido y el diálogo enlaza a `/me/artist-journeys/{artistId}`

#### Scenario: Ya tiene recorrido

- **WHEN** una persona elige un artista que ya tiene recorrido
- **THEN** el diálogo informa que ya está en su Recorrido, enlaza a su gestión y no activa nada

### Requirement: Acción Nuevo Camino

El chip **Nuevo Camino** SHALL pedir solo un título (obligatorio) y crear el Camino **sin audiencia explícita**,
de modo que se aplique la audiencia por defecto de la persona. Al crearlo SHALL ofrecer **Ver Camino** y
**Agregar a este Camino**; esta última SHALL llevar al chip "A lista" con la búsqueda fijada a álbumes.

#### Scenario: Crear un Camino con la audiencia por defecto

- **WHEN** una persona con audiencia por defecto `private` crea un Camino desde el diálogo
- **THEN** el Camino se crea con audiencia `private`, sin que el diálogo la haya preguntado

#### Scenario: Título obligatorio

- **WHEN** una persona intenta crear un Camino sin título
- **THEN** no se crea y se indica que el título es obligatorio

#### Scenario: Agregar a un Camino recién creado

- **WHEN** una persona crea un Camino y activa "Agregar a este Camino"
- **THEN** el diálogo pasa al chip "A lista" con la búsqueda fijada en álbumes
