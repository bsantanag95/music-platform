# list-saves Specification

## Purpose

Guardar y seguir listas ajenas (Fase 5, cambio `rework-lists-section`). Guardar una lista es
un marcador privado por `(saver, list)` con un eje extra `following`. Incluye la superficie
"Guardadas" en `/me/lists` y la degradación de una lista guardada que dejó de ser visible. El
efecto de `following` sobre el feed de actividad se especifica aparte, en un cambio de
continuación sobre `activity-feed`.
## Requirements
### Requirement: Guardar y seguir una lista ajena
El sistema SHALL permitir a un usuario autenticado **guardar** una lista ajena que le sea
visible, y opcionalmente **seguirla**. Guardar es un marcador privado: solo el que guarda ve
que lo hizo. Seguir es un atributo del guardado (`following`) que el sistema SHALL persistir y
exponer; su efecto sobre el feed de actividad se especifica en un cambio de continuación sobre
`activity-feed`. Un usuario SHALL tener a lo sumo un guardado por lista; guardar una lista ya
guardada SHALL NOT duplicar el guardado y SHALL permitir ajustar `following`. Quitar un
guardado que no existe SHALL ser idempotente. Un usuario SHALL NOT poder guardar una lista
propia. Guardar o seguir una lista que no es visible para el usuario SHALL responder `404` con
`LIST_NOT_FOUND` sin revelar su existencia. Sin sesión, la operación SHALL responder `401` con
código `AUTH_REQUIRED`.

#### Scenario: Guardar una lista ajena visible
- **WHEN** un usuario autenticado guarda una lista ajena de audiencia `public` o `followers`
  que le es visible
- **THEN** el sistema crea el guardado y la lista aparece en su pestaña "Guardadas"

#### Scenario: Seguir al guardar
- **WHEN** el usuario guarda una lista marcando además "seguir"
- **THEN** el guardado queda con `following` verdadero

#### Scenario: Dejar de seguir sin dejar de guardar
- **WHEN** el usuario desactiva "seguir" sobre una lista guardada
- **THEN** la lista sigue en "Guardadas" con `following` en falso

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
ítems, carátulas disponibles, si la está siguiendo y, cuando la lista es de álbumes
(`entityType = 'release-group'`), si activó el tracking de su propio progreso sobre ella
(Requirement "Trackear el progreso propio sobre una lista ajena"). La superficie SHALL mostrar
solo los guardados del propio usuario y SHALL NOT ser accesible para terceros. El orden SHALL ser
por fecha de guardado, de la más reciente a la más antigua.

#### Scenario: Ver las listas guardadas
- **WHEN** un usuario con listas guardadas abre la pestaña "Guardadas"
- **THEN** ve sus listas guardadas paginadas, con dueño, conteo y estado de seguimiento

#### Scenario: Sin listas guardadas
- **WHEN** un usuario que no guardó ninguna lista abre "Guardadas"
- **THEN** ve un estado vacío localizado que explica cómo guardar listas, no un error técnico

#### Scenario: Paginación inválida
- **WHEN** se envía una paginación fuera de rango
- **THEN** la API responde `400` con código `VALIDATION_ERROR` y no ejecuta la lectura

#### Scenario: Estado de tracking visible en una lista de álbumes
- **WHEN** un usuario abre "Guardadas" y tiene activado el tracking de progreso sobre una de sus
  listas guardadas de álbumes
- **THEN** esa entrada indica que está trackeando su progreso, junto al resto de su información

#### Scenario: Sin indicador de tracking en listas de artistas o canciones
- **WHEN** un usuario ve en "Guardadas" una lista guardada de artistas o de canciones
- **THEN** esa entrada no ofrece ningún indicador ni control de tracking

### Requirement: Trackear el progreso propio sobre una lista ajena
El sistema SHALL permitir a un usuario autenticado activar, sobre una lista ajena visible de
álbumes (`entityType = 'release-group'`) que guardó, el tracking de su propio progreso de
escucha, como un eje del guardado independiente de `following` — activarlo o desactivarlo
SHALL NOT modificar el estado de `following`, y viceversa. La decisión de trackear SHALL
pertenecer exclusivamente a quien guarda la lista: el dueño de la lista original SHALL NOT poder
impedirlo, autorizarlo ni ser notificado de que ocurrió. Activar tracking sobre una lista que
el usuario todavía no había guardado SHALL crear el guardado y activar el tracking en una sola
operación. El progreso SHALL derivarse en el momento de la lectura, sin persistirse, cruzando los
álbumes de la lista contra el diario del propio usuario que trackea — mismo mecanismo que el
progreso de un Camino propio (capability `camino`), pero calculado sobre `(quien trackea, listId)`
en vez de `(dueño, listId)`. Intentar activar tracking sobre una lista de `entityType` distinto a
`release-group` SHALL responder `400` con `VALIDATION_ERROR`.

#### Scenario: Activar tracking sobre una lista ya guardada
- **WHEN** un usuario activa tracking sobre una lista de álbumes que ya tenía guardada
- **THEN** el sistema activa el tracking sin alterar el estado de `following` de ese guardado

#### Scenario: Activar tracking crea el guardado si no existía
- **WHEN** un usuario activa tracking sobre una lista de álbumes visible que todavía no había
  guardado
- **THEN** el sistema crea el guardado y activa el tracking en la misma operación

#### Scenario: Desactivar tracking sin dejar de guardar ni de seguir
- **WHEN** un usuario desactiva el tracking de una lista que sigue teniendo guardada
- **THEN** la lista permanece en "Guardadas" con su estado de `following` sin cambios

#### Scenario: El dueño de la lista no puede impedir el tracking
- **WHEN** un usuario activa tracking sobre la lista pública de otro usuario
- **THEN** la operación se completa sin ninguna acción ni notificación por parte del dueño de la
  lista

#### Scenario: Progreso calculado sobre quien trackea, no sobre el dueño
- **WHEN** dos usuarios distintos activan tracking sobre la misma lista ajena y cada uno tiene
  escuchas distintas registradas en su propio diario
- **THEN** cada uno ve un progreso distinto, calculado contra su propio diario

#### Scenario: Tracking sobre una lista de artistas o canciones
- **WHEN** un usuario intenta activar tracking sobre una lista guardada de artistas o de
  canciones
- **THEN** la API responde `400` con `VALIDATION_ERROR` y no activa ningún tracking

#### Scenario: Quitar el guardado quita el tracking
- **WHEN** un usuario quita de "Guardadas" una lista sobre la que tenía tracking activo
- **THEN** el guardado y su tracking se eliminan juntos, sin error

#### Scenario: Tracking sobre una lista no visible
- **WHEN** un usuario intenta activar tracking sobre una lista que no le es visible
- **THEN** la API responde `404` con `LIST_NOT_FOUND`, igual que al intentar guardarla

#### Scenario: Sesión requerida
- **WHEN** una request sin sesión intenta activar o desactivar tracking
- **THEN** la API responde `401` con código `AUTH_REQUIRED`

### Requirement: Degradación de una lista guardada que dejó de ser visible
El sistema SHALL conservar el registro de guardado aunque la lista guardada deje de ser
visible para quien la guardó (el dueño la pasó a `private`, cambió la relación de seguimiento,
apareció un bloqueo, o la lista fue borrada). En "Guardadas", una lista que ya no es visible
SHALL mostrarse como "ya no disponible" —sin filtrarse de forma silenciosa— y SHALL ofrecer
quitarla del listado. El detalle de una lista guardada no visible SHALL responder `404` con
`LIST_NOT_FOUND`.

#### Scenario: Lista guardada que pasó a privada
- **WHEN** el dueño de una lista guardada por el usuario la cambia a audiencia `private`
- **THEN** en "Guardadas" esa lista se muestra como "ya no disponible" con la opción de
  quitarla, y su detalle responde `404`

#### Scenario: Lista guardada borrada por su dueño
- **WHEN** el dueño borra una lista que otro usuario tenía guardada
- **THEN** el guardado se elimina en cascada y la lista desaparece de "Guardadas"

#### Scenario: Bloqueo posterior al guardado
- **WHEN** aparece un bloqueo en cualquier dirección entre el que guardó y el dueño de la
  lista
- **THEN** la lista se muestra como "ya no disponible" en "Guardadas"

#### Scenario: Quitar una lista "ya no disponible"
- **WHEN** el usuario quita de "Guardadas" una lista marcada como "ya no disponible"
- **THEN** el guardado se elimina sin error

### Requirement: Conteo agregado de guardados como dato público

El sistema SHALL exponer el **número total de guardados** de una lista de audiencia `public`
como dato público, legible con y sin sesión. Este conteo SHALL mostrarse en las tarjetas de
lista de la superficie `/lists` y en el encabezado de detalle de una lista pública. El
sistema SHALL NOT exponer la identidad de quienes guardaron una lista: el registro
individual de guardado sigue siendo un marcador privado por `(saver, list)`. El sistema
SHALL NOT exponer el conteo de guardados de listas de audiencia `followers` o `private` a
nadie salvo su dueño. La ordenación de la sección "Populares" de `/lists` por este conteo
SHALL presentarse como vitrina —"N guardados" en la tarjeta— y SHALL NOT incluir posiciones
numeradas ni distintivos de "top".

#### Scenario: Conteo visible en una lista pública

- **WHEN** una persona (con o sin sesión) abre `/lists` o el detalle de una lista de
  audiencia `public` que otras personas guardaron
- **THEN** ve el número total de guardados de esa lista, sin ver quiénes la guardaron

#### Scenario: Conteo oculto en listas no públicas

- **WHEN** una lista es de audiencia `followers` o `private`
- **THEN** su conteo de guardados no se muestra a otros usuarios, ni siquiera a sus
  seguidores

#### Scenario: "Populares" es una vitrina, no un ranking

- **WHEN** la sección "Populares" de `/lists` ordena listas por su conteo de guardados
- **THEN** cada tarjeta muestra "N guardados" sin número de posición ni distintivo de "top",
  y solo se listan listas con al menos un guardado

#### Scenario: La identidad de quien guarda sigue privada

- **WHEN** un usuario guarda una lista ajena
- **THEN** el conteo total de esa lista aumenta para todos, pero ningún tercero puede saber
  que fue esa persona quien la guardó

