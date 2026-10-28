## ADDED Requirements

### Requirement: Acción Seguir artista

El chip **Seguir artista** ("Follow artist" en inglés) SHALL buscar solo artistas y, tras elegir uno, seguirlo de forma
idempotente (si ya lo seguía, no cambia nada) y confirmar "Sigues a X" con un enlace a `/me/artists`. Seguir desde el
diálogo SHALL avisar del cambio como el resto de las acciones, para que las páginas abiertas se actualicen.

#### Scenario: Seguir a un artista

- **WHEN** una persona elige el chip "Seguir artista" y luego a Europe
- **THEN** pasa a seguir a Europe y el diálogo confirma "Sigues a Europe" con un enlace a sus artistas

#### Scenario: Ya lo seguía

- **WHEN** una persona elige un artista que ya sigue
- **THEN** el diálogo confirma que lo sigue y no duplica el seguimiento

## MODIFIED Requirements

### Requirement: Diálogo de acciones rápidas en el Header

El Header SHALL ofrecer, solo con sesión, un control **"Añadir"** en la zona de usuario —junto al menú de
usuario, no en la barra general de navegación de contenido— que abre un diálogo de acciones rápidas sin navegar
a otra ruta. El diálogo SHALL presentar sus acciones como una fila de chips con
semántica de grupo de opciones (`radiogroup`, navegables con flechas), en este orden: **Escucha**, **Valorar**,
**Favorito**, **Pendiente**, **Colección**, **Recorrido**, **Seguir artista**, **A lista**, **Nueva lista** y
**Nuevo Camino**. El
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
