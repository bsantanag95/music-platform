# collection-wishlist

## Purpose

La wishlist privada del usuario: los álbumes que querría conseguir, en una o varias variantes de formato y edición a la vez, con nota libre. Convive con la colección poseída (`physical-collection`) sin competir ni bloquearla. Cubre el alta (desde la página del álbum y desde el menú rápido), la edición y baja de entradas, el listado propio y la independencia entre "la tengo" y "la quiero".
## Requirements
### Requirement: Agregar una o varias entradas de deseo
El sistema SHALL permitir a un usuario autenticado agregar a su wishlist una o varias entradas
de deseo sobre un álbum (`release_group`) válido en una sola operación (entre 1 y 10 variantes
por operación). Cada variante SHALL registrar un formato opcional (ausente significa "cualquier
formato"), cero o más atributos de edición y una nota libre opcional. La operación SHALL crear
siempre entradas nuevas: no es un toggle idempotente. Si cualquiera de las variantes del lote
falla su validación, el sistema SHALL NOT crear ninguna de las entradas del lote.

#### Scenario: Agregar una sola variante deseada
- **WHEN** un usuario autenticado agrega a su wishlist un álbum válido indicando un formato
- **THEN** el sistema crea una entrada nueva y la refleja en su listado propio

#### Scenario: Agregar varias variantes en una operación
- **WHEN** un usuario autenticado agrega a su wishlist el mismo álbum con dos variantes —por
  ejemplo vinilo con atributo `deluxe-edition` y CD con atributo `remaster`— en una sola
  operación
- **THEN** el sistema crea dos entradas independientes para ese álbum

#### Scenario: Variante sin formato específico
- **WHEN** un usuario autenticado agrega una variante sin indicar formato
- **THEN** la entrada se crea sin formato, representando "cualquier formato"

#### Scenario: Una variante inválida invalida todo el lote
- **WHEN** el lote incluye una variante con un atributo fuera del vocabulario cerrado junto a
  otras variantes válidas
- **THEN** la API responde `400` con código `VALIDATION_ERROR` y no crea ninguna entrada del lote

#### Scenario: Álbum inexistente
- **WHEN** el usuario intenta agregar entradas de deseo cuyo `releaseGroupId` no existe
- **THEN** la API responde `404` con código `ALBUM_NOT_FOUND` y no crea ninguna entrada

#### Scenario: Objetivo que no es un álbum
- **WHEN** la request apunta a un id que no corresponde a un `release_group`
- **THEN** la API responde `400` con código `VALIDATION_ERROR` y no crea ninguna entrada

#### Scenario: Lote fuera de rango
- **WHEN** el lote llega vacío o con más de 10 variantes
- **THEN** la API responde `400` con código `VALIDATION_ERROR` y no crea ninguna entrada

#### Scenario: Sesión requerida
- **WHEN** una request sin sesión intenta agregar una entrada de deseo
- **THEN** la API responde `401` con código `AUTH_REQUIRED` y no modifica ninguna wishlist

### Requirement: Formato y atributos de la entrada de deseo
El sistema SHALL permitir que el formato de una entrada de deseo sea uno de `vinyl`, `cd`,
`cassette`, `other`, o esté ausente. El sistema SHALL rechazar cualquier valor de formato fuera
de ese conjunto cerrado. El sistema SHALL permitir asociar cero o más atributos del mismo
vocabulario cerrado usado por la colección física (`src/services/collection/vocabulary.ts`), y
SHALL rechazar valores fuera de ese vocabulario e ignorar duplicados dentro de la misma entrada.

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

### Requirement: Nota libre de la entrada de deseo
El sistema SHALL permitir una nota libre opcional por entrada de deseo, de hasta 140 caracteres.
El sistema SHALL NOT interpretar, validar contra catálogo ni sugerir contenido para la nota.

#### Scenario: Nota dentro del límite
- **WHEN** el usuario agrega una entrada de deseo con una nota de 140 caracteres o menos
- **THEN** la entrada se crea con esa nota

#### Scenario: Nota que excede el límite
- **WHEN** el usuario agrega una entrada de deseo con una nota de más de 140 caracteres
- **THEN** la API responde `400` con código `VALIDATION_ERROR` y no crea la entrada

### Requirement: Alta rápida desde el menú de álbum
El sistema SHALL ofrecer, en el menú "···" de una ficha de álbum, una acción "Lo quiero" que crea
una entrada de deseo sin formato ni atributos con una sola confirmación, sin abrir ningún
formulario.

#### Scenario: Alta rápida desde el menú de la ficha
- **WHEN** un usuario autenticado elige "Lo quiero" en el menú "···" de una ficha de álbum
- **THEN** el sistema crea una entrada de deseo sin formato para ese álbum y confirma la acción
  sin navegar fuera de la página actual

#### Scenario: Alta rápida sin sesión
- **WHEN** un visitante no autenticado elige "Lo quiero" en el menú "···" de una ficha de álbum
- **THEN** se le solicita iniciar sesión y no se crea ninguna entrada

### Requirement: Múltiples entradas de deseo por álbum
El sistema SHALL permitir a un usuario tener varias entradas de deseo para el mismo álbum, con
el mismo o distinto formato. El sistema SHALL NOT deduplicar ni bloquear una entrada nueva por
coincidir álbum y formato con otra existente de deseo.

#### Scenario: Mismo álbum en dos variantes
- **WHEN** el usuario agrega el mismo álbum como deseo en `vinyl` y luego en `cd`
- **THEN** la wishlist muestra dos entradas independientes para ese álbum

### Requirement: Independencia entre colección poseída y wishlist
El sistema SHALL tratar la colección física (`collection_entry`) y la wishlist (`wanted_entry`)
como señales independientes: tener un álbum en la colección SHALL NOT impedir agregarlo a la
wishlist, y tenerlo en la wishlist SHALL NOT impedir agregarlo a la colección. Ninguna de las dos
operaciones SHALL eliminar ni modificar entradas de la otra.

#### Scenario: Agregar a la wishlist un álbum que ya se tiene
- **WHEN** un usuario con una entrada de colección para un álbum agrega ese mismo álbum a su
  wishlist
- **THEN** la entrada de deseo se crea con normalidad y la entrada de colección existente queda
  intacta

#### Scenario: Agregar a la colección un álbum que ya se desea
- **WHEN** un usuario con una entrada de deseo para un álbum agrega ese mismo álbum a su
  colección
- **THEN** la entrada de colección se crea con normalidad y la entrada de deseo existente queda
  intacta

### Requirement: Editar y quitar una entrada de deseo propia
El sistema SHALL permitir al dueño de una entrada de deseo editar su formato, sus atributos y su
nota desde el listado propio (pestaña "Quiero" de `/me/collection`), y eliminarla por su
identificador desde la página de álbum y desde ese mismo listado. La edición SHALL aceptar
`format: null` para volver a "cualquier formato". Editar o quitar una entrada que no existe o que
no pertenece al usuario SHALL responder `404` sin revelar su existencia.

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

### Requirement: Listado propio de la wishlist
El sistema SHALL permitir al usuario autenticado ver su wishlist completa, paginada, ordenada por
recencia por defecto, mostrando por entrada el álbum (con su carátula cuando exista), su artista,
el formato (o "cualquier formato" cuando esté ausente), los atributos y la nota. El sistema SHALL
aceptar búsqueda por texto (`q`) sobre el título del álbum y el nombre del artista acreditado
(coincidencia parcial sin distinguir mayúsculas), y orden (`sort`) entre recencia (default) y
alfabético por título. La wishlist SHALL NOT tener ninguna vista pública ni de terceros: solo el
dueño puede listarla.

#### Scenario: Ver la wishlist propia
- **WHEN** un usuario autenticado abre la pestaña "Quiero" de su colección
- **THEN** ve sus entradas de deseo paginadas, con la carátula del álbum cuando está disponible

#### Scenario: Buscar por título de álbum
- **WHEN** el usuario busca un título en su wishlist
- **THEN** ve únicamente las entradas cuyo álbum coincide parcialmente con ese texto

#### Scenario: Wishlist vacía
- **WHEN** un usuario sin entradas de deseo abre la pestaña "Quiero"
- **THEN** ve un estado vacío localizado y no un error técnico

#### Scenario: Sesión requerida para listar
- **WHEN** una request sin sesión pide el listado propio de la wishlist
- **THEN** la API responde `401` con código `AUTH_REQUIRED`

#### Scenario: Sin superficie pública
- **WHEN** un visitante intenta consultar la wishlist de otro usuario por su `username`
- **THEN** el sistema no ofrece ninguna ruta ni endpoint para esa consulta

### Requirement: Rótulo "En tu búsqueda"

En toda la interfaz la wishlist física SHALL rotularse **"En tu búsqueda"** para el estado
propio y **"lo buscan"** para el agregado de la comunidad, y SHALL NOT usar el verbo
"querer" ("Lo quiero"), para no confundirse con la señal Pendiente (want-to-listen).

#### Scenario: Estado propio

- **WHEN** un usuario tiene un álbum en su wishlist y abre la página del álbum
- **THEN** el panel "Tu relación" muestra "En tu búsqueda"

### Requirement: Participación anónima en el conteo agregado

Las entradas de la wishlist SHALL contar, como personas distintas, en el conteo agregado
"lo buscan" del bloque de comunidad del álbum (capacidad `album-community-stats`), con el
umbral mínimo de esa capacidad. Ese conteo SHALL ser la única exposición de la wishlist
fuera de su listado propio y SHALL NOT revelar la identidad de ninguna persona.

#### Scenario: Wishlist privada en el total

- **WHEN** 12 personas tienen un álbum en su wishlist
- **THEN** el bloque de comunidad muestra "12 lo buscan" y ninguna superficie permite ver
  quiénes son

