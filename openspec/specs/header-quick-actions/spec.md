# header-quick-actions Specification

## Purpose
Acciones rápidas de escritura desde el Header: un diálogo, solo con sesión, que lleva a un máximo de tres pasos registrar una escucha, valorar (estrellas y puntuación 1–100), marcar un favorito, dejar algo Pendiente, agregar a una lista y crear una lista. Vive junto al menú de usuario; el menú sigue siendo para ver y gestionar, el diálogo para escribir.
## Requirements
### Requirement: Diálogo de acciones rápidas en el Header

El Header SHALL ofrecer, solo con sesión, un control **"Añadir"** en la zona de usuario —junto al menú de
usuario, no en la barra general de navegación de contenido— que abre un diálogo de acciones rápidas sin navegar
a otra ruta. El diálogo SHALL presentar sus acciones como una fila de chips con
semántica de grupo de opciones (`radiogroup`, navegables con flechas): **Escucha**, **Valorar**, **Favorito**,
**Pendiente**, **A lista** y **Nueva lista**. El diálogo SHALL abrirse siempre con **Escucha** seleccionada y el
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

Las acciones que operan sobre un objetivo (Escucha, Valorar, Favorito, Pendiente y A lista) SHALL elegir el
objetivo con un mismo buscador del catálogo con un tipo por búsqueda —álbum (por defecto), canción o artista—, con
espera de 300 ms tras la última tecla, mínimo de dos letras y estados de cargando, error y sin resultados. Los
resultados de canción SHALL limitarse a canciones con grabación identidad registrable. La acción **Pendiente**
SHALL ofrecer solo los tipos álbum y artista, porque Pendiente no admite canciones.

#### Scenario: Un tipo por búsqueda

- **WHEN** una persona busca con el tipo "Canción"
- **THEN** la petición busca solo canciones y los resultados no mezclan álbumes ni artistas

#### Scenario: Pendiente no ofrece canciones

- **WHEN** una persona selecciona el chip "Pendiente"
- **THEN** el buscador ofrece los tipos álbum y artista y no el tipo canción

#### Scenario: Menos de dos letras

- **WHEN** una persona escribe una sola letra
- **THEN** no se hace ninguna búsqueda y se muestra la indicación de escribir al menos dos letras

### Requirement: Acción Escucha

El chip **Escucha** SHALL conservar el flujo de registro global de `listen-diary`: elegir un objetivo crea la
escucha al instante con audiencia `private` y ofrece el panel para ampliarla, con "Registrar otra" y un enlace al
diario.

#### Scenario: Registrar una escucha

- **WHEN** una persona elige un álbum con el chip "Escucha"
- **THEN** se crea una escucha con audiencia `private` y se ofrece ampliarla con contexto, reacción, impresión y
  audiencia

### Requirement: Acción Valorar

El chip **Valorar** SHALL, tras elegir el objetivo, mostrar las estrellas (½ a 5) y un **deslizador** de
puntuación detallada (1–100) con botones − y +, el mismo de la valoración propia del álbum, ambos con el valor
vigente si la persona ya valoró el objetivo. Tocar una estrella SHALL guardar al instante; si existe un puntaje
detallado coherente con las nuevas estrellas SHALL conservarse y, si deja de serlo, SHALL guardarse sin él y
avisarse. Con estrellas, el deslizador SHALL limitarse a su tramo (4★ → 71–80); sin estrellas SHALL ir de 1 a 100.
El deslizador SHALL mostrar `—/100` hasta que se elige un valor, y el botón **Guardar** SHALL estar deshabilitado
mientras no haya un valor distinto del vigente. Guardar SHALL enviar solo el puntaje y aplicar las estrellas que
el servidor derive de él, de modo que nunca se envíe una combinación incoherente. El diálogo SHALL NOT editar la
reseña ni el comentario: tras guardar SHALL ofrecer un enlace a la página del objetivo para ampliarlos.

#### Scenario: Valorar un álbum sin valoración previa

- **WHEN** una persona elige un álbum y toca la cuarta estrella
- **THEN** se guarda una valoración de 4 estrellas y se confirma con un enlace a la página del álbum

#### Scenario: Valoración previa precargada

- **WHEN** una persona elige un álbum que ya valoró con 3,5 estrellas
- **THEN** las estrellas se muestran en 3,5 antes de tocar nada

#### Scenario: Puntaje detallado incoherente

- **WHEN** una persona con 3 estrellas y puntaje 55 elige un álbum y toca 5 estrellas
- **THEN** se guardan 5 estrellas sin el puntaje 55 y se avisa que el puntaje detallado se quitó

#### Scenario: Puntuar con el deslizador

- **WHEN** una persona sin valoración previa elige un álbum, mueve el deslizador a 90 y activa Guardar
- **THEN** se guarda el puntaje 90 y las estrellas pasan al valor que el servidor deriva de él (4,5)

#### Scenario: Deslizador limitado al tramo

- **WHEN** una persona elige un álbum que ya valoró con 4 estrellas
- **THEN** el deslizador va de 71 a 80 y Guardar está deshabilitado hasta que cambie el valor

#### Scenario: Puntuación precargada

- **WHEN** una persona elige un álbum que ya valoró con puntaje 95
- **THEN** el deslizador y el valor muestran 95 antes de tocar nada

### Requirement: Acciones Favorito y Pendiente

Los chips **Favorito** y **Pendiente** SHALL, tras elegir el objetivo, consultar primero las marcas de la persona
sobre ese objetivo. Si el objetivo no estaba marcado, SHALL marcarlo al instante y ofrecer **Deshacer**. Si ya
estaba marcado, SHALL informarlo sin modificar nada y ofrecer **Quitar**. Estas acciones SHALL NOT quitar una
marca existente como efecto de elegir el objetivo.

#### Scenario: Marcar un favorito nuevo

- **WHEN** una persona elige un álbum que no tiene como favorito con el chip "Favorito"
- **THEN** el álbum queda como favorito y el diálogo ofrece "Deshacer"

#### Scenario: Deshacer

- **WHEN** una persona activa "Deshacer" tras marcar un favorito
- **THEN** el favorito se quita

#### Scenario: Ya estaba marcado

- **WHEN** una persona elige un álbum que ya es favorito con el chip "Favorito"
- **THEN** el diálogo informa que ya está en sus favoritos, no modifica nada y ofrece "Quitar"

#### Scenario: Pendiente de un artista

- **WHEN** una persona elige un artista con el chip "Pendiente"
- **THEN** el artista queda en sus Pendientes y el diálogo ofrece "Deshacer"

### Requirement: Acción A lista

El chip **A lista** SHALL, tras elegir el objetivo, mostrar el panel de listas propias compatibles con el tipo del
objetivo (el mismo de las páginas de catálogo), con la opción de agregar a una lista existente o crear una nueva.

#### Scenario: Agregar a una lista existente

- **WHEN** una persona elige un álbum con el chip "A lista" y elige una de sus listas de álbumes
- **THEN** el álbum se agrega a esa lista

#### Scenario: Solo listas compatibles

- **WHEN** una persona elige una canción con el chip "A lista"
- **THEN** el panel muestra solo sus listas de canciones

### Requirement: Acción Nueva lista

El chip **Nueva lista** SHALL pedir solo un título (obligatorio) y el tipo de entidad (artistas, álbumes o
canciones), y crear la lista **sin audiencia explícita**, de modo que se aplique la audiencia por defecto de la
persona. Al crearla, el diálogo SHALL ofrecer **Ver lista** y **Agregar a esta lista**; esta última SHALL llevar
al chip "A lista" con el tipo de búsqueda fijado al tipo de la lista, porque el detalle de una lista no tiene
buscador de catálogo propio.

#### Scenario: Crear una lista con la audiencia por defecto

- **WHEN** una persona con audiencia por defecto `private` crea una lista de álbumes desde el diálogo
- **THEN** la lista se crea con audiencia `private`, sin que el diálogo la haya preguntado

#### Scenario: Título obligatorio

- **WHEN** una persona intenta crear una lista sin título
- **THEN** no se crea la lista y se indica que el título es obligatorio

#### Scenario: Agregar a la lista recién creada

- **WHEN** una persona crea una lista de álbumes y activa "Agregar a esta lista"
- **THEN** el diálogo pasa al chip "A lista" con el tipo de búsqueda fijado en álbum

### Requirement: Marcas de la persona sobre un objetivo

El sistema SHALL exponer `GET /api/me/marks?type=&id=` —`type` ∈ `artist`, `release-group`, `recording`— que
devuelva, solo con sesión, `{ favorite, pending, stars, detailedScore }` de la persona sobre el objetivo.
`pending` SHALL ser `null` para canciones (Pendiente no las admite); `stars` y `detailedScore` SHALL ser `null`
sin valoración. La respuesta SHALL NOT cachearse. Un `type` o `id` inválido SHALL responder `400` con
`VALIDATION_ERROR`, un objetivo inexistente `404`, y la falta de sesión `401` con `AUTH_REQUIRED`.

#### Scenario: Marcas de un álbum

- **WHEN** una persona con el álbum en favoritos, sin Pendiente y valorado con 4 estrellas consulta sus marcas
- **THEN** recibe `favorite: true`, `pending: false`, `stars: 4` y `detailedScore: null`

#### Scenario: Canción

- **WHEN** una persona consulta las marcas de una canción
- **THEN** `pending` es `null`

#### Scenario: Sin sesión

- **WHEN** se consulta el endpoint sin sesión
- **THEN** responde `401` con `AUTH_REQUIRED`

#### Scenario: Tipo inválido

- **WHEN** se consulta con un `type` fuera de vocabulario
- **THEN** responde `400` con `VALIDATION_ERROR`

