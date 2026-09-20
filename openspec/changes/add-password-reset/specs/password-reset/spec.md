## ADDED Requirements

### Requirement: Pedido de restablecimiento con respuesta genérica

El endpoint `POST /api/auth/password/forgot` SHALL aceptar un email y un `locale` opcional, y SHALL
responder `202` con el mismo cuerpo para todo email bien formado, exista o no la cuenta y tenga o no
contraseña local, de modo que no permita enumerar cuentas. El endpoint SHALL generar un token y
enviar el correo únicamente cuando exista un `app_user` con `password_hash` no nulo para ese email.

#### Scenario: Pedido para una cuenta con contraseña local

- **WHEN** se solicita el restablecimiento para el email de una cuenta con contraseña local
- **THEN** la API responde `202` y genera un token de restablecimiento para esa cuenta

#### Scenario: Pedido para un email inexistente

- **WHEN** se solicita el restablecimiento para un email que no corresponde a ninguna cuenta
- **THEN** la API responde `202` con el mismo cuerpo que para una cuenta existente y no genera ningún token

#### Scenario: Email mal formado

- **WHEN** el cuerpo de la request no tiene un email válido
- **THEN** la API responde `400` con código `VALIDATION_ERROR`

### Requirement: Restricción a cuentas con contraseña local

El flujo SHALL NOT generar token, enviar correo ni crear contraseña local para cuentas cuyo
`password_hash` sea nulo (altas vía Google u otras identidades sin credencial local), para no habilitar
vinculación implícita por email.

#### Scenario: Cuenta solo-Google

- **WHEN** se solicita el restablecimiento para el email de una cuenta creada vía Google sin contraseña local
- **THEN** la API responde `202` igual que para cualquier pedido y no genera token ni envía correo

#### Scenario: Cuenta sin contraseña no puede consumir un token

- **WHEN** un pedido para una cuenta sin `password_hash` no generó token
- **THEN** no existe ningún token de ese pedido que pueda consumirse para fijar una contraseña

### Requirement: Token de un solo uso, hasheado y con expiración

El token de restablecimiento SHALL generarse con al menos 32 bytes aleatorios, SHALL persistirse
únicamente como hash (SHA-256) en `password_reset_token` y SHALL tener una expiración de 30 minutos
desde su creación. Un pedido nuevo SHALL invalidar los tokens anteriores del mismo usuario antes de
crear el nuevo, de modo que solo el último link emitido sea válido.

#### Scenario: Token persistido hasheado

- **WHEN** se genera un token para una cuenta válida
- **THEN** la base de datos guarda solo el hash del token y el token en claro viaja únicamente en el link del correo

#### Scenario: Un pedido nuevo invalida los anteriores

- **WHEN** se solicita un segundo restablecimiento para la misma cuenta antes de usar el primero
- **THEN** el token anterior deja de ser válido y solo el nuevo puede consumirse

#### Scenario: Token expirado

- **WHEN** se intenta consumir un token cuyo `expires_at` ya pasó
- **THEN** el token se rechaza como inválido sin modificar la contraseña

### Requirement: Definición de contraseña nueva desde un token válido

`POST /api/auth/password/reset` SHALL recibir `{ token, password }`, consumir el token de forma
atómica y, si es válido y no expiró, actualizar `app_user.password_hash` con Argon2id y responder
`200`. El consumo SHALL ser de un solo uso: un segundo intento con el mismo token SHALL fallar.

#### Scenario: Reset exitoso

- **WHEN** llega un token válido y una contraseña nueva válida
- **THEN** la API responde `200` y la contraseña del usuario queda actualizada

#### Scenario: Segundo uso del mismo token

- **WHEN** se intenta consumir un token que ya fue usado en un reset exitoso
- **THEN** la API responde `400` con código `INVALID_RESET_TOKEN` y no modifica la contraseña

#### Scenario: Contraseña fuera de la política

- **WHEN** la contraseña nueva no cumple el mínimo de 8 caracteres o excede 128
- **THEN** la API responde `400` con código `VALIDATION_ERROR` y no consume el token ni modifica la contraseña

### Requirement: No reutilizar la contraseña anterior

El endpoint de reset SHALL rechazar con `400` y código `PASSWORD_REUSED` cuando la contraseña nueva
sea igual a la vigente de la cuenta, comparándola contra el hash actual. La validación SHALL ser
server-side. En ese rechazo el token NO SHALL consumirse, de modo que la persona pueda reintentar con
el mismo link. No se exige historial de contraseñas ni comparación contra listas de filtradas.

#### Scenario: Contraseña igual a la actual

- **WHEN** se envía un token válido junto con la misma contraseña que la cuenta ya tiene
- **THEN** la API responde `400` con código `PASSWORD_REUSED` y no modifica la contraseña

#### Scenario: El token sigue vigente tras el rechazo

- **WHEN** un reset fue rechazado por reuso y se reintenta con el mismo token y una contraseña distinta
- **THEN** el reset se completa con éxito

#### Scenario: Contraseña distinta

- **WHEN** se envía un token válido junto con una contraseña distinta de la actual
- **THEN** la API actualiza la contraseña y responde `200`

### Requirement: Rechazo de token inválido, expirado o ya usado

El endpoint de reset SHALL responder `400` con código `INVALID_RESET_TOKEN` ante un token
inexistente, expirado o ya usado, sin distinguir entre esos casos y sin revelar si la cuenta existe.

#### Scenario: Token inexistente

- **WHEN** se envía un token que no corresponde a ninguna fila de `password_reset_token`
- **THEN** la API responde `400` con código `INVALID_RESET_TOKEN`

### Requirement: Invalidación de sesiones y tokens al completar

Al completarse un reset SHALL eliminarse todos los `password_reset_token` del usuario y todas sus
sesiones activas, sin crear una sesión nueva (sin autologin). El cliente SHALL dirigirse a la página
de login para que la persona se autentique con la contraseña nueva.

#### Scenario: Reset cierra todas las sesiones

- **WHEN** un usuario tenía sesiones activas en distintos dispositivos y completa un restablecimiento
- **THEN** todas esas sesiones dejan de ser válidas y se exige un login nuevo

#### Scenario: Sin autologin tras el reset

- **WHEN** el reset se completa con éxito
- **THEN** la respuesta no setea ninguna cookie de sesión y la persona vuelve a la página de login

### Requirement: Envío de correo con transporte desacoplado y fail-closed

El envío SHALL realizarse a través de una interfaz de transporte (adaptador `console` en desarrollo
y proveedor real configurable). Sin transporte real configurado, en `NODE_ENV=production` el servicio
SHALL fallar de forma controlada y el endpoint SHALL responder `503` con código
`EMAIL_CONFIG_MISSING`, sin exponer secretos. El correo SHALL construir el link a la página de reset
sobre `NEXT_PUBLIC_APP_URL` y en el locale validado del pedido.

#### Scenario: Desarrollo sin proveedor

- **WHEN** se solicita un restablecimiento en un entorno de desarrollo sin `EMAIL_TRANSPORT` configurado
- **THEN** el adaptador de desarrollo registra el mensaje y el flujo continúa normalmente

#### Scenario: Producción sin proveedor configurado

- **WHEN** se solicita un restablecimiento en producción y no hay un transporte real configurado
- **THEN** la API responde `503` con código `EMAIL_CONFIG_MISSING` y no se expone el token

#### Scenario: Link localizado

- **WHEN** un pedido incluye un `locale` soportado
- **THEN** el correo se compone en ese idioma y su link apunta a `/<locale>/auth/reset-password` con el token

### Requirement: Rate limiting de los endpoints de reset

Ambos endpoints SHALL aplicar el limitador en memoria existente: el pedido por IP y por email, y el
reset por IP. Al superar el límite, el endpoint SHALL responder `429` con código `RATE_LIMITED`. El
endpoint de reset SHALL limpiar sus contadores al completar con éxito. El endpoint de pedido SHALL NOT
limpiar sus contadores, para no introducir una señal que permita inferir la existencia de una cuenta.

#### Scenario: Exceso de pedidos

- **WHEN** se superan los intentos permitidos de `POST /api/auth/password/forgot` para una IP o un email
- **THEN** la API responde `429` con código `RATE_LIMITED`

#### Scenario: Exceso de intentos de reset

- **WHEN** se superan los intentos permitidos de `POST /api/auth/password/reset` para una IP
- **THEN** la API responde `429` con código `RATE_LIMITED`

#### Scenario: El pedido no limpia contadores (anti-enumeración)

- **WHEN** un pedido de restablecimiento se completa para una cuenta existente
- **THEN** sus contadores de rate limit no se reinician, para que el estado del limitador no revele la existencia de la cuenta

### Requirement: Superficies web del flujo de restablecimiento

El sistema SHALL ofrecer una página de pedido (`/<locale>/auth/forgot-password`) y una página de
definición de contraseña (`/<locale>/auth/reset-password`). La página de reset SHALL validar el token
sin consumirlo antes de mostrar el formulario y SHALL mostrar un estado de link inválido o expirado
cuando corresponda, con `Referrer-Policy: no-referrer` para no filtrar el token. La página de login
SHALL enlazar al pedido de restablecimiento y SHALL mostrar un aviso de éxito al volver con
`?reset=1`.

#### Scenario: Pedido enviado

- **WHEN** una persona envía el formulario de `forgot-password` con un email
- **THEN** la página muestra el mensaje genérico de "si el email existe, te enviamos un link" sin confirmar la existencia de la cuenta

#### Scenario: Link inválido o expirado

- **WHEN** una persona abre `reset-password` con un token inexistente o expirado
- **THEN** la página muestra el estado de link inválido o expirado en lugar del formulario

#### Scenario: Contraseñas no coincidentes

- **WHEN** la persona escribe dos contraseñas distintas en el formulario de reset
- **THEN** el formulario muestra un error local de validación y no envía la request

#### Scenario: Reset completado

- **WHEN** el reset se completa con éxito
- **THEN** la persona vuelve a la página de login y ve el aviso de que la contraseña fue actualizada
