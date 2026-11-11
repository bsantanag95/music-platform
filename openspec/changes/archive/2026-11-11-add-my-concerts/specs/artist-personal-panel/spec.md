## MODIFIED Requirements

### Requirement: Panel "Tu relación" del artista

La cabecera del artista SHALL incluir un panel "Tu relación" que reúna todas las acciones
personales sobre el artista, en este orden: Siguiendo, Favorito, Pendiente, Escuchas,
Colección, En vivo, Listas y Recorrido. La página SHALL NOT mostrar estas acciones fuera del panel. El
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
- **THEN** el panel muestra las ocho filas sin ningún menú `···`

## ADDED Requirements

### Requirement: Conciertos en el panel del artista

La fila **En vivo** SHALL ir después de Colección (capability `concert-log`). Sin conciertos registrados del artista
SHALL mostrar la acción "Registrar"; con registros SHALL mostrar "Lo viste N veces" enlazado a Mis conciertos filtrada
por el artista y la acción "Registrar". "Registrar" SHALL abrir el formulario del concierto con el artista ya elegido; al
guardar, la cifra SHALL actualizarse sin recargar la página. La cifra cuenta todos los registros propios, cualquiera sea
su audiencia.

#### Scenario: Sin conciertos

- **WHEN** un usuario autenticado abre un artista del que no registró conciertos
- **THEN** la fila En vivo muestra solo "Registrar"

#### Scenario: Registrar desde el panel

- **WHEN** el usuario pulsa "Registrar", escribe el año 2019 y guarda
- **THEN** el formulario se cierra y la fila muestra "Lo viste 1 vez · Registrar"

#### Scenario: Visitante anónimo

- **WHEN** una persona sin sesión abre un artista
- **THEN** no ve la fila En vivo, solo la invitación a iniciar sesión
