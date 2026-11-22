# profile-edit-mode

## Purpose

La edición rápida sobre el propio perfil: el interruptor "Editar perfil", el lápiz por bloque con editor, el panel lateral modal (con descarte de cambios sin guardar) y el estado de visibilidad y las acciones del dueño en la cabecera del perfil. Hasta que el dueño activa el modo edición, su perfil se ve igual que el de un visitante.
## Requirements
### Requirement: Interruptor "Editar perfil"

La vista del dueño SHALL incluir, en la fila de acciones de la cabecera del perfil (donde un
visitante ve la acción de seguir), un botón "Editar perfil" que alterna el modo edición y empieza
desactivado; con el modo activo SHALL indicar su estado (`aria-pressed`) y rotularse "Listo". Con
el modo desactivado el perfil SHALL verse igual que para un visitante autorizado, sin ningún
control de edición. El estado del interruptor SHALL ser local a la página y no persistir entre
navegaciones. El interruptor SHALL NOT mostrarse en la previsualización "cómo te ven" ni a ningún
visitante que no sea el dueño.

#### Scenario: Perfil propio con edición desactivada

- **WHEN** el dueño abre su perfil
- **THEN** ve el perfil sin lápices ni controles de edición y con el interruptor desactivado

#### Scenario: Activar el modo edición

- **WHEN** el dueño activa "Editar perfil"
- **THEN** cada bloque con editor muestra un control de edición y el interruptor queda activado,
  rotulado "Listo"

#### Scenario: El estado no persiste

- **WHEN** el dueño activa el modo edición, navega a otra ruta y vuelve a su perfil
- **THEN** el interruptor vuelve a estar desactivado

#### Scenario: Sin interruptor en la previsualización

- **WHEN** el dueño abre "Ver cómo te ven"
- **THEN** no aparece el interruptor ni ningún control de edición

#### Scenario: Un visitante no ve el interruptor

- **WHEN** una persona que no es el dueño abre el perfil
- **THEN** no ve el interruptor ni ningún control de edición

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

### Requirement: Cambios sin guardar en el panel

Si el editor alojado en el panel reporta cambios sin guardar, cerrar el panel (cierre explícito,
`Escape` o clic en el fondo) SHALL pedir confirmación de descarte antes de cerrarlo. Sin cambios
sin guardar, el panel SHALL cerrarse sin preguntar.

#### Scenario: Cerrar con cambios sin guardar

- **WHEN** el dueño modifica la bio en el panel sin guardar e intenta cerrarlo
- **THEN** se pide confirmación de descarte y el panel permanece abierto hasta que confirme

#### Scenario: Cerrar sin cambios

- **WHEN** el dueño abre un editor y lo cierra sin modificar nada
- **THEN** el panel se cierra sin pedir confirmación

### Requirement: Estado y acciones del dueño en la cabecera

La cabecera del perfil, vista por su dueño (no en la previsualización), SHALL mostrar junto al
nombre una marca con la visibilidad actual del perfil ("Público" o "Privado") que enlace a la
pantalla de Privacidad y audiencia de los ajustes sin cambiar por sí misma ninguna configuración.
En lugar de la acción de seguir, su fila de acciones SHALL ofrecer "Editar perfil" (ver
"Interruptor «Editar perfil»") y "Ver como visitante", que lleva a la previsualización "cómo te
ven", junto a la acción de compartir y los enlaces. La vista del dueño SHALL NOT incluir una barra
separada encima de la cabecera ni un texto inerte en lugar de la acción de seguir.

#### Scenario: Indicador de visibilidad

- **WHEN** el dueño con perfil público abre su perfil
- **THEN** junto al nombre ve "Público" con un enlace a `/me/settings/privacy`, y pulsarlo no
  cambia la visibilidad

#### Scenario: Acceso a la previsualización

- **WHEN** el dueño pulsa "Ver como visitante"
- **THEN** llega a la previsualización de su perfil como lo ve un visitante público

#### Scenario: Sin barra encima de la cabecera

- **WHEN** el dueño abre su perfil en una pantalla de 390 px
- **THEN** lo primero bajo la cabecera del sitio es su cabecera de perfil, sin barra intermedia

