## ADDED Requirements

### Requirement: Casilla de los Términos en el registro con email

El formulario de registro SHALL incluir una casilla, sin marcar de antemano, con el texto «Acepto los Términos del servicio y he
leído la Política de privacidad», donde ambos nombres son enlaces a `/terms` y `/privacy` que abren en una pestaña nueva con el
aviso accesible correspondiente. Sin marcarla, el formulario SHALL no enviar el alta, mostrar un error asociado a la casilla
(`aria-invalid` y descripción accesible) y enfocarla. `POST /api/auth/register` SHALL exigir `acceptTerms` igual al booleano
`true`; ausente, `false` o de otro tipo SHALL responder `VALIDATION_ERROR` (400) sin crear la cuenta ni la sesión.

#### Scenario: Sin la casilla no hay alta en el cliente

- **WHEN** una persona envía el registro con la casilla sin marcar
- **THEN** no se llama a la API, la casilla queda enfocada con el error «Para crear tu cuenta debes aceptar los Términos del servicio.»

#### Scenario: Sin la casilla no hay alta en la API

- **WHEN** se hace `POST /api/auth/register` sin `acceptTerms` o con `acceptTerms: false`
- **THEN** responde 400 `VALIDATION_ERROR` y no se crea la cuenta

#### Scenario: Con la casilla marcada se crea la cuenta

- **WHEN** se envía el registro con la casilla marcada
- **THEN** la API recibe `acceptTerms: true` y crea la cuenta registrando la aceptación por casilla

### Requirement: Aviso de los Términos junto al botón de Google

Bajo el botón «Continuar con Google» del registro y del login SHALL mostrarse un aviso con enlaces a los Términos del servicio y
a la Política de privacidad (pestaña nueva): en el registro, que continuar con Google es aceptarlos; en el login, que si es la
primera vez, continuar con Google es aceptarlos. El aviso no SHALL ser una casilla ni un paso intermedio.

#### Scenario: Aviso en el registro y en el login

- **WHEN** se muestra `/auth/register` o `/auth/login`
- **THEN** el botón de Google va acompañado del aviso correspondiente y no hay casilla junto a él

### Requirement: Registro de la aceptación

Al crear una cuenta, el sistema SHALL guardar en `app_user` la fecha (`terms_accepted_at`), la versión vigente de los Términos
(`terms_version`, `TERMS_VERSION`) y el modo (`terms_accepted_via`): `checkbox` para el registro con email y `notice` para la
cuenta creada con Google. Las tres columnas SHALL ir juntas o ninguna (`CHECK`). Las cuentas anteriores y las creadas sin
aceptación (scripts, fixtures) SHALL quedar con las tres en `NULL`, sin backfill. La exportación de datos SHALL incluirlas.
`TERMS_VERSION` SHALL ser la fecha de última actualización de `/terms`.

#### Scenario: Cuenta con email

- **WHEN** se crea una cuenta con el registro por email
- **THEN** `terms_accepted_via` es `checkbox`, `terms_version` es `TERMS_VERSION` y `terms_accepted_at` tiene fecha

#### Scenario: Cuenta nueva con Google

- **WHEN** el callback de Google crea una cuenta nueva
- **THEN** `terms_accepted_via` es `notice` con la versión vigente

#### Scenario: Cuenta sin aceptación

- **WHEN** una cuenta se crea sin pasar por el registro (script o fixture) o es anterior a la migración
- **THEN** las tres columnas son `NULL`

#### Scenario: Todo o nada en la base

- **WHEN** se intenta guardar una fecha de aceptación sin versión o con un modo distinto de `checkbox` y `notice`
- **THEN** el `CHECK` `chk_app_user_terms_acceptance` lo rechaza
