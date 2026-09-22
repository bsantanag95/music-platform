## MODIFIED Requirements

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

## ADDED Requirements

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
