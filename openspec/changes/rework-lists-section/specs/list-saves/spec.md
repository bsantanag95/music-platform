## ADDED Requirements

### Requirement: Guardar y seguir una lista ajena
El sistema SHALL permitir a un usuario autenticado **guardar** una lista ajena que le sea
visible, y opcionalmente **seguirla**. Guardar es un marcador privado: solo el que guarda ve
que lo hizo. Seguir es un atributo del guardado (`following`) que además habilita que las
actualizaciones de metadatos de esa lista aparezcan en el feed de quien la sigue (ver
capacidad `activity-feed`). Un usuario SHALL tener a lo sumo un guardado por lista; guardar
una lista ya guardada SHALL NOT duplicar el guardado y SHALL permitir ajustar `following`.
Quitar un guardado que no existe SHALL ser idempotente. Un usuario SHALL NOT poder guardar una
lista propia. Guardar o seguir una lista que no es visible para el usuario SHALL responder
`404` con `LIST_NOT_FOUND` sin revelar su existencia. Sin sesión, la operación SHALL responder
`401` con código `AUTH_REQUIRED`.

#### Scenario: Guardar una lista ajena visible
- **WHEN** un usuario autenticado guarda una lista ajena de audiencia `public` o `followers`
  que le es visible
- **THEN** el sistema crea el guardado y la lista aparece en su pestaña "Guardadas"

#### Scenario: Seguir al guardar
- **WHEN** el usuario guarda una lista marcando además "seguir"
- **THEN** el guardado queda con `following` verdadero y las actualizaciones de esa lista
  entran en su feed

#### Scenario: Dejar de seguir sin dejar de guardar
- **WHEN** el usuario desactiva "seguir" sobre una lista guardada
- **THEN** la lista sigue en "Guardadas" pero sus actualizaciones dejan de entrar en el feed

#### Scenario: Guardar una lista ya guardada
- **WHEN** el usuario guarda una lista que ya tenía guardada
- **THEN** la operación es idempotente, no crea un duplicado y aplica el `following` indicado

#### Scenario: Quitar un guardado
- **WHEN** el usuario quita de "Guardadas" una lista que tenía guardada
- **THEN** el guardado se elimina y la lista desaparece de esa pestaña

#### Scenario: Quitar un guardado inexistente
- **WHEN** el usuario quita un guardado de una lista que no tenía guardada
- **THEN** la operación es idempotente y no produce error

#### Scenario: Guardar una lista propia
- **WHEN** el usuario intenta guardar una de sus propias listas
- **THEN** la API responde un error de validación y no crea ningún guardado

#### Scenario: Guardar una lista no visible
- **WHEN** el usuario intenta guardar una lista que no le es visible (privada, bloqueo o
  perfil privado sin relación aceptada)
- **THEN** la API responde `404` con `LIST_NOT_FOUND` sin revelar si la lista existe

#### Scenario: Sesión requerida
- **WHEN** una request sin sesión intenta guardar o seguir una lista
- **THEN** la API responde `401` con código `AUTH_REQUIRED`

### Requirement: Superficie "Guardadas"
El sistema SHALL exponer al usuario autenticado la lista paginada de las listas que guardó,
mostrando por cada una su título, dueño (con enlace al perfil), tipo de entidad, conteo de
ítems, carátulas disponibles y si la está siguiendo. La superficie SHALL mostrar solo los
guardados del propio usuario y SHALL NOT ser accesible para terceros. El orden SHALL ser por
fecha de guardado, de la más reciente a la más antigua.

#### Scenario: Ver las listas guardadas
- **WHEN** un usuario con listas guardadas abre la pestaña "Guardadas"
- **THEN** ve sus listas guardadas paginadas, con dueño, conteo y estado de seguimiento

#### Scenario: Sin listas guardadas
- **WHEN** un usuario que no guardó ninguna lista abre "Guardadas"
- **THEN** ve un estado vacío localizado que explica cómo guardar listas, no un error técnico

#### Scenario: Paginación inválida
- **WHEN** se envía una paginación fuera de rango
- **THEN** la API responde `400` con código `VALIDATION_ERROR` y no ejecuta la lectura

### Requirement: Degradación de una lista guardada que dejó de ser visible
El sistema SHALL conservar el registro de guardado aunque la lista guardada deje de ser
visible para quien la guardó (el dueño la pasó a `private`, cambió la relación de seguimiento,
apareció un bloqueo, o la lista fue borrada). En "Guardadas", una lista que ya no es visible
SHALL mostrarse como "ya no disponible" —sin filtrarse de forma silenciosa— y SHALL ofrecer
quitarla del listado. El detalle de una lista guardada no visible SHALL responder `404` con
`LIST_NOT_FOUND`. Una lista guardada no visible SHALL NOT generar entradas de feed.

#### Scenario: Lista guardada que pasó a privada
- **WHEN** el dueño de una lista guardada por el usuario la cambia a audiencia `private`
- **THEN** en "Guardadas" esa lista se muestra como "ya no disponible" con la opción de
  quitarla, y no aparece su detalle ni sus actualizaciones en el feed

#### Scenario: Lista guardada borrada por su dueño
- **WHEN** el dueño borra una lista que otro usuario tenía guardada
- **THEN** el guardado se elimina en cascada y la lista desaparece de "Guardadas"

#### Scenario: Bloqueo posterior al guardado
- **WHEN** aparece un bloqueo en cualquier dirección entre el que guardó y el dueño de la
  lista
- **THEN** la lista se muestra como "ya no disponible" en "Guardadas" y no genera feed

#### Scenario: Quitar una lista "ya no disponible"
- **WHEN** el usuario quita de "Guardadas" una lista marcada como "ya no disponible"
- **THEN** el guardado se elimina sin error
