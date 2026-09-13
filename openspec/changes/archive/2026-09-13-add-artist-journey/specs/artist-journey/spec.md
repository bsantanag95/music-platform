# artist-journey Specification

## Purpose

Herramienta de organización personal, opcional por artista: el usuario define qué álbumes
forman parte de su propio "recorrido completo" para ese artista, sin que la plataforma imponga
una definición externa. Reutiliza el mecanismo de listas (`user_list`/`user_list_item`) con un
subtipo especializado, pre-poblado desde la clasificación por tipo de MusicBrainz. Sin
curaduría editorial, sin comparación social, sin agregado ni ranking comunitario en ninguna
fase — ver `docs/00-product/product_philosophy.md` §6.4.

## ADDED Requirements

### Requirement: Activar un recorrido de artista
El sistema SHALL permitir a un usuario autenticado activar, a lo sumo un recorrido por artista,
de forma idempotente: activar un recorrido ya existente para ese artista SHALL devolver el
existente sin crear uno nuevo ni modificar su selección o estado. Al activarse por primera vez,
el sistema SHALL pre-poblar la selección con todos los álbumes de categoría `studio` del
artista, dejando el resto de categorías (`single_ep`, `compilation`, `live_other`) fuera de la
selección inicial.

#### Scenario: Activar un recorrido por primera vez
- **WHEN** un usuario autenticado activa un recorrido sobre un artista que no tenía uno
- **THEN** el sistema crea el recorrido con todos los álbumes de estudio del artista
  pre-seleccionados y el resto de tipos sin seleccionar

#### Scenario: Activar un recorrido ya existente
- **WHEN** un usuario activa un recorrido sobre un artista para el que ya tenía uno
- **THEN** el sistema devuelve el recorrido existente sin alterar su selección ni su estado

#### Scenario: Artista sin álbumes de estudio
- **WHEN** un usuario activa un recorrido sobre un artista sin ningún álbum de tipo Estudio
- **THEN** el recorrido se crea con la selección vacía, sin error

#### Scenario: Sesión requerida
- **WHEN** una request sin sesión intenta activar un recorrido
- **THEN** la API responde `401` con código `AUTH_REQUIRED` y no crea ningún recorrido

#### Scenario: Artista inexistente
- **WHEN** un usuario intenta activar un recorrido sobre un artista cuyo id no existe
- **THEN** la API responde `404` y no crea ningún recorrido

### Requirement: Vista de gestión agrupada por tipo, en un modal colapsable
El sistema SHALL presentar la selección de un recorrido en un modal (no inline en la página del
artista), agrupando **todos** los álbumes del artista por su categoría (`release_group.category`:
`studio`, `single_ep`, `compilation`, `live_other`), marcando como seleccionados los que ya son
parte del recorrido y como no seleccionados el resto, sin distinguir ni destacar editorialmente
ningún álbum dentro de su grupo de categoría. Dentro de cada grupo, los álbumes SHALL ordenarse
por año de lanzamiento ascendente; los álbumes sin año conocido SHALL ubicarse al final del
grupo, ordenados alfabéticamente entre sí — mismo criterio que ya usa la discografía de la
página de artista (`AlbumGrid`), para no presentar un orden distinto al que el usuario ya vio
ahí. Cada grupo SHALL poder colapsarse y expandirse de forma independiente; por defecto, el
grupo `studio` SHALL estar expandido y el resto de los grupos SHALL estar colapsados. El modal
SHALL seguir el mismo lenguaje visual, tipografía y mecánica de accesibilidad (portal,
focus-trap, cierre con `Escape`, bloqueo de scroll) que el resto de los modales de la
aplicación.

#### Scenario: Vista agrupada de un artista con varias categorías de lanzamiento
- **WHEN** el propietario abre el modal de gestión de su recorrido sobre un artista con álbumes
  de estudio, en vivo/misceláneos y compilados
- **THEN** ve un grupo por categoría, cada uno con sus álbumes marcados según si están o no en
  la selección actual

#### Scenario: Estado de colapso por defecto
- **WHEN** el propietario abre el modal de gestión por primera vez en una sesión
- **THEN** el grupo de álbumes de estudio aparece expandido y el resto de los grupos aparecen
  colapsados

#### Scenario: Colapsar y expandir un grupo
- **WHEN** el propietario alterna el colapso de un grupo
- **THEN** ese grupo muestra u oculta sus álbumes sin afectar el estado de colapso de los demás
  grupos

#### Scenario: Orden por año dentro de un grupo
- **WHEN** el propietario expande un grupo con álbumes de varios años
- **THEN** los ve ordenados de más antiguo a más nuevo

#### Scenario: Álbumes sin año al final del grupo
- **WHEN** un grupo tiene álbumes con año de lanzamiento conocido y álbumes sin él
- **THEN** los álbumes sin año aparecen después de todos los que sí tienen año, ordenados entre
  sí alfabéticamente

#### Scenario: Sin tratamiento editorial dentro de un grupo
- **WHEN** el propietario ve el grupo "En vivo / Misceláneo" de un artista con lanzamientos en
  vivo muy conocidos
- **THEN** ningún álbum del grupo aparece destacado o pre-sugerido de forma distinta a los
  demás de su mismo tipo

### Requirement: Editar un borrador local y guardar en una sola operación
El sistema SHALL editar la selección de un recorrido como un **borrador local** dentro del
modal de gestión: marcar o desmarcar un álbum, y "Seleccionar todo"/"Deseleccionar todo" por
grupo, SHALL modificar únicamente el estado del borrador en el cliente, sin llamar al servidor.
El sistema SHALL ofrecer una acción explícita "Guardar" que envíe el conjunto final completo de
álbumes seleccionados en una única petición, la cual SHALL reemplazar de una sola vez toda la
selección persistida del recorrido (altas y bajas incluidas), en cualquier dirección y sin
restricciones por categoría. Cerrar el modal sin guardar (botón de cerrar, `Escape`, click
fuera del modal) SHALL descartar el borrador sin modificar la selección persistida.

#### Scenario: Marcar y desmarcar álbumes sin llamadas al servidor
- **WHEN** el propietario marca o desmarca varios álbumes dentro del modal de gestión
- **THEN** ninguna de esas acciones genera una petición al servidor por sí sola

#### Scenario: Seleccionar todo un grupo en el borrador
- **WHEN** el propietario activa "Seleccionar todo" en un grupo sin ningún álbum seleccionado en
  el borrador
- **THEN** todos los álbumes de ese grupo pasan a marcarse en el borrador, sin llamar al servidor

#### Scenario: Deseleccionar todo un grupo en el borrador
- **WHEN** el propietario activa "Deseleccionar todo" en un grupo con todos sus álbumes marcados
  en el borrador
- **THEN** ningún álbum de ese grupo permanece marcado en el borrador, sin llamar al servidor

#### Scenario: Grupo sin álbumes
- **WHEN** un artista no tiene ningún álbum en una categoría dada
- **THEN** esa categoría no aparece en el modal y no ofrece ninguna acción de selección masiva

#### Scenario: Guardar aplica todos los cambios del borrador de una vez
- **WHEN** el propietario modificó varios álbumes en el borrador (algunos agregados, otros
  quitados) y activa "Guardar"
- **THEN** el sistema envía una única petición que reemplaza la selección persistida por el
  conjunto final del borrador

#### Scenario: Cerrar sin guardar descarta el borrador
- **WHEN** el propietario modifica el borrador y cierra el modal sin activar "Guardar"
- **THEN** la selección persistida del recorrido no cambia

#### Scenario: Guardar sin cambios no envía nada
- **WHEN** el propietario abre el modal y lo cierra sin modificar ningún álbum
- **THEN** el botón "Guardar" está deshabilitado y no se genera ninguna petición

#### Scenario: Guardar la selección de un recorrido ajeno
- **WHEN** una request intenta guardar la selección de un recorrido que no pertenece a quien la
  envía
- **THEN** la API responde `404` y no modifica la selección

#### Scenario: Álbum ajeno al artista en el conjunto a guardar
- **WHEN** el conjunto enviado a guardar incluye un álbum que no pertenece a la discografía del
  artista
- **THEN** la API responde `400` con un error de validación y no modifica la selección

### Requirement: Estados derivados del recorrido
El sistema SHALL exponer exactamente tres estados por recorrido, derivados en el momento de la
lectura y SHALL NOT persistir un cuarto estado de "pendiente": **archivado** cuando el
propietario lo archivó explícitamente; en caso contrario, **completo** cuando la selección
tiene al menos un álbum y todos sus álbumes tienen una escucha propia registrada en el diario;
en cualquier otro caso, **en curso**. Un artista sin recorrido activado SHALL NOT representarse
como un estado de esta capacidad.

#### Scenario: Recorrido con toda la selección escuchada
- **WHEN** el propietario tiene registrada en su diario una escucha de cada álbum de su
  selección
- **THEN** el recorrido se muestra en estado completo

#### Scenario: Agregar un álbum a un recorrido completo
- **WHEN** el propietario agrega a la selección de un recorrido completo un álbum que no ha
  escuchado
- **THEN** el recorrido pasa a mostrarse en curso, sin acción manual adicional sobre el estado

#### Scenario: Selección vacía
- **WHEN** un recorrido no tiene ningún álbum seleccionado
- **THEN** se muestra en curso, nunca completo

#### Scenario: Sin estado "pendiente"
- **WHEN** un usuario no ha activado ningún recorrido sobre un artista
- **THEN** ninguna superficie del sistema representa a ese artista como "pendiente de
  completar" o equivalente

### Requirement: Archivar y desarchivar un recorrido
El sistema SHALL permitir al propietario archivar un recorrido, en cualquier estado, sin
perder su selección ni el progreso ya registrado en el diario, y desarchivarlo después de
forma reversible. Archivar y desarchivar SHALL ser acciones manuales explícitas del
propietario, agrupadas junto con editar y borrar en la gestión del recorrido.

#### Scenario: Archivar un recorrido en curso
- **WHEN** el propietario archiva un recorrido que está en curso
- **THEN** el recorrido pasa a estado archivado conservando su selección completa

#### Scenario: Desarchivar un recorrido
- **WHEN** el propietario desarchiva un recorrido archivado
- **THEN** el recorrido vuelve a mostrarse en curso o completo según su selección y las
  escuchas registradas, sin haber perdido nada

#### Scenario: Archivar un recorrido ajeno
- **WHEN** un usuario intenta archivar un recorrido que no le pertenece
- **THEN** la API responde `404` y no modifica el recorrido

### Requirement: Borrado del recorrido
El sistema SHALL permitir al propietario borrar un recorrido propio de forma física e
irreversible, eliminando su selección. El borrado de un recorrido ajeno SHALL responder `404`.

#### Scenario: Borrar un recorrido propio
- **WHEN** el propietario borra su recorrido tras confirmar la acción destructiva
- **THEN** el recorrido y su selección se eliminan de forma permanente

#### Scenario: Borrar un recorrido ajeno
- **WHEN** un usuario intenta borrar un recorrido que no le pertenece
- **THEN** la API responde `404` y no borra nada

### Requirement: Progreso informativo acotado a la página de gestión
El sistema SHALL mostrar el progreso de un recorrido (proporción de la selección propia ya
escuchada) únicamente dentro de la página de gestión de ese recorrido, de forma discreta y sin
fracciones numéricas ni alertas en ningún otro punto de la interfaz. El sistema SHALL NOT
mostrar mensajes que indiquen una cantidad de álbumes restantes fuera de esa página.

#### Scenario: Progreso visible en la gestión del recorrido
- **WHEN** el propietario abre la página de gestión de un recorrido en curso
- **THEN** ve una señal discreta de su progreso contra su propia selección

#### Scenario: Sin mensajes de álbumes restantes
- **WHEN** el propietario navega el catálogo o su perfil con recorridos en curso
- **THEN** ninguna superficie fuera de la gestión del recorrido muestra cuántos álbumes le
  faltan

### Requirement: Exclusión de toda superficie que lea listas genéricamente
El sistema SHALL excluir los recorridos de artista de **toda** lectura de `user_list` que no
pertenezca a esta capacidad, sin importar en qué capacidad viva esa lectura: listado propio de
listas (`/me/lists`), Guardadas, Descubrir, colecciones destacadas, conteos de listas (incluido
el "reparto" de la huella de gusto del perfil), el widget "Retomá una lista" de Inicio, los
eventos de lista del feed de actividad, el cálculo de "última señal" de recencia del perfil, y
la acción "añadir a lista" de las páginas de catálogo. Un recorrido SHALL NOT ser accesible ni
modificable a través de los endpoints de `lists`.

#### Scenario: Recorrido ausente de "Mis listas"
- **WHEN** un usuario con recorridos activos abre `/me/lists`
- **THEN** no ve ninguno de sus recorridos entre sus listas

#### Scenario: Recorrido ausente de Descubrir
- **WHEN** un recorrido tiene la misma audiencia que tendría una lista pública
- **THEN** igual no aparece en la pestaña Descubrir ni en el conteo de listas de nadie

#### Scenario: Recorrido ausente del widget "Retomá una lista" de Inicio
- **WHEN** el recorrido activo de un usuario es, por fecha, su `user_list` más reciente
- **THEN** Inicio no lo ofrece como "Retomá una lista"; si no tiene ninguna lista genérica, el
  widget no se renderiza

#### Scenario: Un recorrido no infla el conteo de listas de la huella de gusto
- **WHEN** un usuario tiene recorridos activos pero ninguna lista genérica
- **THEN** el "reparto" de su huella de gusto muestra `0` listas

#### Scenario: Archivar o desarchivar un recorrido no genera un evento de feed
- **WHEN** el propietario archiva o desarchiva un recorrido, lo que actualiza `updated_at` de la
  fila subyacente
- **THEN** el feed de actividad de quienes lo siguen no recibe un evento de "lista actualizada"

### Requirement: Independencia respecto de Want to Listen
El sistema SHALL tratar los recorridos de artista como independientes de Want to Listen:
agregar o quitar un álbum de la selección de un recorrido SHALL NOT crear, modificar ni
eliminar ninguna entrada de Want to Listen del mismo objetivo, y viceversa.

#### Scenario: Seleccionar un álbum que está en Want to Listen
- **WHEN** el propietario agrega a su recorrido un álbum que tiene marcado en Want to Listen
- **THEN** la entrada de Want to Listen de ese álbum no se modifica

### Requirement: Sin agregado ni ranking comunitario
El sistema SHALL NOT exponer, en ninguna superficie, un agregado o ranking de recorridos entre
usuarios — ni un conteo de personas que completaron la discografía de un artista, ni un listado
de artistas más completados de la comunidad, ni ninguna comparación de cantidad o velocidad de
recorridos entre usuarios distintos, presente o futura.

#### Scenario: Página de artista sin agregado de recorridos
- **WHEN** cualquier usuario abre la página de un artista con muchos recorridos activos de
  distintas personas
- **THEN** la página no muestra ningún conteo ni comparación de recorridos entre usuarios

### Requirement: Listado propio de recorridos
El sistema SHALL exponer una ruta `/me/artist-journeys` que liste todos los recorridos del
usuario autenticado (en curso, completos y archivados), cada uno con el artista y su estado,
sin progreso ni fracción numérica — mismo criterio que la faceta de perfil. Cada entrada SHALL
enlazar a la página del artista correspondiente, donde ocurre la gestión de su selección; esta
ruta SHALL NOT ofrecer edición de la selección. La ruta SHALL requerir sesión.

#### Scenario: Listado con recorridos en distintos estados
- **WHEN** un usuario autenticado con recorridos en curso, completos y archivados abre
  `/me/artist-journeys`
- **THEN** ve los tres, cada uno con su estado, sin ninguna fracción de progreso

#### Scenario: Listado vacío
- **WHEN** un usuario sin ningún recorrido abre `/me/artist-journeys`
- **THEN** ve un estado vacío localizado, sin error

#### Scenario: Sin sesión
- **WHEN** una persona sin sesión abre `/me/artist-journeys`
- **THEN** es redirigida al inicio de sesión

### Requirement: Acceso desde el menú de usuario
El sistema SHALL incluir un acceso a `/me/artist-journeys` en el menú de usuario del Header y en
el panel de gestión del perfil propio, con el mismo tratamiento visual que el resto de los
accesos de esas superficies (ver spec `cross-view-navigation`).

#### Scenario: Acceso visible en el menú de usuario
- **WHEN** un usuario autenticado abre el menú de usuario del Header
- **THEN** encuentra un acceso a sus recorridos junto al resto de los accesos de gestión

#### Scenario: Acceso visible en el panel de gestión del perfil
- **WHEN** el dueño de un perfil abre el panel de gestión de su propio perfil
- **THEN** encuentra el mismo acceso a sus recorridos
