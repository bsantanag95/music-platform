## MODIFIED Requirements

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

## REMOVED Requirements

### Requirement: Barra del dueño con estado y acceso a Ajustes

**Reason**: La barra en caja sobre la cabecera duplicaba el acceso a Ajustes y mezclaba acciones sin relación
(openspec: redesign-owner-profile-phase1).

**Migration**: El estado, la previsualización y el interruptor pasan a la cabecera; ver "Estado y acciones del dueño en la
cabecera".

## ADDED Requirements

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
