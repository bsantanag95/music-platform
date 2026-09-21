# account-credentials Specification

## Purpose
TBD - created by archiving change rework-account-settings. Update Purpose after archive.
## Requirements
### Requirement: Autenticación reciente para acciones sensibles

Las acciones sensibles de la cuenta (cambiar el email, crear una contraseña, desactivar la cuenta y
eliminarla) SHALL exigir un factor de identidad reciente. En una cuenta con contraseña local el factor
SHALL ser la contraseña, enviada con la petición y verificada por el servidor. En una cuenta sin
contraseña el factor SHALL ser una sesión iniciada hace menos de 10 minutos; si no lo es, la API SHALL
responder `REAUTH_REQUIRED` (403) sin ejecutar la acción, y la interfaz SHALL ofrecer confirmar la
identidad con Google (ver `google-oauth`). Los intentos de verificación de contraseña SHALL estar
limitados por usuario. Cambiar la contraseña SHALL exigir siempre la contraseña actual.

#### Scenario: Contraseña incorrecta

- **WHEN** una cuenta con contraseña envía una acción sensible con una contraseña incorrecta
- **THEN** la API responde `INVALID_CREDENTIALS` y la acción no se ejecuta

#### Scenario: Cuenta de Google con sesión reciente

- **WHEN** una cuenta sin contraseña que inició sesión hace 3 minutos ejecuta una acción sensible
- **THEN** la acción se ejecuta sin pedir contraseña

#### Scenario: Cuenta de Google con sesión antigua

- **WHEN** una cuenta sin contraseña con la sesión iniciada hace 2 días ejecuta una acción sensible
- **THEN** la API responde `REAUTH_REQUIRED` y la acción no se ejecuta

#### Scenario: Demasiados intentos

- **WHEN** una sesión envía repetidamente contraseñas incorrectas en acciones sensibles
- **THEN** la API responde `RATE_LIMITED` y deja de verificar contraseñas durante la ventana

### Requirement: Cambio de email con confirmación por correo

El sistema SHALL permitir cambiar el email desde Cuenta y seguridad con el factor de "Autenticación
reciente para acciones sensibles". El email actual SHALL NOT cambiar hasta que la persona confirme el
correo nuevo. El sistema SHALL enviar al email nuevo un enlace de un solo uso que vence a las 24
horas, guardando solo el hash del token y como mucho un cambio pendiente por usuario (un pedido nuevo
reemplaza al anterior). Al confirmar, el sistema SHALL volver a comprobar que el email siga libre,
actualizar el email, marcarlo como verificado y borrar el token, y SHALL enviar un aviso al email
anterior. El sistema SHALL rechazar un email inválido, igual al actual o que ya pertenezca a otra
cuenta, sin enviar correo. Si el envío del correo falla, no SHALL quedar un cambio pendiente.

#### Scenario: Pedir el cambio

- **WHEN** la persona pide cambiar a `nuevo@ejemplo.com` con su contraseña correcta
- **THEN** se envía un correo de confirmación a `nuevo@ejemplo.com` y su email actual no cambia

#### Scenario: Confirmar el cambio

- **WHEN** la persona abre el enlace del correo dentro de las 24 horas
- **THEN** su email pasa a `nuevo@ejemplo.com`, queda verificado, el token se borra y se envía un
  aviso al email anterior

#### Scenario: Enlace vencido o ya usado

- **WHEN** alguien abre el enlace después de 24 horas o por segunda vez
- **THEN** la confirmación se rechaza con un mensaje localizado y el email no cambia

#### Scenario: Email de otra cuenta

- **WHEN** la persona pide cambiar a un email que ya usa otra cuenta
- **THEN** la API responde `EMAIL_TAKEN`, no envía correo y el email no cambia

#### Scenario: Un email libre en el pedido pero tomado al confirmar

- **WHEN** otra cuenta toma ese email entre el pedido y la confirmación
- **THEN** la confirmación se rechaza con `EMAIL_TAKEN` y el email no cambia

#### Scenario: Falla el envío

- **WHEN** el transporte de correo falla al pedir el cambio
- **THEN** la API responde con error, no queda un token vigente y el email no cambia

### Requirement: Cambiar la contraseña

El sistema SHALL permitir a una cuenta con contraseña cambiarla enviando la actual y la nueva (8 a
128 caracteres, las mismas reglas del registro). SHALL rechazar la nueva contraseña cuando sea igual a
la actual, con el código `PASSWORD_REUSED`. La persona SHALL poder pedir cerrar las demás sesiones; con esa opción el sistema SHALL
borrar todas las sesiones salvo la actual. Al cambiarla, el sistema SHALL invalidar los tokens de
restablecimiento pendientes y enviar un aviso por correo. El hash SHALL NOT salir nunca del servidor.

#### Scenario: Cambio válido cerrando las otras sesiones

- **WHEN** la persona envía su contraseña actual, una nueva válida y `revokeOtherSessions: true`
- **THEN** la contraseña cambia, las demás sesiones se borran, la actual sigue activa y recibe un
  aviso por correo

#### Scenario: Contraseña actual incorrecta

- **WHEN** la persona envía una contraseña actual incorrecta
- **THEN** la API responde `INVALID_CREDENTIALS` y la contraseña no cambia

#### Scenario: Contraseña nueva igual a la actual

- **WHEN** la nueva contraseña es igual a la actual
- **THEN** la API la rechaza con `PASSWORD_REUSED` y la contraseña no cambia

#### Scenario: Contraseña nueva demasiado corta

- **WHEN** la nueva contraseña tiene menos de 8 caracteres
- **THEN** la API responde con un error de validación y la contraseña no cambia

### Requirement: Crear contraseña en una cuenta sin ella

El sistema SHALL permitir a una cuenta sin contraseña local (alta con Google) crear una, con el
factor de "Autenticación reciente para acciones sensibles", de modo que pueda entrar con email y
contraseña además de con Google. SHALL rechazar la creación en una cuenta que ya tiene contraseña
(para eso está cambiarla). Aplican las reglas de longitud del registro y el aviso por correo.

#### Scenario: Crear la contraseña

- **WHEN** una cuenta de Google con sesión reciente crea una contraseña válida
- **THEN** la cuenta pasa a tener contraseña local, Google sigue vinculado y la persona ya puede
  iniciar sesión con email y contraseña

#### Scenario: La cuenta ya tiene contraseña

- **WHEN** una cuenta con contraseña intenta crear una
- **THEN** la API responde con un error de validación y la contraseña no cambia

### Requirement: Vincular Google a la cuenta

El sistema SHALL permitir a un usuario autenticado vincular una identidad de Google a su cuenta
desde Cuenta y seguridad, mediante el flujo OAuth existente con intención de vincular (ver
`google-oauth`). La vinculación SHALL crear la identidad enlazada por el identificador de la cuenta de
Google y no por el email, de modo que el email de Google no tiene que coincidir con el de la cuenta.
El sistema SHALL rechazar la vinculación cuando esa cuenta de Google ya esté vinculada a otra cuenta,
con el código `OAUTH_IDENTITY_TAKEN`, sin modificar ninguna cuenta. Vincular una identidad ya
vinculada a la misma cuenta SHALL ser inocuo.

#### Scenario: Vincular Google

- **WHEN** una cuenta con contraseña completa el flujo de vinculación con una cuenta de Google libre
- **THEN** la cuenta pasa a mostrar Google como vinculada y la persona vuelve a Cuenta y seguridad

#### Scenario: Google ya vinculada a otra cuenta

- **WHEN** la persona intenta vincular una cuenta de Google que ya pertenece a otra cuenta
- **THEN** ve el error `OAUTH_IDENTITY_TAKEN` localizado y ninguna cuenta cambia

#### Scenario: Vincular sin sesión

- **WHEN** una persona sin sesión inicia el flujo con la intención de vincular
- **THEN** el flujo se rechaza sin redirigir a Google

### Requirement: Desvincular Google sin perder el acceso

El sistema SHALL permitir desvincular Google solo cuando la cuenta tenga contraseña local; en caso
contrario SHALL rechazarlo con `LAST_ACCESS_METHOD` (409) y no modificar la cuenta. La interfaz SHALL
deshabilitar la acción en ese caso y explicar que hay que crear una contraseña primero. Desvincular
SHALL borrar la identidad y conservar la cuenta y su contenido.

#### Scenario: Desvincular con contraseña

- **WHEN** una cuenta con contraseña y Google vinculado desvincula Google
- **THEN** la identidad se borra y la persona sigue entrando con su contraseña

#### Scenario: Único método de acceso

- **WHEN** una cuenta sin contraseña intenta desvincular Google
- **THEN** la API responde `LAST_ACCESS_METHOD` y la identidad no se borra

#### Scenario: Botón deshabilitado

- **WHEN** una cuenta sin contraseña abre Cuenta y seguridad
- **THEN** "Desvincular" está deshabilitado y se ofrece "Crear contraseña"

