## MODIFIED Requirements

### Requirement: Atributos de edición
El sistema SHALL permitir asociar a cada entrada cero o más atributos de un **vocabulario
cerrado y curado** que describe cualidades de la edición o de la copia (por ejemplo
`limited-edition`, `numbered`, `first-press`, `reissue`, `remaster`, `anniversary-edition`,
`deluxe-edition`, `colored-vinyl`, `picture-disc`, `180g`, `gatefold`, `box-set`,
`regional-edition`, `bonus-tracks`, `extra-disc`, `signed`, `promo`). Los atributos son
descriptores, no afirmaciones de identidad de catálogo. El sistema SHALL rechazar valores
fuera del vocabulario y SHALL ignorar duplicados dentro de la misma entrada.

Los atributos de soporte exclusivos de vinilo (`colored-vinyl`, `picture-disc`, `180g`,
`gatefold`) SHALL ir solo con el formato `vinyl`. El sistema SHALL rechazar un alta o una
edición que combine uno de ellos con otro formato. Cuando una edición cambia solo el formato a
uno que no es vinilo, el sistema SHALL quitar esos atributos de la entrada. Al editar una
entrada heredada que ya tiene la combinación incoherente, el formulario SHALL avisar qué
atributo no aplica al formato y SHALL quitarlo al guardar.

#### Scenario: Entrada sin atributos
- **WHEN** el usuario agrega una entrada sin atributos
- **THEN** la entrada se crea con una lista de atributos vacía

#### Scenario: Atributos válidos
- **WHEN** el usuario agrega una entrada con atributos `limited-edition` y `colored-vinyl`
- **THEN** la entrada se crea con esos dos atributos

#### Scenario: Atributo fuera del vocabulario
- **WHEN** el usuario agrega una entrada con un atributo que no pertenece al vocabulario cerrado
- **THEN** la API responde `400` con código `VALIDATION_ERROR` y no crea la entrada

#### Scenario: Atributos duplicados
- **WHEN** el usuario envía el mismo atributo dos veces en una entrada
- **THEN** la entrada se guarda con ese atributo una sola vez

#### Scenario: Atributo de vinilo con otro formato
- **WHEN** el usuario agrega o edita una entrada con formato `cd` y el atributo `colored-vinyl`
- **THEN** la API responde `400` con código `VALIDATION_ERROR` y no guarda el cambio

#### Scenario: Cambiar solo el formato
- **WHEN** el dueño cambia a `cd` el formato de una entrada en vinilo con `colored-vinyl` y
  `limited-edition`, sin enviar atributos
- **THEN** la entrada queda en `cd` con `limited-edition` y sin `colored-vinyl`

#### Scenario: Editar una entrada heredada incoherente
- **WHEN** el dueño abre la edición de una entrada en `cd` que tiene `colored-vinyl`
- **THEN** el formulario avisa que "Vinilo de color" no aplica a CD y, al guardar, la entrada
  queda sin ese atributo

### Requirement: Editar y quitar una entrada propia
El sistema SHALL permitir al dueño de una entrada editar su formato, atributos, nota y
audiencia, y eliminarla por su identificador, **desde la superficie `/me/collection`** además de
desde la página del álbum. La edición desde la estantería SHALL usar el mismo formulario de
formato/atributos/nota que el alta y SHALL reflejar el cambio de forma optimista, revirtiendo si
la API falla. Quitar una entrada que no existe o que no pertenece al usuario SHALL responder
`404` sin revelar su existencia.

En `/me/collection`, "Quitar" SHALL estar disponible en los tres modos de visualización. Tras
quitar, la superficie SHALL ofrecer "Deshacer" durante unos segundos, que vuelve a crear la copia
con el mismo álbum, formato, atributos, nota y audiencia. El quitado SHALL anunciarse a lectores
de pantalla y, si falla, el error SHALL mostrarse junto a esa entrada.

#### Scenario: Editar una entrada propia desde la estantería
- **WHEN** el dueño abre el panel de edición de una entrada en `/me/collection` y cambia su
  formato o sus atributos
- **THEN** la entrada queda actualizada, la superficie refleja el cambio de inmediato y, si la
  API falla, la ficha vuelve a su estado anterior con un aviso de error

#### Scenario: Cambiar la audiencia de una entrada desde la ficha
- **WHEN** el dueño cambia la audiencia de una entrada con el selector rápido de su ficha
- **THEN** la entrada queda con la audiencia elegida sin necesidad de abrir el panel de edición

#### Scenario: Quitar una entrada propia
- **WHEN** el dueño elimina una entrada propia por su identificador
- **THEN** la entrada se elimina y desaparece de la colección

#### Scenario: Quitar una entrada ajena o inexistente
- **WHEN** un usuario intenta eliminar una entrada que no es suya o no existe
- **THEN** la API responde `404` con código `COLLECTION_ENTRY_NOT_FOUND` y no elimina nada

#### Scenario: Sesión requerida para editar
- **WHEN** una request sin sesión intenta editar o eliminar una entrada
- **THEN** la API responde `401` con código `AUTH_REQUIRED`

#### Scenario: Quitar desde la Estantería
- **WHEN** el dueño mira su colección en modo Estantería
- **THEN** cada ficha ofrece "Quitar" además de "Editar"

#### Scenario: Deshacer un quitado
- **WHEN** el dueño quita una copia y pulsa "Deshacer" en el aviso
- **THEN** la copia vuelve a la colección con el mismo álbum, formato, atributos, nota y audiencia

#### Scenario: Falla al quitar
- **WHEN** la API falla al quitar una copia
- **THEN** la copia vuelve a su lugar y el error aparece junto a ella

### Requirement: Modos de visualización de la colección
El sistema SHALL presentar la colección —propia y en la vista de perfil— en tres modos de
visualización a elegir por el visitante:

- **Estantería**: cuadrícula de carátulas cuadradas donde predomina lo visual, con el título, el
  artista y el formato al pie de cada ficha.
- **Lista detallada**: fila con carátula, título, artista, formato, atributos, nota, audiencia y
  fecha. Cuando la colección se agrupa por artista, la fila SHALL NOT repetir el artista del
  encabezado.
- **Índice**: fila compacta con posición, título, artista y formato, con los controles visibles
  en la misma fila (en una segunda línea en pantallas angostas), sin reservar espacio oculto.

La preferencia de modo SHALL guardarse **local por visitante** (no en servidor) y SHALL ser
**global** a la colección (no una preferencia por página ni por usuario mirado). El modo por
defecto SHALL ser **Estantería**. Un valor de preferencia inválido o ausente SHALL caer al modo
por defecto sin error. El modo SHALL NOT viajar en la URL ni alterar la consulta de datos.
Hasta leer la preferencia guardada, la superficie SHALL mostrar un marcador neutro en lugar de
pintar un modo y saltar a otro. Cuando una entrada no tiene carátula resuelta, cualquier modo
SHALL usar la silueta de disco del sistema en lugar de un recuadro vacío.

#### Scenario: Elegir un modo de visualización
- **WHEN** el visitante cambia de "Estantería" a "Índice"
- **THEN** la colección se re-renderiza en ese modo y la preferencia queda guardada localmente

#### Scenario: La preferencia persiste entre páginas y recargas
- **WHEN** el visitante que eligió "Lista detallada" recarga o navega a la colección de otra
  persona
- **THEN** la colección se muestra en "Lista detallada" sin volver a pedirle la elección

#### Scenario: Preferencia inicial o corrupta
- **WHEN** el visitante no tiene preferencia guardada, o el valor guardado no es un modo válido
- **THEN** la colección se muestra en "Estantería" sin error

#### Scenario: Entrada sin carátula
- **WHEN** una entrada apunta a un álbum sin carátula resuelta
- **THEN** su ficha muestra la silueta de disco del sistema en cualquiera de los tres modos

#### Scenario: Sin salto de modo al cargar
- **WHEN** el visitante que eligió "Índice" abre la colección
- **THEN** ve un marcador neutro hasta que se lee su preferencia y luego el Índice, sin pintar
  antes la Estantería

## ADDED Requirements

### Requirement: Página de la colección propia
La página `/me/collection` SHALL usar el mismo ancho y encabezado alineado a la izquierda que las
demás páginas propias de biblioteca. Los filtros activos de cada pestaña (pestaña, búsqueda,
formato, atributo, orden y agrupación) SHALL escribirse en la URL cuando difieren del valor por
defecto, sin recargar la página, de modo que una recarga o un enlace copiado muestren la misma
selección. Con puntero grueso, los controles de cada entrada, las pestañas, el conmutador de modo
y la barra de selección SHALL medir al menos 44 px de alto. En modo selección, tocar la ficha de
una copia SHALL marcarla o desmarcarla (sin abrir el álbum) y la copia marcada SHALL distinguirse
visualmente.

#### Scenario: Filtros en la URL
- **WHEN** el dueño filtra por `vinyl` y busca "dokken"
- **THEN** la URL pasa a incluir `format=vinyl&q=dokken` y, al recargar, ve la misma selección

#### Scenario: Valores por defecto fuera de la URL
- **WHEN** el dueño limpia los filtros
- **THEN** la URL queda en `/me/collection` sin parámetros

#### Scenario: Marcar tocando la ficha
- **WHEN** el dueño está en modo selección y toca la carátula de una copia
- **THEN** la copia queda marcada y resaltada, y la página no navega al álbum
