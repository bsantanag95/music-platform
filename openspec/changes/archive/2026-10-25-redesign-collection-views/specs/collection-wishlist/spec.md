## MODIFIED Requirements

### Requirement: Editar y quitar una entrada de deseo propia
El sistema SHALL permitir al dueño de una entrada de deseo editar su formato, sus atributos y su
nota desde el listado propio (pestaña "Quiero" de `/me/collection`), y eliminarla por su
identificador desde la página de álbum y desde ese mismo listado. En el listado propio, cada
entrada SHALL ofrecer el mismo menú `⋯` que la pestaña Tengo ("Editar…", audiencias y
"Quitar"), y la edición SHALL abrirse en la misma hoja lateral. La edición SHALL aceptar
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

## ADDED Requirements

### Requirement: Pasar una variante a la colección ("Lo conseguí")
En la pestaña Busco, el dueño SHALL poder indicar que consiguió una variante. Esta acción
explícita SHALL crear una copia en la colección con el formato, los atributos que apliquen a ese
formato y la nota de la variante —con la audiencia por defecto del dueño para la colección— y
SHALL quitar la variante de la búsqueda. Si la variante no tiene formato, la superficie SHALL
pedir el formato antes de crear la copia. Si la variante no se puede quitar, la copia recién
creada SHALL borrarse y la superficie SHALL avisar. La superficie SHALL ofrecer "Deshacer", que
quita la copia y vuelve a crear la variante. Fuera de esta acción, la colección y la búsqueda
siguen siendo señales independientes.

#### Scenario: Conseguir una variante con formato
- **WHEN** el dueño pulsa "Lo conseguí" en una variante en vinilo con "Edición limitada"
- **THEN** su colección suma una copia en vinilo con "Edición limitada" y la variante deja la
  búsqueda

#### Scenario: Conseguir una variante sin formato
- **WHEN** el dueño pulsa "Lo conseguí" en una variante en "cualquier formato"
- **THEN** la fila le pide elegir vinilo, CD, cassette u otro y, al elegir, crea la copia en ese
  formato

#### Scenario: Falla al quitar la variante
- **WHEN** la copia se crea pero la variante no se puede quitar
- **THEN** la copia recién creada se borra, la variante sigue en la búsqueda y la fila avisa del
  error

#### Scenario: Deshacer "Lo conseguí"
- **WHEN** el dueño pulsa "Deshacer" tras "Lo conseguí"
- **THEN** la copia deja la colección y la variante vuelve a la búsqueda

### Requirement: Copias que ya se tienen
El listado propio de la wishlist SHALL indicar, por entrada, las copias del mismo álbum que el
dueño ya tiene en su colección (formato y atributos), y la pestaña Busco SHALL mostrarlo como
"Ya tienes" junto a la entrada.

#### Scenario: Álbum ya en la colección
- **WHEN** el dueño busca otra edición de un álbum que ya tiene en CD remasterizado
- **THEN** la entrada de Busco dice "Ya tienes: CD · Remasterizada"

#### Scenario: Álbum que no se tiene
- **WHEN** el dueño busca un álbum que no está en su colección
- **THEN** la entrada no muestra "Ya tienes"
