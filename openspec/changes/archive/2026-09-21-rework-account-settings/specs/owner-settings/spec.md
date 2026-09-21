## MODIFIED Requirements

### Requirement: Pantalla Perfil

La pantalla **Perfil** SHALL contener los editores de la identidad pública del dueño: Tarjeta de
Identidad (artista, álbum y canción que definen), bio, pronombres, ubicación, zona horaria (con la
opción de mostrar la hora local), enlaces, y la identidad musical (roles "Me defino como", géneros,
formatos "Cómo escucho" y preguntas del perfil, ver `profile-music-identity`). SHALL usar los mismos
editores que la edición sobre el perfil, con los mismos estados de carga, éxito y error recuperable,
sin duplicar su lógica. La pantalla SHALL NOT ofrecer elegir una foto de perfil.

#### Scenario: Editar la bio desde Ajustes

- **WHEN** el dueño cambia su bio en la pantalla Perfil y guarda
- **THEN** el cambio se persiste y su perfil público muestra la nueva bio

#### Scenario: Error recuperable en Ajustes

- **WHEN** una petición de guardado falla en la pantalla Perfil
- **THEN** el editor muestra un error localizado, conserva lo escrito y permite reintentar

#### Scenario: Editar la identidad musical desde Ajustes

- **WHEN** el dueño elige roles, géneros y formatos en la pantalla Perfil y guarda
- **THEN** los cambios se persisten y la ficha de la Placa de su perfil los muestra

#### Scenario: Sin foto de perfil

- **WHEN** el dueño abre la pantalla Perfil
- **THEN** no ve ningún control para subir o elegir una foto y su imagen sigue siendo el monograma

### Requirement: Pantalla Cuenta y seguridad

La pantalla **Cuenta y seguridad** SHALL contener, agrupados por tema: **Datos de la cuenta**
(nombre visible, usuario y email con su estado de verificación), **Cómo iniciás sesión** (contraseña
o "Crear contraseña" en cuentas sin ella, y Google con "Vincular" o "Desvincular"), **Sesiones
activas** (la lista por dispositivo con "Cerrar" en cada una y el cierre de todas las sesiones),
**Preferencias** (idioma de la interfaz) y, al final, **Pausar o salir** (desactivar cuenta y exportar
los datos) y **Eliminar cuenta** como zona de peligro separada. Nada de esta pantalla SHALL
mostrarse a otras personas. El método de acceso SHALL indicar si la cuenta tiene contraseña y qué
proveedores externos tiene vinculados, sin exponer nunca el hash de la contraseña. Cada acción
sensible SHALL abrir un diálogo con su validación en línea, sus estados de carga y error recuperable
y su confirmación de éxito, y SHALL pedir el factor de identidad que corresponda (contraseña, o
confirmar con Google en una cuenta sin contraseña). El cierre de todas las sesiones SHALL pedir
confirmación, usar `DELETE /api/auth/revoke-all` y, al completarse, dirigir a la persona al inicio de
sesión. Un control SHALL mostrarse únicamente cuando su función esté disponible en el sistema.

#### Scenario: Cambiar el nombre visible

- **WHEN** el usuario guarda un nombre visible válido
- **THEN** el nuevo nombre aparece junto a su @usuario en el perfil y en el resto del sitio

#### Scenario: Vaciar el nombre visible

- **WHEN** el usuario guarda el nombre visible vacío
- **THEN** el sitio vuelve a mostrar su username como nombre

#### Scenario: Método de acceso de una cuenta Google

- **WHEN** una cuenta sin contraseña local y con Google vinculado abre la pantalla
- **THEN** ve que accede con Google, ve "Crear contraseña" en lugar de "Cambiar contraseña" y
  "Desvincular" deshabilitado con la explicación de que es su único método de acceso

#### Scenario: Cerrar todas las sesiones

- **WHEN** el usuario confirma "Cerrar todas las sesiones"
- **THEN** todas sus sesiones dejan de ser válidas, incluida la actual, y es dirigido al inicio
  de sesión

#### Scenario: Cancelar el cierre de sesiones

- **WHEN** el usuario cancela la confirmación
- **THEN** ninguna sesión se cierra

#### Scenario: Cambiar el usuario desde el diálogo

- **WHEN** el usuario abre "Cambiar" en Usuario y escribe uno válido y disponible
- **THEN** el diálogo muestra "Disponible" y su enlace nuevo, y al confirmar el usuario cambia

#### Scenario: Usuario no disponible en el diálogo

- **WHEN** el usuario escribe uno en uso o con caracteres no permitidos
- **THEN** el diálogo muestra el motivo localizado y el botón de confirmar queda deshabilitado

#### Scenario: Acción sensible con sesión antigua en una cuenta de Google

- **WHEN** una cuenta sin contraseña con la sesión iniciada hace días abre "Cambiar email"
- **THEN** el diálogo ofrece "Confirmar con Google" en lugar de pedir una contraseña

#### Scenario: Cerrar la sesión de otro dispositivo

- **WHEN** el usuario pulsa "Cerrar" en la fila de otro dispositivo
- **THEN** esa fila desaparece y esa sesión deja de ser válida

#### Scenario: Avisos de una cuenta con acciones pendientes

- **WHEN** el usuario pidió cambiar su email y aún no confirmó
- **THEN** la pantalla indica que hay un cambio pendiente a la dirección nueva y que el email actual
  sigue vigente
