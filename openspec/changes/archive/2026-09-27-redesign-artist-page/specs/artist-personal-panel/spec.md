## ADDED Requirements

### Requirement: Panel "Tu relación" del artista

La cabecera del artista SHALL incluir un panel "Tu relación" que reúna todas las acciones
personales sobre el artista, en este orden: Siguiendo, Favorito, Pendiente, Escuchas,
Colección, Listas y Recorrido. La página SHALL NOT mostrar estas acciones fuera del panel. El
panel SHALL NOT ofrecer valoración con estrellas ni reseña del artista. Las filas SHALL
rotularse sin posesivo, como en el panel del álbum.

#### Scenario: Acciones reunidas

- **WHEN** un usuario autenticado abre un artista
- **THEN** todas las acciones personales están en el panel y no hay una columna de botones
  aparte

#### Scenario: Sin estrellas

- **WHEN** un usuario autenticado mira el panel
- **THEN** no encuentra estrellas ni una acción de reseña

### Requirement: Estados del panel del artista

El panel SHALL tener los mismos tres estados que el del álbum: anónimo (invitación a iniciar
sesión, sin controles de escritura), sin interacción (todas las filas con su acción mínima) y
con interacción (el estado de cada fila). El panel SHALL NOT esconder filas detrás de un
menú `···` ni de "Más acciones".

#### Scenario: Visitante anónimo

- **WHEN** una persona sin sesión abre un artista
- **THEN** el panel muestra la invitación a iniciar sesión y ningún control de escritura

#### Scenario: Primera visita autenticada

- **WHEN** un usuario autenticado abre un artista con el que nunca interactuó
- **THEN** el panel muestra las siete filas sin ningún menú `···`

### Requirement: Seguir, Favorito y Pendiente como conmutadores

Siguiendo, Favorito y Pendiente SHALL mostrarse como conmutadores con ícono y texto siempre
visibles y `aria-pressed` reflejando el estado; pulsarlos SHALL alternar la señal. El
conmutador de seguir SHALL NOT mostrar un conteo de seguidores.

#### Scenario: Seguir

- **WHEN** un usuario pulsa el conmutador de seguir inactivo
- **THEN** pasa a seguir al artista y el conmutador queda con `aria-pressed="true"`

### Requirement: Escuchas calculadas desde tus discos

La fila Escuchas SHALL mostrar la cantidad de discos distintos de la discografía propia del
artista con al menos una escucha del usuario y el último disco escuchado con su fecha
relativa, e incluir las escuchas registradas sobre el artista mismo. La fila SHALL NOT
mostrar el total de la discografía ni ninguna cifra que indique cuántos discos faltan. La
acción "Registrar" SHALL abrir el registro de escucha del artista.

#### Scenario: Usuario con escuchas

- **WHEN** un usuario escuchó 7 discos del artista, el último *Animals* hace 3 días
- **THEN** la fila muestra "7 discos · Animals, hace 3 días", sin "de 15"

#### Scenario: Solo escuchas del artista

- **WHEN** un usuario registró escuchas sobre el artista pero no sobre sus discos
- **THEN** la fila muestra la fecha de la última escucha del artista

### Requirement: Colección calculada desde tus discos

La fila Colección SHALL mostrar, en solo lectura, cuántos discos distintos del artista tiene
el usuario en su colección y cuántos tiene en su búsqueda. Sin discos en ninguna de las dos,
SHALL indicar que no hay discos del artista en la colección, sin acción de agregar.

#### Scenario: Discos en colección y búsqueda

- **WHEN** un usuario tiene 3 discos del artista en su colección y busca 1
- **THEN** la fila muestra "3 discos · buscas 1"

### Requirement: Listas desde el panel del artista

La fila Listas SHALL mostrar "En N de tus listas" (listas y Caminos propios que contienen al
artista) y abrir el mismo selector de listas con casillas que usa el álbum, aplicado al
artista. Al cerrar el selector, N SHALL reflejar los cambios.

#### Scenario: Agregar a una lista

- **WHEN** un usuario agrega al artista a una lista desde el selector y lo cierra
- **THEN** la fila muestra el conteo actualizado

### Requirement: Recorrido en el panel

La fila Recorrido SHALL mostrar, si el usuario tiene un recorrido en curso de ese artista, una
barra de progreso discreta sin fracción numérica y un enlace a su página de gestión; si el
recorrido está archivado o completo, su estado y el mismo enlace; y si no tiene recorrido, la
acción "Armar recorrido", que abre el modal de inicio existente. La fila SHALL NOT ofrecer
edición, archivado ni borrado.

#### Scenario: Recorrido en curso

- **WHEN** un usuario con un recorrido en curso abre el artista
- **THEN** la fila muestra la barra discreta y el enlace a la gestión, sin cifras

#### Scenario: Sin recorrido

- **WHEN** un usuario sin recorrido de ese artista pulsa "Armar recorrido"
- **THEN** se abre el modal de inicio del recorrido

### Requirement: Panel del artista en móvil

En móvil el panel SHALL mostrarse entre el resumen de la biografía y el bloque de comunidad,
con las mismas filas que en escritorio, en una sola columna y con conmutadores de al menos
40 px de alto.

#### Scenario: Panel compacto

- **WHEN** un usuario autenticado abre un artista en móvil
- **THEN** ve las siete filas sin abrir ningún menú
