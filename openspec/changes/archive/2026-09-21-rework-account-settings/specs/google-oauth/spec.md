## MODIFIED Requirements

### Requirement: Sesión común y retorno fijo
El flujo SHALL finalizar siempre en la sesión server-side común (cookie `music_session`
`httpOnly`, `secure`, `sameSite=lax`). SHALL NOT aceptar un parámetro `returnTo` ni ninguna
URL de retorno controlada por el cliente. La redirección post-autenticación SHALL usar el
locale validado y persistido en el estado del flujo (salvo que la cuenta tenga un idioma preferido
guardado, que prevalece; ver `account-preferences`), y SHALL decidirse según el estado de
onboarding del usuario: si `onboarded_at` es nula SHALL redirigir a `/<locale>/welcome`; en
caso contrario SHALL redirigir a `/<locale>/search` de forma fija. Las intenciones de vincular una
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

## ADDED Requirements

### Requirement: Intenciones del flujo con retorno fijo

El estado del flujo OAuth SHALL incluir una intención cerrada: `login` (por defecto), `link` o
`reauth`. `GET /api/auth/google/start` SHALL aceptar únicamente esos tres valores, tratar cualquier
otro como `login`, y exigir una sesión iniciada para `link` y `reauth` (sin sesión, el flujo se
rechaza sin redirigir a Google). La intención SHALL viajar en las cookies del flujo protegidas por
`state`, PKCE y `nonce`, y SHALL validarse en el callback contra el estado guardado.

- `link`: SHALL exigir la sesión del callback, crear la identidad para la cuenta de esa sesión y
  rechazar con `OAUTH_IDENTITY_TAKEN` una cuenta de Google ya vinculada a otra cuenta. No SHALL crear
  ni rotar la sesión.
- `reauth`: SHALL exigir que la identidad de Google pertenezca a la persona de la sesión (si no,
  `OAUTH_IDENTITY_MISMATCH`) y SHALL rotar la sesión para que cuente como reciente.
- `login`: SHALL comportarse como hasta ahora, reactivando la cuenta si estaba desactivada (ver
  `account-lifecycle`).

#### Scenario: Iniciar el flujo para vincular

- **WHEN** una persona con sesión abre `GET /api/auth/google/start?intent=link`
- **THEN** el estado del flujo guarda la intención `link` y el navegador es redirigido a Google

#### Scenario: Vincular sin sesión

- **WHEN** una persona sin sesión abre `GET /api/auth/google/start?intent=link`
- **THEN** el flujo se rechaza con un error de autenticación, sin redirigir a Google

#### Scenario: Intención desconocida

- **WHEN** una petición trae `intent=admin`
- **THEN** el flujo se trata como `login`

#### Scenario: Confirmar la identidad con la cuenta equivocada

- **WHEN** en el flujo `reauth` la persona elige una cuenta de Google que no es la vinculada a su
  cuenta
- **THEN** el callback responde `OAUTH_IDENTITY_MISMATCH` y la sesión no se rota

#### Scenario: Confirmar la identidad

- **WHEN** en el flujo `reauth` la persona elige su cuenta de Google vinculada
- **THEN** la sesión se rota, cuenta como reciente y el navegador vuelve a Cuenta y seguridad

## REMOVED Requirements

### Requirement: Sin vinculación de cuentas existentes
**Reason**: La vinculación explícita de una identidad de Google con una cuenta autenticada, diferida
en el primer incremento "a una fase posterior con página de perfil/configuración", pasa a existir
desde Cuenta y seguridad (`account-credentials`, "Vincular Google a la cuenta").
**Migration**: Usar el flujo con `intent=link` desde una sesión iniciada. El alta con un email que ya
pertenece a una cuenta local no cambia: sigue rechazándose sin vincular de forma implícita.
