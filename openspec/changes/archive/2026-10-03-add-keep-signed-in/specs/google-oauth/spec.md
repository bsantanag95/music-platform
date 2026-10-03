## MODIFIED Requirements

### Requirement: Inicio del flujo OAuth
El endpoint `GET /api/auth/google/start` SHALL generar un `state` aleatorio, un PKCE
`code_verifier`/`code_challenge` (S256) y un `nonce`, guardarlos en cookies `httpOnly`,
`secure` y `sameSite=lax` de corta duración, y redirigir al navegador hacia la authorization
URL de Google con `client_id`, `redirect_uri` fija, scopes `openid email profile`, `state`,
`code_challenge` y `nonce`. SHALL aceptar además un parámetro `remember` (`0` o `1`; cualquier otro
valor o su ausencia equivale a `1`) con la elección de mantener la sesión (ver `keep-signed-in`), SHALL
guardarlo en el estado del flujo junto con el resto y SHALL usar en el callback únicamente el valor
guardado, nunca uno recibido en el callback. La sesión que cree o rote el flujo con intención `login`
SHALL respetar esa elección.

#### Scenario: Inicio válido
- **WHEN** una persona accede a `GET /api/auth/google/start` con la configuración de Google presente
- **THEN** el servidor setea las cookies del flujo y responde con una redirección a la authorization URL de Google

#### Scenario: Configuración ausente
- **WHEN** una persona accede a `GET /api/auth/google/start` y faltan las variables de configuración de Google
- **THEN** el servidor responde con un error controlado sin redirigir a Google ni exponer secretos

#### Scenario: Elegir no mantener la sesión
- **WHEN** una persona accede a `GET /api/auth/google/start?remember=0` y el flujo completa con éxito
- **THEN** la sesión creada es no mantenida y su cookie es de sesión

#### Scenario: Sin elección
- **WHEN** una persona accede a `GET /api/auth/google/start` sin `remember` y el flujo completa con éxito
- **THEN** la sesión creada es mantenida

#### Scenario: Elección manipulada en el callback
- **WHEN** el callback llega con un parámetro `remember` distinto del que guardó el inicio del flujo
- **THEN** la sesión se crea con la elección guardada en el estado del flujo

### Requirement: Acceso desde login y registro
Las páginas de login y registro SHALL ofrecer un botón "Continuar con Google" que navegue a
`GET /api/auth/google/start?locale=<locale>` (el locale de la página en curso) y SHALL mostrar
estados localizados para cancelación, error del flujo, email no verificado y email ya existente
como cuenta local. En el login el botón SHALL reflejar la casilla "Mantener la sesión iniciada en
este dispositivo" (ver `keep-signed-in`): con la casilla desmarcada SHALL navegar con `remember=0`.
El flujo OAuth (estado, PKCE, intercambio del código y validación del token) SHALL permanecer en el
servidor; el botón solo compone la URL de inicio.

#### Scenario: Botón en login
- **WHEN** una persona visita la página de inicio de sesión
- **THEN** ve el botón "Continuar con Google" que enlaza al inicio del flujo con el locale en curso

#### Scenario: Botón en login con la casilla desmarcada
- **WHEN** la persona desmarca "Mantener la sesión iniciada en este dispositivo" en el login
- **THEN** el botón "Continuar con Google" enlaza al inicio del flujo con el locale en curso y `remember=0`

#### Scenario: Botón en registro
- **WHEN** una persona visita la página de creación de cuenta
- **THEN** ve el botón "Continuar con Google" que enlaza al inicio del flujo con el locale en curso

#### Scenario: Error localizado en el callback
- **WHEN** el callback falla por email ya existente, email no verificado, estado inválido o error del proveedor
- **THEN** la persona ve un mensaje localizado en el idioma del flujo que no expone el texto crudo del error ni secretos
