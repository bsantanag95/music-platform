## MODIFIED Requirements

### Requirement: Sesión común y retorno fijo
El flujo SHALL finalizar siempre en la sesión server-side común (cookie `music_session`
`httpOnly`, `secure`, `sameSite=lax`). SHALL NOT aceptar un parámetro `returnTo` ni ninguna
URL de retorno controlada por el cliente. La redirección post-autenticación SHALL usar el
locale validado y persistido en el estado del flujo (salvo que la cuenta tenga un idioma preferido
guardado, que prevalece; ver `account-preferences`), y SHALL decidirse según el estado de
onboarding del usuario: si `onboarded_at` es nula SHALL redirigir a `/<locale>/welcome`; en
caso contrario SHALL redirigir a `/<locale>/search` de forma fija. Si el estado del flujo guarda una
intención (ver "Acceso desde login y registro"), SHALL redirigir en ambos casos a su destino:
`/<locale>/me/laminas?desde=<id>` para una Lámina y `/<locale>/users/<usuario>/artist/<id>?valorar=1`
para una discografía, con el usuario autenticado. El identificador sale del estado guardado y la ruta
es fija. Las intenciones de vincular una
cuenta de Google y de confirmar la identidad (ver "Intenciones del flujo con retorno fijo") SHALL
redirigir siempre a `/<locale>/me/settings/account`, un destino fijo que no depende de ningún
parámetro del cliente.

#### Scenario: Redirección post-login
- **WHEN** el flujo de Google completa con éxito para un usuario cuyo `onboarded_at` no es nula
- **THEN** el navegador es redirigido a `/<locale>/search` y la cookie de sesión queda establecida

#### Scenario: Redirección post-alta de un usuario nuevo
- **WHEN** el flujo de Google completa con éxito y crea un usuario nuevo (o resuelve uno con `onboarded_at` nula)
- **THEN** el navegador es redirigido a `/<locale>/welcome` y la cookie de sesión queda establecida

#### Scenario: Sin retorno dinámico
- **WHEN** una persona agrega un parámetro de retorno arbitrario al callback
- **THEN** la redirección posterior ignora ese parámetro y usa solo el destino que corresponde al estado de onboarding del usuario

#### Scenario: Idioma preferido de la cuenta
- **WHEN** el flujo de Google completa con éxito para un usuario con un idioma preferido guardado distinto del idioma del flujo
- **THEN** el navegador es redirigido al destino habitual en el idioma preferido de la cuenta

#### Scenario: Retorno fijo al vincular o confirmar
- **WHEN** el flujo con intención de vincular o de confirmar la identidad completa con éxito
- **THEN** el navegador es redirigido a `/<locale>/me/settings/account` sin importar los parámetros de la petición

#### Scenario: Retorno con intención de Lámina
- **WHEN** el flujo con `login` y una intención de Lámina completa con éxito, para un usuario nuevo o existente
- **THEN** el navegador es redirigido a `/<locale>/me/laminas?desde=<id>` y la cookie de sesión queda establecida

#### Scenario: La intención no se lee del callback
- **WHEN** una persona agrega `lamina=<id>` a la URL del callback
- **THEN** la redirección ignora ese parámetro

#### Scenario: Retorno con intención de discografía
- **WHEN** el flujo con `login` y una intención de discografía completa con éxito
- **THEN** el navegador es redirigido a la discografía de ese artista del usuario autenticado, en el modo para valorar

### Requirement: Acceso desde login y registro
Las páginas de login y registro SHALL ofrecer un botón "Continuar con Google" que navegue a
`GET /api/auth/google/start?locale=<locale>` (el locale de la página en curso) y SHALL mostrar
estados localizados para cancelación, error del flujo, email no verificado y email ya existente
como cuenta local. En el login el botón SHALL reflejar la casilla "Mantener la sesión iniciada en
este dispositivo" (ver `keep-signed-in`): con la casilla desmarcada SHALL navegar con `remember=0`.
Si la página recibió una intención cerrada (ver `top-laminas` y `discography-laminas`), el botón SHALL
navegar con `lamina=<id>` o `discografia=<id>`. `GET /api/auth/google/start` SHALL guardarla en el estado
del flujo solo si es un identificador válido y la intención del flujo es `login`; si llegan las dos, SHALL
quedarse con la de Lámina, y cualquier otro valor SHALL descartarse sin interrumpir el flujo.
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

#### Scenario: Botón con intención de Lámina
- **WHEN** una persona abre el registro con `lamina=<id>`
- **THEN** el botón "Continuar con Google" enlaza al inicio del flujo con esa intención

#### Scenario: Intención inválida al iniciar
- **WHEN** `GET /api/auth/google/start` recibe `lamina` con algo que no es un identificador
- **THEN** el flujo sigue sin intención de Lámina

#### Scenario: Intención de cuenta
- **WHEN** el flujo con intención `link` o `reauth` recibe `lamina`
- **THEN** el valor se ignora y el retorno sigue siendo a Ajustes

#### Scenario: Botón con intención de discografía
- **WHEN** una persona abre el registro con `discografia=<id>`
- **THEN** el botón "Continuar con Google" enlaza al inicio del flujo con esa intención
