## MODIFIED Requirements

### Requirement: El onboarding se muestra una sola vez

Cada usuario SHALL tener una marca `onboarded_at` (fecha, o nula si está pendiente). Al
**completar o saltar** el flujo de `/welcome`, el sistema SHALL fijar `onboarded_at`.
Mientras `onboarded_at` sea nula, la redirección posterior al alta SHALL llevar a
`/welcome`, salvo que la persona llegue con una intención de Lámina o de discografía (ver `top-laminas` y
`discography-laminas`): en ese caso SHALL ir a su destino y `onboarded_at` SHALL seguir nula, de modo que Inicio siga ofreciendo la
bienvenida. Una vez fijada, `/welcome` SHALL redirigir a Inicio y el alta ya no SHALL
desviar hacia el onboarding. Los usuarios que ya existían cuando se introduce esta
capacidad SHALL considerarse onboardeados (no ven `/welcome`).

#### Scenario: Segunda visita a la bienvenida

- **WHEN** un usuario que ya completó o saltó el onboarding abre `/welcome`
- **THEN** es redirigido a Inicio, sin rehacer el flujo

#### Scenario: Redirección tras registrarse

- **WHEN** un usuario se registra (formulario local o Google) sin intención de Lámina y su `onboarded_at` es nula
- **THEN** aterriza en `/welcome`, no en Inicio

#### Scenario: Registro desde una Lámina

- **WHEN** un usuario se registra con una intención de Lámina
- **THEN** aterriza en `/me/laminas?desde=<id>`, su `onboarded_at` sigue nula e Inicio le ofrece la bienvenida

#### Scenario: Usuario preexistente

- **WHEN** un usuario creado antes de esta capacidad inicia sesión
- **THEN** no es enviado a `/welcome` en ningún momento

#### Scenario: Registro desde una discografía

- **WHEN** un usuario se registra con una intención de discografía
- **THEN** aterriza en su discografía de ese artista, en el modo para valorar, y su `onboarded_at` sigue nula
