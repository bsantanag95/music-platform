## ADDED Requirements

### Requirement: Estado de verificación del email persistido

El sistema SHALL registrar en `app_user.email_verified_at` si el email de una cuenta está verificado.
Las cuentas preexistentes SHALL quedar marcadas como verificadas mediante backfill, y las altas
nuevas vía Google SHALL marcarse como verificadas al crearse, porque el flujo ya exige
`email_verified=true` para dar de alta.

#### Scenario: Alta vía Google marcada como verificada

- **WHEN** el flujo de Google crea un `app_user` nuevo con `email_verified=true`
- **THEN** la cuenta queda con `email_verified_at` poblado

#### Scenario: Cuentas preexistentes quedan verificadas

- **WHEN** se aplica la migración de este cambio sobre una base con usuarios ya existentes
- **THEN** esos usuarios quedan con `email_verified_at` poblado y no se les pide verificar

#### Scenario: Alta local nueva sin verificar

- **WHEN** una cuenta se crea por registro local
- **THEN** su `email_verified_at` queda nulo hasta que consuma un token de verificación válido

### Requirement: Envío del correo de verificación al registrarse

Tras crear una cuenta local, el registro SHALL iniciar el envío de un correo con un link de
verificación, sin bloquear ni hacer fallar el alta si el correo no se puede enviar. El envío SHALL
ser un no-op si la cuenta ya está verificada. Sin transporte de email real configurado, no SHALL
crearse token y el alta SHALL completarse igualmente.

#### Scenario: Alta local dispara el correo

- **WHEN** una persona se registra correctamente por email y contraseña
- **THEN** el sistema genera un token y envía un correo con el link de verificación, y responde el alta con normalidad

#### Scenario: El alta no falla si el envío falla

- **WHEN** el envío del correo falla o no hay transporte configurado
- **THEN** la cuenta se crea igual, la sesión se inicia y no se expone el error de email al cliente

#### Scenario: Cuenta ya verificada

- **WHEN** se intenta enviar la verificación para una cuenta con `email_verified_at` poblado
- **THEN** no se genera token ni se envía correo

### Requirement: Token de verificación de un solo uso y con expiración

El token SHALL generarse con al menos 32 bytes aleatorios, persistirse solo como hash SHA-256 en
`email_verification_token`, tener una expiración de 24 horas y ser único por usuario (un token
vigente a la vez). Un pedido nuevo SHALL reemplazar el token anterior de forma atómica.

#### Scenario: Token persistido hasheado

- **WHEN** se genera un token de verificación
- **THEN** la base guarda solo su hash y el token en claro viaja únicamente en el link del correo

#### Scenario: Un reenvío reemplaza el token anterior

- **WHEN** se reenvía la verificación antes de consumir el token vigente
- **THEN** el token anterior deja de ser válido y solo el nuevo puede consumirse

#### Scenario: Token expirado

- **WHEN** se intenta verificar con un token cuyo `expires_at` ya pasó
- **THEN** la verificación se rechaza como inválida sin marcar el email como verificado

### Requirement: Verificación desde el link

`POST /api/auth/email/verify` SHALL recibir `{ token }`, consumir el token de forma atómica y, si es
válido y no expiró, fijar `email_verified_at` y borrar los tokens de verificación del usuario en una
transacción, respondiendo `200`. Un token inexistente, expirado o ya usado SHALL responder `400` con
código `INVALID_VERIFICATION_TOKEN` sin distinguir el caso.

#### Scenario: Verificación exitosa

- **WHEN** llega un token válido
- **THEN** la API responde `200` y la cuenta queda con `email_verified_at` poblado

#### Scenario: Token inválido o ya usado

- **WHEN** se envía un token inexistente, expirado o ya consumido
- **THEN** la API responde `400` con código `INVALID_VERIFICATION_TOKEN` y no modifica el estado de verificación

### Requirement: Reenvío autenticado con rate limiting

`POST /api/auth/email/verify/resend` SHALL requerir una sesión válida y SHALL operar únicamente sobre
el usuario autenticado. Si la cuenta ya está verificada SHALL responder `409` con código
`EMAIL_ALREADY_VERIFIED`; si no, SHALL generar un token nuevo y reenviar el correo. El endpoint SHALL
aplicar el limitador en memoria; sin sesión SHALL responder `401` con `AUTH_REQUIRED`.

#### Scenario: Reenvío de una cuenta sin verificar

- **WHEN** un usuario autenticado sin verificar pide reenviar el correo
- **THEN** la API responde `200` y envía un token nuevo a su email

#### Scenario: Reenvío de una cuenta ya verificada

- **WHEN** un usuario autenticado y ya verificado pide reenviar el correo
- **THEN** la API responde `409` con código `EMAIL_ALREADY_VERIFIED` y no genera token

#### Scenario: Reenvío sin sesión

- **WHEN** se llama al reenvío sin sesión válida
- **THEN** la API responde `401` con código `AUTH_REQUIRED`

#### Scenario: Exceso de reenvíos

- **WHEN** se superan los intentos permitidos del reenvío
- **THEN** la API responde `429` con código `RATE_LIMITED`

### Requirement: Verificación en modo soft

El estado de verificación SHALL registrarse y mostrarse, pero SHALL NOT bloquear el inicio de sesión
ni ninguna acción de la cuenta mientras no exista una decisión explícita de enforcement. La
comprobación SHALL centralizarse en un helper reutilizable para poder endurecerla después.

#### Scenario: Cuenta sin verificar usa la app

- **WHEN** un usuario con `email_verified_at` nulo inicia sesión y usa la aplicación
- **THEN** su acceso y sus acciones no se bloquean; solo ve el aviso de verificación

### Requirement: Superficies web de verificación

El sistema SHALL ofrecer una página `/<locale>/auth/verify-email` que valide el token sin consumirlo
y muestre el formulario/estado correspondiente, aplicando `Referrer-Policy: no-referrer`. La cuenta
sin verificar SHALL ver un aviso con acción de reenviar (por ejemplo en `/<locale>/me/settings`) y un
estado de éxito tras verificar.

#### Scenario: Link válido

- **WHEN** una persona abre la página de verificación con un token válido
- **THEN** ve el estado de confirmación y puede completar la verificación

#### Scenario: Link inválido o expirado

- **WHEN** una persona abre la página con un token inexistente, expirado o ya usado
- **THEN** ve el estado de link inválido o expirado con la opción de pedir un correo nuevo

#### Scenario: Aviso de email sin verificar

- **WHEN** un usuario autenticado con `email_verified_at` nulo entra a la configuración de su cuenta
- **THEN** ve el aviso de que su email no está verificado y un botón para reenviar el correo

### Requirement: Correo de verificación localizado

El asunto, el texto y el HTML del correo SHALL componerse en el locale validado del pedido,
construyendo el link sobre `NEXT_PUBLIC_APP_URL`. El registro SHALL aceptar un `locale` opcional
validado contra los locales soportados (default `es`).

#### Scenario: Link localizado

- **WHEN** un registro envía `locale=en`
- **THEN** el correo se compone en inglés y su link apunta a `/en/auth/verify-email` con el token

#### Scenario: Locale no soportado

- **WHEN** el registro envía un locale no soportado
- **THEN** el correo se compone en el locale por defecto (`es`)
