# owner-settings

## Purpose

El área de ajustes del dueño (`/me/settings`): una pantalla por tipo de ajuste (Perfil, Curaduría, Privacidad y audiencia, Red, Cuenta y seguridad), con menú lateral compartido, el aviso de email sin verificar en todas las pantallas y el contenido de cada una. Es la casa completa de la gestión del propio perfil; la edición rápida sobre el perfil vive en `profile-edit-mode`.
## Requirements
### Requirement: Área de ajustes con una pantalla por tipo de ajuste

El sistema SHALL ofrecer a todo usuario autenticado un área de ajustes bajo `/me/settings` con
una pantalla por tipo de ajuste: **Perfil** (`/me/settings/profile`), **Curaduría**
(`/me/settings/curation`), **Privacidad y audiencia** (`/me/settings/privacy`), **Red**
(`/me/settings/network`) y **Cuenta y seguridad** (`/me/settings/account`). Todas las pantallas
SHALL compartir un menú de navegación lateral (pestañas horizontales por debajo del punto de
corte `md`) que marque la pantalla activa. La ruta `/me/settings` SHALL redirigir a
`/me/settings/profile`. El área SHALL NOT incluir accesos a la biblioteca (diario, favoritos, por
escuchar, listas, colección, artistas, recorridos, feed), que se alcanzan desde el menú de
usuario. Una pantalla SHALL listarse en el menú únicamente cuando ofrezca al menos un control
disponible. Una petición sin sesión SHALL ser dirigida al inicio de sesión.

#### Scenario: Entrar a Ajustes desde el menú de usuario

- **WHEN** un usuario autenticado abre "Ajustes" desde el menú de usuario
- **THEN** llega a `/me/settings/profile` con el menú lateral mostrando "Perfil" como activo

#### Scenario: Navegar entre pantallas

- **WHEN** el usuario elige otra pantalla en el menú lateral
- **THEN** llega a su ruta propia, enlazable de forma directa, y el menú marca esa pantalla

#### Scenario: Ajustes sin sesión

- **WHEN** una persona sin sesión abre cualquier ruta bajo `/me/settings`
- **THEN** es dirigida al inicio de sesión y no se muestra ningún dato

#### Scenario: Pantalla sin controles disponibles

- **WHEN** una pantalla del área no ofrece ningún control disponible todavía
- **THEN** no aparece en el menú lateral

### Requirement: Aviso de email sin verificar en el área de ajustes

El área de ajustes SHALL mostrar, en todas sus pantallas, el aviso de email sin verificar con la
acción de reenviar cuando el `email_verified_at` del usuario sea nulo, y SHALL NOT mostrarlo
cuando el email esté verificado. El aviso SHALL vivir en el diseño compartido del área, no en una
pantalla concreta.

#### Scenario: Usuario sin verificar entra a Ajustes

- **WHEN** un usuario con `email_verified_at` nulo abre cualquier pantalla de ajustes
- **THEN** ve el aviso de que su email no está verificado con un botón para reenviar el correo

#### Scenario: Usuario verificado

- **WHEN** un usuario con el email verificado abre los ajustes
- **THEN** no ve ningún aviso de verificación

### Requirement: Pantalla Perfil

La pantalla **Perfil** SHALL contener los editores de la identidad pública del dueño: Tarjeta de
Identidad (artista, álbum y canción que definen), bio, pronombres, ubicación, zona horaria y
enlaces. SHALL usar los mismos editores que la edición sobre el perfil, con los mismos estados
de carga, éxito y error recuperable, sin duplicar su lógica.

#### Scenario: Editar la bio desde Ajustes

- **WHEN** el dueño cambia su bio en la pantalla Perfil y guarda
- **THEN** el cambio se persiste y su perfil público muestra la nueva bio

#### Scenario: Error recuperable en Ajustes

- **WHEN** una petición de guardado falla en la pantalla Perfil
- **THEN** el editor muestra un error localizado, conserva lo escrito y permite reintentar

### Requirement: Pantalla Curaduría

La pantalla **Curaduría** SHALL resumir lo que el dueño elige mostrar: "Empieza por aquí" (con
conteo sobre el máximo de 4), listas fijadas, valoraciones destacadas y entradas de diario
destacadas. "Empieza por aquí" SHALL abrir su editor en el panel lateral de edición. La
pantalla SHALL NOT listar el himno ni los álbumes favoritos: el himno se elige desde la Tarjeta
de Identidad (pantalla Perfil) y los álbumes favoritos ya no son una sección del perfil. Listas
fijadas, valoraciones destacadas y entradas de diario destacadas SHALL mostrar su conteo y un
enlace al lugar donde se fijan o destacan, sin duplicar esa acción en la pantalla.

#### Scenario: Ver el resumen de curaduría

- **WHEN** el dueño abre la pantalla Curaduría
- **THEN** ve cada tipo de curaduría con su conteo real y, según el tipo, una acción para editarlo
  o un enlace a su origen

#### Scenario: Editar los destacados desde Curaduría

- **WHEN** el dueño pulsa "Editar" en "Empieza por aquí"
- **THEN** el editor se abre en el panel lateral de edición sin salir de la pantalla

#### Scenario: Sin Himno ni Álbumes favoritos

- **WHEN** el dueño abre la pantalla Curaduría
- **THEN** no ve filas de Himno ni de Álbumes favoritos

### Requirement: Pantalla Privacidad y audiencia

La pantalla **Privacidad y audiencia** SHALL contener el selector de visibilidad del perfil
(público o privado), con el mismo comportamiento que define `social-profiles`, y el control de
audiencia por defecto del contenido nuevo definido en `default-audience`. La visibilidad SHALL
persistirse al elegir, con estados de guardado y error localizados.

#### Scenario: Cambiar la visibilidad del perfil

- **WHEN** el dueño elige "Privado" en esta pantalla
- **THEN** el cambio se persiste sin cerrar la sesión y la interfaz refleja el nuevo estado

#### Scenario: Error al cambiar la visibilidad

- **WHEN** la petición de cambio de visibilidad falla
- **THEN** se muestra un error localizado y el selector conserva el estado anterior

### Requirement: Pantalla Red

La pantalla **Red** SHALL enlazar, sin reimplementar listados, las solicitudes de seguimiento
pendientes, los seguidores, los seguidos y las cuentas bloqueadas, apuntando a las superficies
existentes. Las solicitudes SHALL mostrar el número de pendientes cuando sea mayor que cero,
presentado como bandeja de entrada y no como métrica de logro. Los destinos SHALL derivarse de la
misma definición compartida que el menú de usuario del Header.

#### Scenario: Solicitudes pendientes en Red

- **WHEN** el dueño tiene solicitudes de seguimiento pendientes y abre la pantalla Red
- **THEN** ve el número de pendientes junto al enlace a `/me/follow-requests`

#### Scenario: Sin solicitudes pendientes

- **WHEN** el dueño no tiene solicitudes pendientes
- **THEN** el enlace a solicitudes no muestra ningún indicador numérico

#### Scenario: Cuentas bloqueadas

- **WHEN** el dueño pulsa "Cuentas bloqueadas" en la pantalla Red
- **THEN** llega a `/me/blocks`

### Requirement: Pantalla Cuenta y seguridad

La pantalla **Cuenta y seguridad** SHALL contener, en su primera entrega: la edición del nombre
visible, el método de acceso en solo lectura y el cierre de todas las sesiones. Nada de esta
pantalla SHALL mostrarse a otras personas. El método de acceso SHALL indicar si la cuenta tiene
contraseña y qué proveedores externos tiene vinculados, sin exponer nunca el hash de la
contraseña. El cierre de todas las sesiones SHALL pedir confirmación, usar
`DELETE /api/auth/revoke-all` y, al completarse, dirigir a la persona al inicio de sesión. La
pantalla SHALL NOT ofrecer controles para funciones no disponibles (cambiar email, usuario o
contraseña, foto de perfil, eliminar cuenta).

#### Scenario: Cambiar el nombre visible

- **WHEN** el usuario guarda un nombre visible válido
- **THEN** el nuevo nombre aparece junto a su @usuario en el perfil y en el resto del sitio

#### Scenario: Vaciar el nombre visible

- **WHEN** el usuario guarda el nombre visible vacío
- **THEN** el sitio vuelve a mostrar su username como nombre

#### Scenario: Método de acceso de una cuenta Google

- **WHEN** una cuenta sin contraseña local y con Google vinculado abre la pantalla
- **THEN** ve que accede con Google y no ve ninguna opción de contraseña

#### Scenario: Cerrar todas las sesiones

- **WHEN** el usuario confirma "Cerrar todas las sesiones"
- **THEN** todas sus sesiones dejan de ser válidas, incluida la actual, y es dirigido al inicio
  de sesión

#### Scenario: Cancelar el cierre de sesiones

- **WHEN** el usuario cancela la confirmación
- **THEN** ninguna sesión se cierra

