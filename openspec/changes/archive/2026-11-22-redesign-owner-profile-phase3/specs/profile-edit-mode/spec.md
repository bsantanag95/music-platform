## MODIFIED Requirements

### Requirement: Controles de edición por bloque

Con el modo edición activo, SHALL mostrar un control de edición cada bloque visible que tenga un
editor existente: la Placa (foto, bio, pronombres, ubicación, zona horaria y enlaces), la Ficha de la
franja de identidad (roles, géneros, formatos y preguntas del perfil), la Tarjeta de Identidad
(artista, álbum e himno) y "Empieza por aquí". La Ficha vacía SHALL mostrarse en el modo edición como
un marco vacío con su control. Los bloques sin editor propio (listas fijadas, valoraciones destacadas,
entradas de diario destacadas y el resto de estantes) SHALL NOT mostrar control de edición. Cada
control SHALL ser un botón con nombre accesible que identifique el bloque que edita.

#### Scenario: Lápiz en un bloque con editor

- **WHEN** el modo edición está activo
- **THEN** la Tarjeta de Identidad muestra un botón accesible "Editar" con el nombre del bloque

#### Scenario: Bloque sin editor

- **WHEN** el modo edición está activo
- **THEN** el estante de listas del perfil no muestra ningún control de edición

#### Scenario: Lápiz en "Empieza por aquí"

- **WHEN** el modo edición está activo
- **THEN** "Empieza por aquí" muestra un botón accesible "Editar" con el nombre del bloque, y
  el perfil no muestra ningún control de edición de álbumes favoritos

#### Scenario: Lápiz en la Ficha

- **WHEN** el modo edición está activo
- **THEN** la Ficha muestra un botón accesible "Editar" con el nombre del bloque, y su panel aloja
  los editores de la ficha musical y de las preguntas del perfil, sin los de foto, datos ni enlaces

#### Scenario: Ficha vacía en modo edición

- **WHEN** el dueño no tiene roles, géneros, formatos ni preguntas y activa el modo edición
- **THEN** en lugar de la Ficha se muestra un marco vacío con su botón "Editar"

### Requirement: Panel lateral de edición

Pulsar el control de edición de un bloque SHALL abrir un panel lateral modal que aloje los editores
de ese bloque, dejando visible —atenuado— el perfil. El panel SHALL ser un diálogo accesible:
`role="dialog"`, `aria-modal`, nombre accesible, foco atrapado y devuelto al control que lo abrió
al cerrarse, cierre con `Escape` y con clic en el fondo, y bloqueo del scroll del documento. Por
debajo del punto de corte `md` SHALL presentarse como hoja inferior con scroll interno. El panel
SHALL alojar los mismos editores que la pantalla equivalente de ajustes, sin sus botones de guardar
propios, y SHALL mostrar al pie un único "Guardar" junto a "Cancelar": "Guardar" guarda todo lo que
cambió en el panel y lo cierra si todo se guardó; si algo falla, el panel queda abierto con el error.
Un panel cuyos editores aplican cada cambio al instante (la Tarjeta de Identidad) no muestra ese pie.
La foto SHALL seguir aplicándose al elegirla o quitarla, con un aviso que lo indique. Al cerrarse tras
haber guardado cambios, el perfil SHALL refrescarse para reflejarlos sin recargar toda la aplicación.

#### Scenario: Abrir y cerrar el panel

- **WHEN** el dueño pulsa el lápiz de un bloque y luego pulsa `Escape`
- **THEN** el panel se abre con el editor de ese bloque y, al cerrarse, el foco vuelve al lápiz

#### Scenario: El perfil refleja lo guardado

- **WHEN** el dueño cambia la bio en el panel y pulsa "Guardar"
- **THEN** el panel se cierra y la Placa detrás muestra la nueva bio sin recargar la página

#### Scenario: Panel en móvil

- **WHEN** el dueño abre un editor en una pantalla por debajo del punto de corte `md`
- **THEN** el panel se presenta como hoja inferior con scroll interno

#### Scenario: Un solo "Guardar" por panel

- **WHEN** el dueño cambia la bio y agrega un enlace en el panel de la cabecera y pulsa "Guardar"
- **THEN** se guardan ambos cambios, y el panel no muestra otro botón de guardar

#### Scenario: Falla un guardado

- **WHEN** el dueño pulsa "Guardar" y el guardado de los enlaces falla
- **THEN** el panel queda abierto y muestra el error de los enlaces

#### Scenario: Ajustes sin cambios

- **WHEN** el dueño abre la pantalla de ajustes del perfil
- **THEN** cada editor conserva su propio botón de guardar
