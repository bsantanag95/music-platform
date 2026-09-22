## ADDED Requirements

### Requirement: Crear un Camino dinámico
El sistema SHALL permitir a un usuario autenticado crear un Camino: un subtipo de lista
(`kind = 'custom_journey'`) de un solo tipo de entidad fijo, `release-group`, con título
obligatorio (≤100 caracteres) y descripción opcional (≤500), igual que una Lista. A diferencia de
un recorrido de artista, un Camino SHALL NOT asociarse a ningún artista ni pre-poblarse desde una
discografía: nace vacío y su contenido es exactamente lo que el propietario agregue con el
tiempo. Un usuario SHALL poder crear más de un Camino.

#### Scenario: Crear un Camino vacío
- **WHEN** un usuario autenticado crea un Camino con un título válido
- **THEN** el sistema lo crea sin ningún álbum, sin discografía de fondo asociada

#### Scenario: Crear varios Caminos
- **WHEN** un usuario ya tiene un Camino y crea otro
- **THEN** ambos coexisten de forma independiente

#### Scenario: Título fuera de rango
- **WHEN** un usuario intenta crear un Camino con un título vacío o de más de 100 caracteres
- **THEN** la API responde `400` con `VALIDATION_ERROR` y no crea el Camino

#### Scenario: Sesión requerida
- **WHEN** una request sin sesión intenta crear un Camino
- **THEN** la API responde `401` con código `AUTH_REQUIRED`

### Requirement: Agregar y quitar álbumes de un Camino propio
El sistema SHALL permitir al propietario agregar y quitar álbumes de su Camino en cualquier
momento, de forma idempotente: agregar un álbum ya presente SHALL NOT duplicarlo, y quitar uno
ausente SHALL NOT producir error. Los ítems SHALL mantener un orden manual, mismo mecanismo que
una Lista (`position`).

#### Scenario: Agregar un álbum nuevo
- **WHEN** el propietario agrega un álbum que no estaba en su Camino
- **THEN** el álbum aparece al final del Camino

#### Scenario: Agregar un álbum ya presente
- **WHEN** el propietario agrega un álbum que ya está en su Camino
- **THEN** la operación es idempotente y no crea un ítem duplicado

#### Scenario: Quitar un álbum presente
- **WHEN** el propietario quita un álbum de su Camino
- **THEN** el álbum desaparece del Camino y su progreso se recalcula

#### Scenario: Quitar un álbum ausente
- **WHEN** el propietario intenta quitar un álbum que no está en su Camino
- **THEN** la operación es idempotente y no produce error

#### Scenario: Agregar o quitar sobre un Camino ajeno
- **WHEN** una request intenta agregar o quitar un álbum de un Camino que no pertenece a quien la
  envía
- **THEN** la API responde `404` y no modifica el Camino

### Requirement: Progreso derivado de un Camino
El sistema SHALL derivar, en el momento de la lectura y sin persistirlo, el progreso de un Camino
propio como la proporción de sus álbumes con al menos una escucha propia registrada en el diario
— mismo mecanismo y las mismas reglas de estado que ya usa `artist-journey` (**completo** cuando
el Camino tiene al menos un álbum y todos tienen escucha registrada; **en curso** en cualquier
otro caso, incluida la selección vacía). El sistema SHALL NOT persistir un estado "pendiente"
separado.

#### Scenario: Camino con todos los álbumes escuchados
- **WHEN** el propietario tiene registrada una escucha de cada álbum de su Camino
- **THEN** el Camino se muestra en estado completo

#### Scenario: Agregar un álbum no escuchado a un Camino completo
- **WHEN** el propietario agrega a un Camino completo un álbum que no ha escuchado
- **THEN** el Camino pasa a mostrarse en curso

#### Scenario: Camino vacío
- **WHEN** un Camino no tiene ningún álbum
- **THEN** se muestra en curso, nunca completo

### Requirement: Vista de detalle de un Camino, con álbumes y artista acreditado

El sistema SHALL mostrar el detalle de un Camino (gestión propia en `/me/caminos/[id]` y lectura
trackeada en `/users/[username]/caminos/[id]`) con el mismo diseño de encabezado y lista de
álbumes que la página de gestión de un recorrido de artista (capability `artist-journey`) —
ambos tratan álbumes: carátula o disco de reemplazo, título, badge de estado, barra de progreso
informativa con fracción ("N de M escuchados"), orden (fecha de lanzamiento / alfabético) y modo
de visualización (Lista / Gráfico). A diferencia de un recorrido, cuyos álbumes son siempre del
mismo artista, un Camino puede mezclar álbumes de artistas distintos, así que cada fila SHALL
mostrar el artista acreditado del álbum junto a su título. El alta de álbumes SHALL seguir
ocurriendo fuera de esta vista, vía la acción contextual "Añadir a..." de cada álbum (Requirement
"Agregar y quitar álbumes de un Camino propio") — esta vista SHALL NOT ofrecer un editor de
selección embebido.

#### Scenario: Encabezado con carátula, estado y progreso

- **WHEN** un usuario abre el detalle de un Camino con al menos un álbum
- **THEN** ve la carátula del primer álbum (o un disco de reemplazo si no hay), el título, el
  badge de estado y una barra de progreso con su fracción

#### Scenario: Cada fila muestra el artista del álbum

- **WHEN** un Camino tiene álbumes de artistas distintos
- **THEN** cada fila de la lista muestra, junto al título del álbum, el nombre del artista
  acreditado

#### Scenario: Orden y modo de visualización

- **WHEN** un usuario cambia el orden o el modo de visualización de la lista de álbumes de un
  Camino
- **THEN** la lista se reordena o cambia de presentación sin recargar la página

#### Scenario: Gestión propia no ofrece un editor de selección embebido

- **WHEN** el propietario abre la gestión de su Camino
- **THEN** no encuentra ningún buscador de catálogo ni editor de selección en esa página — agregar
  álbumes sigue ocurriendo desde la acción contextual de cada álbum

### Requirement: Registrar y quitar una escucha desde el detalle de un Camino

El sistema SHALL permitir registrar o quitar una escucha de un álbum directamente desde la vista
de detalle de un Camino, sin salir de la página — mismo mecanismo que ya ofrece la vista de
selección de un recorrido de artista (capability `artist-journey`). En la gestión propia
(`/me/caminos/[id]`), el ✓ y la acción de registrar/quitar SHALL reflejar el diario del
propietario. En la lectura de un Camino ajeno (`/users/[username]/caminos/[id]`), esta acción
SHALL estar disponible únicamente mientras el visitante tiene activo el tracking de su propio
progreso sobre ese Camino (capability `list-saves`, Requirement "Trackear el progreso propio
sobre una lista ajena"), y SHALL reflejar el diario de quien trackea, nunca el del propietario del
Camino — dos personas distintas trackeando el mismo Camino SHALL ver marcas de escuchado
distintas entre sí. Sin tracking activo, la lista de álbumes SHALL mostrarse sin ningún ✓ ni
acción de escucha, en modo de solo exploración.

#### Scenario: Registrar una escucha desde la gestión propia

- **WHEN** el propietario registra la escucha de un álbum de su Camino desde esta vista
- **THEN** el álbum se marca como escuchado y el progreso del encabezado se actualiza, sin
  recargar la página

#### Scenario: Registrar una escucha desde un Camino trackeado

- **WHEN** un visitante con tracking activo sobre un Camino ajeno registra la escucha de uno de
  sus álbumes
- **THEN** su propio progreso de tracking se actualiza, sin afectar el progreso ni el diario del
  propietario del Camino

#### Scenario: Dos personas trackeando el mismo Camino ven marcas distintas

- **WHEN** dos usuarios distintos trackean el mismo Camino y cada uno registró escuchas distintas
  en su propio diario
- **THEN** cada uno ve, en la misma lista de álbumes, sus propias marcas de escuchado

#### Scenario: Sin tracking activo, sin acción de escucha

- **WHEN** un visitante sin tracking activo abre el detalle de un Camino ajeno
- **THEN** ve la lista de álbumes sin ningún ✓ ni acción de registrar o quitar escucha

#### Scenario: Quitar el registro de una escucha creada en la misma sesión

- **WHEN** quien registró una escucha desde esta vista la quita antes de salir de la página
- **THEN** el álbum vuelve a mostrarse como no escuchado

### Requirement: Archivar, desarchivar y borrar un Camino propio
El sistema SHALL permitir al propietario archivar un Camino en cualquier estado sin perder su
contenido ni el progreso derivado, desarchivarlo de forma reversible después, y borrarlo de forma
física e irreversible. Estas acciones sobre un Camino ajeno SHALL responder `404`.

#### Scenario: Archivar un Camino en curso
- **WHEN** el propietario archiva un Camino en curso
- **THEN** el Camino pasa a estado archivado conservando su contenido

#### Scenario: Desarchivar un Camino
- **WHEN** el propietario desarchiva un Camino archivado
- **THEN** vuelve a mostrarse en curso o completo según su contenido y las escuchas registradas

#### Scenario: Borrar un Camino propio
- **WHEN** el propietario borra su Camino tras confirmar la acción destructiva
- **THEN** el Camino y su contenido se eliminan de forma permanente

#### Scenario: Archivar, desarchivar o borrar un Camino ajeno
- **WHEN** un usuario intenta archivar, desarchivar o borrar un Camino que no le pertenece
- **THEN** la API responde `404` y no modifica nada

### Requirement: Listado propio en /me/caminos, en pestañas
El sistema SHALL exponer una ruta `/me/caminos` que requiere sesión, con dos pestañas — "Mis
Caminos" y "Trackeados" —, mismo patrón que "Mis listas · Guardadas · Descubrir" en `/me/lists`:
la pestaña activa vive en `?tab=` (enlazable, sobrevive a la recarga). El sistema SHALL NOT
mezclar Caminos propios y listas ajenas trackeadas en una sola lista ordenable — decisión tomada
tras comparar mockups de diseño: una lista unificada mezcla dos semánticas de "Estado" distintas
(un Camino propio puede archivarse, una lista trackeada no) y una acción por fila distinta
(archivar/eliminar vs. dejar de seguir) para el mismo campo de "Estado" y de acción.

"Mis Caminos" SHALL mostrar los Caminos dinámicos propios del usuario con buscador (por título),
orden (recientes / alfabético / por estado), filtro por estado (todo / en curso / completo /
archivado) y los mismos tres modos de visualización que `/me/artist-journeys` (Detallada / Índice
/ Gráfico, con preferencia de modo persistida en el navegador) — esta pestaña es homogénea (todo
propio, misma acción por entrada), así que admite el mismo mecanismo completo sin las asimetrías
de una lista mezclada. Progreso discreto sin fracción numérica, mismo criterio que Recorridos.

"Trackeados" SHALL mostrar las listas ajenas sobre las que el usuario activó tracking de progreso
(Requirement "Trackear el progreso propio sobre una lista ajena" de `list-saves`), con buscador
(por título o por nombre de dueño) y orden (recientes / más progreso), sin filtro de estado (no
existe "archivado" para una lista ajena) ni modo de visualización (un único tratamiento de fila
alcanza — no es una curaduría propia). Cada entrada SHALL enlazar al detalle de esa lista ajena
(la ruta de lectura correcta según su `kind`, ver Requirement "Acceso general desde el Header").

#### Scenario: Pestañas separadas, no una lista mezclada
- **WHEN** un usuario con Caminos propios y listas ajenas trackeadas abre `/me/caminos`
- **THEN** ve dos pestañas — "Mis Caminos" y "Trackeados" —, nunca ambos orígenes en una sola
  lista ordenable

#### Scenario: Buscador y orden completos en "Mis Caminos"
- **WHEN** el propietario tiene varios Caminos propios y usa el buscador, el orden o el filtro de
  estado en la pestaña "Mis Caminos"
- **THEN** ve el subconjunto filtrado/ordenado, sin ida y vuelta al servidor

#### Scenario: "Trackeados" sin filtro de estado ni modo de vista
- **WHEN** el usuario abre la pestaña "Trackeados"
- **THEN** encuentra buscador y orden, pero no un filtro de estado ni un conmutador de modo de
  visualización

#### Scenario: Pestaña vacía
- **WHEN** un usuario sin Caminos propios abre "Mis Caminos", o sin tracking activo abre
  "Trackeados"
- **THEN** ve el estado vacío localizado de esa pestaña, sin error

#### Scenario: Sin sesión
- **WHEN** una persona sin sesión abre `/me/caminos`
- **THEN** es redirigida al inicio de sesión

### Requirement: Acceso desde el menú de usuario y el panel de gestión del perfil
El sistema SHALL incluir un acceso a `/me/caminos` en el menú de usuario del Header y en el panel
de gestión del perfil propio, junto al acceso ya existente a `/me/artist-journeys`, con
tratamiento visual y copy que distinga claramente ambos conceptos.

#### Scenario: Acceso visible junto al de Recorridos
- **WHEN** un usuario autenticado abre el menú de usuario del Header
- **THEN** encuentra accesos distintos y distinguibles a sus Recorridos de artista y a sus Caminos

### Requirement: Exclusión de toda superficie que lea listas genéricamente
El sistema SHALL excluir los Caminos (`kind = 'custom_journey'`) de toda lectura de `user_list`
que no pertenezca a esta capability — mismo criterio ya aplicado a `artist_journey`: listado
propio de listas (`/me/lists`), Guardadas, Descubrir, colecciones destacadas, conteos de listas
(incluida la huella de gusto del perfil), el widget "Retomá una lista" de Inicio, los eventos de
lista del feed de actividad, y la acción "añadir a lista" de las páginas de catálogo. Un Camino
SHALL NOT ser accesible ni modificable a través de los endpoints de `lists`.

#### Scenario: Camino ausente de "Mis listas"
- **WHEN** un usuario con Caminos propios abre `/me/lists`
- **THEN** no ve ninguno de sus Caminos entre sus listas

#### Scenario: Un Camino no infla el conteo de listas de la huella de gusto
- **WHEN** un usuario tiene Caminos propios pero ninguna lista genérica
- **THEN** el "reparto" de su huella de gusto muestra `0` listas

#### Scenario: Archivar o desarchivar un Camino no genera un evento de feed
- **WHEN** el propietario archiva o desarchiva un Camino
- **THEN** el feed de actividad no recibe un evento de "lista actualizada" por esa acción

### Requirement: Sin comparación entre Caminos propios y ajenos en la superficie personal
El sistema SHALL NOT mostrar en `/me/caminos` ningún agregado o comparación entre los Caminos
propios del usuario y los de otros usuarios — esa comparación solo existe, de forma agregada y
anónima, en la capability `camino-discovery`.

#### Scenario: Sin comparación en la superficie personal
- **WHEN** un usuario abre `/me/caminos`
- **THEN** no ve ningún conteo ni ranking que lo compare con otros usuarios

### Requirement: Estante "Caminos" en el perfil de un usuario
El sistema SHALL mostrar, en el perfil de un usuario (`/users/[username]`), un estante "Caminos"
con los Caminos propios visibles para quien mira — no archivados, filtrados por la misma matriz
de audiencia que el resto del perfil —, con el mismo tratamiento que el estante "Listas": riel
horizontal acotado con una tarjeta-puerta "+N" hacia una página dedicada
`/users/[username]/caminos` cuando hay más Caminos de los que caben, y colapsado (sin
renderizarse) para un visitante cuando no hay ninguno visible, mostrando en cambio un estante
vacío invitando a crear uno cuando quien mira es el propio dueño. Cada tarjeta SHALL ofrecer la
acción de tracking (Requirement "Trackear el progreso propio sobre una lista ajena" de
`list-saves`) excepto en el propio perfil del dueño, donde SHALL NOT ofrecerse — no es posible
trackear el propio Camino.

#### Scenario: Visitante ve los Caminos públicos de un perfil
- **WHEN** un visitante abre el perfil de un usuario con Caminos visibles para él
- **THEN** ve el estante "Caminos" con esos Caminos, cada uno con la acción de tracking

#### Scenario: Estante ausente para un visitante sin Caminos visibles
- **WHEN** un visitante abre el perfil de un usuario sin ningún Camino visible para él
- **THEN** el estante "Caminos" no se renderiza

#### Scenario: Estante vacío para el propio dueño
- **WHEN** el propio dueño sin Caminos abre su perfil
- **THEN** ve el estante "Caminos" vacío, invitando a crear uno

#### Scenario: Sin acción de tracking en el propio perfil
- **WHEN** el propio dueño ve el estante "Caminos" de su perfil
- **THEN** ninguna tarjeta ofrece la acción de tracking

#### Scenario: Página dedicada cuando hay más de los que caben en el riel
- **WHEN** un perfil tiene más Caminos visibles que el tope del riel
- **THEN** el riel cierra con una tarjeta-puerta "+N" que lleva a
  `/users/[username]/caminos`, el listado completo paginado

### Requirement: Acceso general desde el Header
El sistema SHALL incluir un acceso a `/caminos` (descubrimiento público) en la barra general de
navegación del Header, visible con y sin sesión, junto al acceso ya existente a `/lists` — mismo
criterio: es navegación de contenido que el sitio ofrece a cualquiera, no una superficie personal
(que ya tiene su propio acceso en el menú de usuario, ver Requirement "Acceso desde el menú de
usuario y el panel de gestión del perfil").

#### Scenario: Acceso visible sin sesión
- **WHEN** una persona sin sesión abre cualquier página del sitio
- **THEN** encuentra un acceso a `/caminos` en la barra general del Header, junto a "Listas"

#### Scenario: Acceso visible con sesión
- **WHEN** un usuario autenticado abre cualquier página del sitio
- **THEN** encuentra el mismo acceso a `/caminos` en la barra general, además del acceso a
  `/me/caminos` en su menú de usuario
