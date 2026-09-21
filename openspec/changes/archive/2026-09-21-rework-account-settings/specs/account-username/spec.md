## ADDED Requirements

### Requirement: Cambiar el usuario propio

El sistema SHALL permitir a un usuario autenticado cambiar su `username` desde Cuenta y seguridad.
El nuevo usuario SHALL tener entre 3 y 32 caracteres y solo letras, números y guion bajo (las mismas
reglas del registro). El sistema SHALL rechazar el cambio, sin modificar nada, cuando el valor sea
inválido, cuando sea el usuario actual, o cuando no esté disponible. Un usuario está disponible
cuando ninguna otra cuenta lo usa, comparando sin distinguir mayúsculas de minúsculas, y ninguna otra
persona lo tiene reservado (ver "Reserva del usuario anterior"). El cambio SHALL reflejarse en el
enlace del perfil (`/users/{username}`) y en todo el sitio, y SHALL mantener la sesión iniciada.

#### Scenario: Cambio válido

- **WHEN** una persona con el usuario `besantanag95` cambia su usuario a `besan_music`
- **THEN** su perfil pasa a `/users/besan_music`, el sitio muestra `@besan_music` y su sesión sigue
  iniciada

#### Scenario: Usuario inválido

- **WHEN** la persona escribe `hola.mundo` o `ab`
- **THEN** la API responde con un error de validación localizado y el usuario no cambia

#### Scenario: Usuario en uso, sin distinguir mayúsculas

- **WHEN** existe la cuenta `Fran` y otra persona intenta cambiar su usuario a `fran`
- **THEN** la API rechaza el cambio con el código `USERNAME_TAKEN` y el usuario no cambia

#### Scenario: El mismo usuario

- **WHEN** la persona envía su usuario actual
- **THEN** la API rechaza el cambio con un error de validación y no registra el cambio

#### Scenario: Disponibilidad consultable antes de guardar

- **WHEN** el editor consulta si un usuario está disponible
- **THEN** recibe si es válido y si está disponible, sin exponer datos de la cuenta que lo usa

### Requirement: Un cambio de usuario cada 30 días

El sistema SHALL registrar la fecha del último cambio de usuario y SHALL rechazar un nuevo cambio
mientras no hayan pasado 30 días desde el anterior, con el código `USERNAME_CHANGE_COOLDOWN` y la
fecha en que vuelve a estar permitido. El primer cambio de una cuenta SHALL estar siempre permitido.
El registro y el alta con Google no cuentan como cambio.

#### Scenario: Primer cambio

- **WHEN** una cuenta que nunca cambió su usuario lo cambia
- **THEN** el cambio se aplica y queda registrada la fecha

#### Scenario: Cambio dentro del enfriamiento

- **WHEN** la persona intenta cambiar su usuario 10 días después de haberlo cambiado
- **THEN** la API rechaza el cambio con `USERNAME_CHANGE_COOLDOWN` e indica la fecha en que podrá
  volver a cambiarlo, y el usuario no cambia

#### Scenario: Cambio pasado el enfriamiento

- **WHEN** pasan 30 días desde el último cambio y la persona lo cambia de nuevo
- **THEN** el cambio se aplica

### Requirement: Reserva del usuario anterior

Al cambiar de usuario, el sistema SHALL reservar el usuario anterior para esa persona durante 30
días. Durante la reserva, nadie más SHALL poder registrarse, darse de alta con Google ni cambiar su
usuario a ese valor (sin distinguir mayúsculas), y la persona SHALL poder recuperarlo, cambio que
libera la reserva. Vencidos los 30 días, el usuario SHALL quedar disponible para cualquiera.

#### Scenario: Usuario reservado

- **WHEN** otra persona intenta registrarse con el usuario que alguien dejó hace 5 días
- **THEN** el registro se rechaza como usuario en uso

#### Scenario: Recuperar el usuario anterior

- **WHEN** la persona vuelve a su usuario anterior dentro de los 30 días y su enfriamiento lo permite
- **THEN** el cambio se aplica y la reserva se libera

#### Scenario: Reserva vencida

- **WHEN** pasan más de 30 días desde el cambio
- **THEN** otra persona puede registrarse con ese usuario

### Requirement: Redirección del enlace anterior

Mientras dure la reserva, cualquier página de perfil bajo `/users/{usuario-anterior}` (incluidas
`artists`, `collection`, `connections/*`, `diary`, `favorites`, `fingerprint` y `lists`) SHALL
redirigir de forma temporal a la misma ruta bajo el usuario nuevo. La API pública de perfil
(`GET /api/users/{username}`) SHALL NOT redirigir y SHALL responder como usuario inexistente. Una
vez vencida la reserva el enlace anterior SHALL responder como usuario inexistente.

#### Scenario: Enlace compartido antes del cambio

- **WHEN** alguien abre `/users/besantanag95/favorites` tres días después de que la persona pasara a
  `besan_music`
- **THEN** es dirigido a `/users/besan_music/favorites`

#### Scenario: Reserva vencida

- **WHEN** alguien abre el enlace anterior pasados los 30 días
- **THEN** ve la página de usuario no encontrado

#### Scenario: La API no redirige

- **WHEN** un cliente pide `GET /api/users/besantanag95` durante la reserva
- **THEN** recibe la respuesta de usuario no encontrado
