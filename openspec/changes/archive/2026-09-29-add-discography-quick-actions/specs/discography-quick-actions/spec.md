## ADDED Requirements

### Requirement: Menú de acciones por disco

Cada disco de la discografía del artista SHALL tener un botón "…" que abre un popover de acciones
de ese disco: en la grilla, en la esquina superior derecha de la carátula, visible al pasar el
mouse o con el foco dentro de la tarjeta y siempre visible en dispositivos sin hover; en la tabla,
en la última columna, siempre visible. Solo un popover SHALL estar abierto a la vez. En pantallas
angostas el popover SHALL mostrarse como hoja inferior a lo ancho, sin desbordar la pantalla.

#### Scenario: Abrir desde la grilla

- **WHEN** una persona pasa el mouse sobre la tarjeta de *Theatre of Pain* y activa "…"
- **THEN** se abre el popover de acciones de *Theatre of Pain*

#### Scenario: Un solo menú abierto

- **WHEN** el popover de un disco está abierto y la persona abre el de otro disco
- **THEN** el primero se cierra

#### Scenario: Móvil

- **WHEN** una persona activa "…" en una tarjeta de la primera columna en un viewport móvil
- **THEN** el popover aparece como hoja inferior y la página no desborda horizontalmente

### Requirement: Acciones del menú

El popover SHALL ofrecer: registrar escucha en un clic, con la opción posterior de agregar
detalles; Favorito y Pendiente como conmutadores con su estado; agregar a listas con el selector de
casillas de listas propias; calificar con estrellas en línea; e ir al álbum. Cada acción SHALL
comportarse como en el panel "Tu relación" del álbum: registrar una escucha retira el disco de
Pendiente, y cambiar las estrellas conserva el puntaje detallado solo si sigue siendo coherente.
Las marcas del disco en la grilla y en la tabla SHALL actualizarse al confirmarse cada acción. Un
fallo SHALL informarse en el popover sin cambiar las marcas.

#### Scenario: Registrar una escucha

- **WHEN** una persona activa "Registrar escucha" en el popover de un disco que tenía en Pendiente
- **THEN** la escucha se registra, el popover ofrece "Agregar detalles", y el disco queda marcado
  como escuchado y fuera de Pendiente

#### Scenario: Calificar

- **WHEN** una persona elige 4½ estrellas en el popover de un disco
- **THEN** la valoración se guarda y la marca del disco muestra "★ 4½"

#### Scenario: Agregar a una lista

- **WHEN** una persona abre "Agregar a lista…" y marca una de sus listas
- **THEN** el disco se agrega a esa lista y la casilla queda marcada

#### Scenario: Fallo

- **WHEN** marcar favorito falla en el servidor
- **THEN** el popover muestra un error y el disco no aparece como favorito

### Requirement: Accesibilidad del menú

El botón "…" SHALL tener un nombre accesible con el título del disco e indicar que abre un
diálogo y si está abierto. El popover SHALL ser un diálogo no modal con nombre accesible; al
abrirse, el foco SHALL pasar a su primer control; Escape y el clic fuera SHALL cerrarlo y
devolver el foco al botón.

#### Scenario: Teclado

- **WHEN** una persona enfoca "…" de un disco con el teclado, lo activa y pulsa Escape
- **THEN** el popover se abre con el foco en su primer control y, al cerrarse, el foco vuelve a
  "…"

### Requirement: Menú sin sesión

Para un visitante sin sesión, el popover SHALL invitar a iniciar sesión para registrar escuchas,
calificar o armar listas, con el enlace a iniciar sesión y a ir al álbum, sin acciones personales.

#### Scenario: Visitante anónimo

- **WHEN** un visitante sin sesión abre "…" de un disco
- **THEN** ve la invitación a iniciar sesión y el enlace al álbum, y ninguna acción personal
