## MODIFIED Requirements

### Requirement: Eliminar la cuenta

El sistema SHALL permitir a un usuario autenticado eliminar su cuenta de forma definitiva. La
petición SHALL incluir el usuario de la cuenta como confirmación y el factor de "Autenticación
reciente para acciones sensibles". Eliminar SHALL borrar el perfil y todo lo que la persona creó
(diario, favoritos, por escuchar, listas, colección, deseos, valoraciones, reseñas, comentarios,
seguimientos, bloqueos, enlaces, preguntas, sesiones e identidades), incluida su foto de perfil y
el archivo correspondiente en el storage (ver `avatar-upload`), cerrar la sesión y limpiar la
cookie. No SHALL existir período de gracia ni forma de deshacerlo. El sistema SHALL rechazar la
eliminación, sin borrar nada, cuando el usuario de confirmación no coincida o cuando la cuenta tenga
historial de moderación o editorial que impide borrarla (`ACCOUNT_DELETION_BLOCKED`, 409); en ese caso
la interfaz SHALL ofrecer desactivarla. La interfaz SHALL explicar qué se borra y ofrecer Desactivar
como alternativa antes de confirmar.

#### Scenario: Eliminar con confirmación

- **WHEN** la persona escribe su usuario y su contraseña correcta y confirma
- **THEN** su cuenta y todo lo que creó se borran, la cookie de sesión se limpia y es dirigida al
  inicio

#### Scenario: Usuario de confirmación incorrecto

- **WHEN** el usuario escrito no coincide con el de la cuenta
- **THEN** la API rechaza la petición con un error de validación y no borra nada

#### Scenario: Cuenta con historial de moderación

- **WHEN** una cuenta con acciones de moderación registradas intenta eliminarse
- **THEN** la API responde `ACCOUNT_DELETION_BLOCKED`, no borra nada y la interfaz ofrece desactivar

#### Scenario: Sin filas huérfanas

- **WHEN** se elimina una cuenta con contenido en todas las tablas que la referencian
- **THEN** no queda ninguna fila de esa persona en la base de datos

#### Scenario: La foto no sobrevive a la cuenta

- **WHEN** se elimina una cuenta que tenía foto de perfil
- **THEN** el registro de esa imagen y su archivo en el storage se eliminan también, sin quedar
  accesibles por su URL pública

#### Scenario: Alternativa visible

- **WHEN** la persona abre el diálogo de eliminar
- **THEN** ve la lista de lo que se borra y un enlace a "Desactivar la cuenta"
