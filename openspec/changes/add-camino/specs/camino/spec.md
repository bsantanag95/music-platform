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

### Requirement: Listado propio en /me/caminos
El sistema SHALL exponer una ruta `/me/caminos` que requiere sesión y lista, en una sola
superficie, los Caminos dinámicos propios del usuario (con su estado y progreso discreto sin
fracción numérica, mismo criterio que `/me/artist-journeys`) junto con las listas ajenas sobre las
que el usuario activó tracking de progreso (Requirement "Trackear el progreso propio sobre una
lista ajena" de la capability `list-saves`), distinguiendo visualmente ambos orígenes. Cada
entrada SHALL enlazar a la gestión de ese Camino propio o al detalle de la lista ajena trackeada,
según corresponda.

#### Scenario: Listado combinado
- **WHEN** un usuario con Caminos propios y listas ajenas trackeadas abre `/me/caminos`
- **THEN** ve ambos grupos, cada entrada distinguible según si es un Camino propio o una lista
  ajena que está trackeando

#### Scenario: Listado vacío
- **WHEN** un usuario sin Caminos propios ni tracking activo sobre ninguna lista abre `/me/caminos`
- **THEN** ve un estado vacío localizado, sin error

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
