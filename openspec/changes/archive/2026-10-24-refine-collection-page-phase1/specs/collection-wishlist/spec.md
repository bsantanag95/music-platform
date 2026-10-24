## MODIFIED Requirements

### Requirement: Formato y atributos de la entrada de deseo
El sistema SHALL permitir que el formato de una entrada de deseo sea uno de `vinyl`, `cd`,
`cassette`, `other`, o esté ausente. El sistema SHALL rechazar cualquier valor de formato fuera
de ese conjunto cerrado. El sistema SHALL permitir asociar cero o más atributos del mismo
vocabulario cerrado usado por la colección física (`src/services/collection/vocabulary.ts`), y
SHALL rechazar valores fuera de ese vocabulario e ignorar duplicados dentro de la misma entrada.

Con un formato distinto de `vinyl`, el sistema SHALL rechazar los atributos exclusivos de vinilo
(`colored-vinyl`, `picture-disc`, `180g`, `gatefold`); sin formato los admite todos. Cuando una
edición cambia solo el formato a uno que no es vinilo, el sistema SHALL quitar esos atributos.

#### Scenario: Formato válido
- **WHEN** el usuario agrega una entrada de deseo con formato `vinyl`
- **THEN** la entrada se crea con ese formato

#### Scenario: Formato fuera del conjunto
- **WHEN** el usuario agrega una entrada de deseo con un formato que no pertenece al conjunto
  cerrado
- **THEN** la API responde `400` con código `VALIDATION_ERROR` y no crea la entrada

#### Scenario: Atributos válidos
- **WHEN** el usuario agrega una entrada de deseo con atributos `limited-edition` y
  `colored-vinyl`
- **THEN** la entrada se crea con esos dos atributos

#### Scenario: Atributo fuera del vocabulario
- **WHEN** el usuario agrega una entrada de deseo con un atributo que no pertenece al vocabulario
  cerrado
- **THEN** la API responde `400` con código `VALIDATION_ERROR` y no crea la entrada

#### Scenario: Atributos duplicados
- **WHEN** el usuario envía el mismo atributo dos veces en una variante
- **THEN** la entrada se guarda con ese atributo una sola vez

#### Scenario: Atributo de vinilo con otro formato
- **WHEN** el usuario agrega una entrada de deseo con formato `cassette` y el atributo `180g`
- **THEN** la API responde `400` con código `VALIDATION_ERROR` y no crea ninguna variante del lote

#### Scenario: Atributo de vinilo sin formato
- **WHEN** el usuario agrega una entrada de deseo sin formato y con el atributo `colored-vinyl`
- **THEN** la entrada se crea con ese atributo

### Requirement: Editar y quitar una entrada de deseo propia
El sistema SHALL permitir al dueño de una entrada de deseo editar su formato, sus atributos y su
nota desde el listado propio (pestaña "Quiero" de `/me/collection`), y eliminarla por su
identificador desde la página de álbum y desde ese mismo listado. La edición SHALL aceptar
`format: null` para volver a "cualquier formato". Editar o quitar una entrada que no existe o que
no pertenece al usuario SHALL responder `404` sin revelar su existencia. Tras quitar desde el
listado propio, la superficie SHALL ofrecer "Deshacer" durante unos segundos, que vuelve a crear
la variante con el mismo álbum, formato, atributos, nota y audiencia; si quitar falla, el error
SHALL mostrarse junto a esa entrada.

#### Scenario: Editar el formato y los atributos de una entrada propia
- **WHEN** el dueño de una entrada de deseo cambia su formato y sus atributos desde la pestaña
  "Quiero"
- **THEN** la entrada queda actualizada con los nuevos valores y la superficie refleja el cambio

#### Scenario: Volver una entrada a "cualquier formato"
- **WHEN** el dueño edita una entrada que tenía un formato específico y elige "Cualquier formato"
- **THEN** la entrada queda sin formato

#### Scenario: Editar una entrada ajena o inexistente
- **WHEN** un usuario intenta editar una entrada de deseo que no es suya o no existe
- **THEN** la API responde `404` con código `WANTED_ENTRY_NOT_FOUND` y no modifica nada

#### Scenario: Quitar una entrada de deseo propia
- **WHEN** el dueño elimina una entrada de deseo propia por su identificador
- **THEN** la entrada se elimina y desaparece de su wishlist

#### Scenario: Quitar una entrada ajena o inexistente
- **WHEN** un usuario intenta eliminar una entrada de deseo que no es suya o no existe
- **THEN** la API responde `404` con código `WANTED_ENTRY_NOT_FOUND` y no elimina nada

#### Scenario: Sesión requerida para editar o quitar
- **WHEN** una request sin sesión intenta editar o quitar una entrada de deseo
- **THEN** la API responde `401` con código `AUTH_REQUIRED`

#### Scenario: Deshacer un quitado en la pestaña Busco
- **WHEN** el dueño quita una variante desde la pestaña Busco y pulsa "Deshacer"
- **THEN** la variante vuelve con el mismo álbum, formato, atributos, nota y audiencia
