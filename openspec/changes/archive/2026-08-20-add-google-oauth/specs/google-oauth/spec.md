# google-oauth

Inicio de sesión y alta de cuentas con Google mediante OAuth 2.0 Authorization Code + OIDC,
gestionado exclusivamente en el backend de la aplicación Next.js, con desemboque en la sesión
server-side común definida para la autenticación local. No incluye vinculación de identidades
con cuentas locales existentes.

## ADDED Requirements

### Requirement: Inicio del flujo OAuth
El endpoint `GET /api/auth/google/start` SHALL generar un `state` aleatorio, un PKCE
`code_verifier`/`code_challenge` (S256) y un `nonce`, guardarlos en cookies `httpOnly`,
`secure` y `sameSite=lax` de corta duración, y redirigir al navegador hacia la authorization
URL de Google con `client_id`, `redirect_uri` fija, scopes `openid email profile`, `state`,
`code_challenge` y `nonce`.

#### Scenario: Inicio válido
- **WHEN** una persona accede a `GET /api/auth/google/start` con la configuración de Google presente
- **THEN** el servidor setea las cookies del flujo y responde con una redirección a la authorization URL de Google

#### Scenario: Configuración ausente
- **WHEN** una persona accede a `GET /api/auth/google/start` y faltan las variables de configuración de Google
- **THEN** el servidor responde con un error controlado sin redirigir a Google ni exponer secretos

### Requirement: Callback y validación del estado
El endpoint `GET /api/auth/google/callback` SHALL validar el parámetro `state` contra la
cookie del flujo antes de procesar la respuesta y SHALL rechazar el callback si la cookie
está ausente, expiró o no coincide. Si Google devuelve un parámetro `error`, el flujo SHALL
terminar sin crear sesión ni usuario.

#### Scenario: State válido
- **WHEN** el callback llega con un `state` que coincide con la cookie del flujo vigente
- **THEN** el flujo continúa con el intercambio del authorization code

#### Scenario: State inválido o ausente
- **WHEN** el callback llega sin `state`, con un `state` distinto al de la cookie o con la cookie expirada
- **THEN** el flujo se rechaza, no se crea sesión ni usuario y se dirige a la página localizada de error

#### Scenario: Error de Google
- **WHEN** Google redirige al callback con un parámetro `error` (p. ej. acceso denegado o cancelación)
- **THEN** el flujo termina sin crear sesión ni usuario y la persona ve un estado localizado de cancelación

### Requirement: Intercambio del authorization code y validación del ID token
El backend SHALL intercambiar el authorization code con Google únicamente en el servidor,
enviando el `redirect_uri` fijo configurado y el `code_verifier` del flujo, y SHALL validar
el ID token con `jose`: issuer exacto de Google, `aud` igual al `client_id`, firma contra el
JWKS de Google, expiración no vencida y `nonce` coincidente. Un callback con un `code`
inválido, ya usado o cuyo ID token no pase la validación SHALL terminar en error sin crear
sesión ni usuario.

#### Scenario: Código válido e ID token íntegro
- **WHEN** el intercambio devuelve un ID token con issuer, audiencia, firma, expiración y nonce válidos
- **THEN** el flujo continúa con la resolución o creación de la identidad

#### Scenario: ID token inválido
- **WHEN** el ID token tiene issuer, audiencia, firma o expiración inválidos, o el nonce no coincide
- **THEN** el flujo se rechaza, no se crea sesión ni usuario y se dirige a la página localizada de error

### Requirement: Resolución de identidad externa existente
Cuando una identidad con `(provider='google', provider_account_id=sub)` ya existe, el flujo
SHALL iniciar sesión con el `app_user` asociado, sin crear un usuario duplicado, y SHALL
desembocar en la sesión server-side común estableciendo la cookie `music_session`.

#### Scenario: Usuario de Google que vuelve
- **WHEN** el callback valida una identidad de Google que ya está vinculada a un `app_user`
- **THEN** el sistema crea o rota la sesión del usuario existente, setea la cookie y redirige a `/<locale>/search`

### Requirement: Alta de usuario nuevo con Google
Cuando la identidad no existe y el email del ID token (verificado) no pertenece a ninguna
cuenta local, el flujo SHALL crear un `app_user` y su `auth_identity` asociada dentro de una
misma transacción. El username SHALL derivarse del local-part del email, saneado a
`^[a-zA-Z0-9_]+$`, rellenado si queda por debajo de 3 caracteres, truncado a 32 y, en caso de
colisión, con un sufijo numérico incremental (`nombre`, `nombre2`, `nombre3`, ...) hasta
encontrar uno libre. La nueva cuenta no tiene contraseña (`password_hash` nulo).

#### Scenario: Alta nueva sin colisión de username
- **WHEN** el email de Google es `juan.perez@gmail.com` y `juan_perez` está libre
- **THEN** se crea el usuario con username `juan_perez`, la identidad `(google, sub)` y se inicia la sesión

#### Scenario: Local-part corto
- **WHEN** el email de Google es `ab@gmail.com`
- **THEN** el username saneado se rellena hasta alcanzar el mínimo de 3 caracteres antes de insertar

#### Scenario: Colisión de username
- **WHEN** el username derivado `juan_perez` ya existe y `juan_perez2` está libre
- **THEN** se crea el usuario con username `juan_perez2` sin fallar por unicidad

### Requirement: Email verificado requerido para altas nuevas
El flujo SHALL exigir `email_verified=true` en el ID token para crear una cuenta nueva. Si la
identidad no existe y el ID token trae `email_verified=false` o ausente, el flujo SHALL NOT
crear el usuario ni la identidad, y SHALL dirigir a la página de error localizada con el código
`OAUTH_EMAIL_NOT_VERIFIED`. Para una identidad ya vinculada (login recurrente) este claim no
se vuelve a exigir.

#### Scenario: Email no verificado
- **WHEN** el callback valida un ID token con `email_verified=false` y no existe identidad vinculada
- **THEN** no se crea usuario ni identidad y la persona ve el estado localizado de email no verificado

#### Scenario: Email verificado
- **WHEN** el callback valida un ID token con `email_verified=true` y no existe identidad vinculada
- **THEN** el flujo continúa con la resolución de username y la creación transaccional

### Requirement: Email de Google que pertenece a una cuenta local
Si el email del ID token verificado coincide con un `app_user` existente que no tiene esa
identidad de Google vinculada, el flujo SHALL rechazar el alta con un error machine-readable
indicando que ya existe una cuenta con ese email y que debe iniciar sesión con contraseña.
SHALL NOT crear una cuenta nueva, vincular implícitamente la identidad ni exponer un flujo de
merge o auto-link.

#### Scenario: Email ya registrado localmente
- **WHEN** el callback valida un email de Google que ya pertenece a una cuenta local sin esa identidad vinculada
- **THEN** no se crea usuario ni identidad y la persona ve el estado localizado de "ya existe, iniciá sesión con contraseña"

### Requirement: Sesión común y retorno fijo
El flujo SHALL finalizar siempre en la sesión server-side común (cookie `music_session`
`httpOnly`, `secure`, `sameSite=lax`) y SHALL redirigir post-autenticación a `/<locale>/search`
de forma fija, usando el locale validado y persistido en el estado del flujo. SHALL NOT aceptar
un parámetro `returnTo` ni ninguna URL de retorno controlada por el cliente.

#### Scenario: Redirección post-login
- **WHEN** el flujo de Google completa con éxito
- **THEN** el navegador es redirigido a `/<locale>/search` y la cookie de sesión queda establecida

#### Scenario: Sin retorno dinámico
- **WHEN** una persona agrega un parámetro de retorno arbitrario al callback
- **THEN** la redirección posterior es siempre `/<locale>/search`, sin usar el parámetro

### Requirement: No almacenamiento de tokens OAuth
El flujo SHALL NOT persistir access tokens ni refresh tokens de Google. Los secretos y
credenciales del proveedor SHALL vivir únicamente en variables de entorno del servidor y
nunca llegar al frontend.

#### Scenario: Sin persistencia de tokens
- **WHEN** un flujo de Google completa
- **THEN** solo se persisten la identidad externa, el usuario y la sesión opaca; no se guardan tokens del proveedor

### Requirement: Acceso desde login y registro
Las páginas de login y registro SHALL ofrecer un botón "Continuar con Google" que navegue a
`GET /api/auth/google/start?locale=<locale>` (el locale de la página en curso) y SHALL mostrar
estados localizados para cancelación, error del flujo, email no verificado y email ya existente
como cuenta local. El flujo OAuth SHALL permanecer fuera de los componentes cliente.

#### Scenario: Botón en login
- **WHEN** una persona visita la página de inicio de sesión
- **THEN** ve el botón "Continuar con Google" que enlaza al inicio del flujo con el locale en curso

#### Scenario: Botón en registro
- **WHEN** una persona visita la página de creación de cuenta
- **THEN** ve el botón "Continuar con Google" que enlaza al inicio del flujo con el locale en curso

#### Scenario: Error localizado en el callback
- **WHEN** el callback falla por email ya existente, email no verificado, estado inválido o error del proveedor
- **THEN** la persona ve un mensaje localizado en el idioma del flujo que no expone el texto crudo del error ni secretos

### Requirement: Rate limiting del flujo OAuth
`GET /api/auth/google/start` y `GET /api/auth/google/callback` SHALL aplicar el limitador en
memoria existente por IP (`oauth:start:ip:...` y `oauth:callback:ip:...` respectivamente). El
callback SHALL limpiar su contador al completar el flujo con éxito. Al superar el límite, ambas
rutas SHALL redirigir a la página de error localizada con el código `RATE_LIMITED`.

#### Scenario: Callback por encima del límite
- **WHEN** una IP supera el límite de callbacks de OAuth en la ventana
- **THEN** el flujo redirige a la página de error localizada con `RATE_LIMITED` sin completar el intercambio

#### Scenario: Éxito limpia el contador
- **WHEN** el flujo de Google completa con éxito
- **THEN** el contador de rate limiting de esa IP se limpia

### Requirement: Sin vinculación de cuentas existentes
Este incremento SHALL NOT implementar rutas ni UI para vincular una identidad de Google con
una cuenta local autenticada. La vinculación explícita queda diferida a una fase posterior
con página de perfil/configuración.

#### Scenario: Sin rutas de linking
- **WHEN** se navega a una ruta de vinculación de identidad externa
- **THEN** la ruta no existe y el usuario no encuentra ningún flujo de merge en esta fase