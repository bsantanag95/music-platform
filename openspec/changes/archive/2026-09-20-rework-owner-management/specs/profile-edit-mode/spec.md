## ADDED Requirements

### Requirement: Interruptor "Editar perfil"

La vista del dueño SHALL incluir, en una barra superior del perfil, un interruptor "Editar perfil"
que empieza desactivado. Con el interruptor desactivado el perfil SHALL verse igual que para un
visitante autorizado, sin ningún control de edición. El estado del interruptor SHALL ser local a
la página y no persistir entre navegaciones. El interruptor SHALL NOT mostrarse en la
previsualización "cómo te ven" ni a ningún visitante que no sea el dueño.

#### Scenario: Perfil propio con edición desactivada

- **WHEN** el dueño abre su perfil
- **THEN** ve el perfil sin lápices ni controles de edición y con el interruptor desactivado

#### Scenario: Activar el modo edición

- **WHEN** el dueño activa "Editar perfil"
- **THEN** cada bloque con editor muestra un control de edición y el interruptor queda activado

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
editor existente: la Placa (bio, pronombres, ubicación, zona horaria y enlaces), la Tarjeta de
Identidad, los Destacados con el Himno y los Álbumes favoritos. Los bloques sin editor propio
(listas fijadas, valoraciones destacadas, entradas de diario destacadas y el resto de estantes)
SHALL NOT mostrar control de edición. Cada control SHALL ser un botón con nombre accesible que
identifique el bloque que edita.

#### Scenario: Lápiz en un bloque con editor

- **WHEN** el modo edición está activo
- **THEN** la Tarjeta de Identidad muestra un botón accesible "Editar" con el nombre del bloque

#### Scenario: Bloque sin editor

- **WHEN** el modo edición está activo
- **THEN** el estante de listas del perfil no muestra ningún control de edición

### Requirement: Panel lateral de edición

Pulsar el control de edición de un bloque SHALL abrir un panel lateral modal que aloje el editor
de ese bloque, dejando visible —atenuado— el perfil. El panel SHALL ser un diálogo accesible:
`role="dialog"`, `aria-modal`, nombre accesible, foco atrapado y devuelto al control que lo abrió
al cerrarse, cierre con `Escape` y con clic en el fondo, y bloqueo del scroll del documento. Por
debajo del punto de corte `md` SHALL presentarse como hoja inferior con scroll interno. El panel
SHALL alojar el mismo editor que la pantalla equivalente de ajustes, sin añadir su propio botón de
guardar. Al cerrarse tras haber guardado cambios, el perfil SHALL refrescarse para reflejarlos sin
recargar toda la aplicación.

#### Scenario: Abrir y cerrar el panel

- **WHEN** el dueño pulsa el lápiz de un bloque y luego pulsa `Escape`
- **THEN** el panel se abre con el editor de ese bloque y, al cerrarse, el foco vuelve al lápiz

#### Scenario: El perfil refleja lo guardado

- **WHEN** el dueño guarda un cambio de bio en el panel y lo cierra
- **THEN** la Placa detrás muestra la nueva bio sin recargar la página

#### Scenario: Panel en móvil

- **WHEN** el dueño abre un editor en una pantalla por debajo del punto de corte `md`
- **THEN** el panel se presenta como hoja inferior con scroll interno

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

### Requirement: Barra del dueño con estado y acceso a Ajustes

La barra superior del perfil del dueño SHALL mostrar un indicador de estado con la visibilidad
actual del perfil y un enlace a la pantalla de Privacidad y audiencia de los ajustes, sin cambiar
por sí mismo ninguna configuración. SHALL incluir además el acceso a la previsualización "cómo te
ven" y el interruptor "Editar perfil".

#### Scenario: Indicador de visibilidad

- **WHEN** el dueño con perfil público abre su perfil
- **THEN** la barra muestra "Perfil público" con un enlace a `/me/settings/privacy` y no cambia la
  visibilidad al pulsarlo

#### Scenario: Acceso a la previsualización

- **WHEN** el dueño pulsa "Ver cómo te ven"
- **THEN** llega a la previsualización de su perfil como lo ve un visitante público
