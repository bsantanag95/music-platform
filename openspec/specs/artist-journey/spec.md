# artist-journey Specification

## Purpose

Herramienta de organización personal, opcional por artista: el usuario define qué álbumes
forman parte de su propio "recorrido completo" para ese artista, sin que la plataforma imponga
una definición externa. Reutiliza el mecanismo de listas (`user_list`/`user_list_item`) con un
subtipo especializado, pre-poblado desde la clasificación por categoría del catálogo. Sin
curaduría editorial, sin comparación social, sin agregado ni ranking comunitario en ninguna
fase — ver `docs/00-product/product_philosophy.md` §6.4.
## Requirements
### Requirement: Activar un recorrido de artista
El sistema SHALL permitir a un usuario autenticado activar, a lo sumo un recorrido por artista,
de forma idempotente: activar un recorrido ya existente para ese artista SHALL devolver el
existente sin crear uno nuevo ni modificar su selección o estado. Al activarse por primera vez,
el sistema SHALL pre-poblar la selección con todos los álbumes de categoría `studio` del
artista, dejando el resto de categorías (`single_ep`, `compilation`, `live_other`) fuera de la
selección inicial. Esta activación es la operación de servidor subyacente; el flujo de interfaz
que la dispara — el modal de inicio — está definido en el Requirement "Modal de inicio: crear un
recorrido con una selección elegida".

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

### Requirement: Vista de gestión agrupada por tipo, en una página dedicada
El sistema SHALL presentar la selección de un recorrido en una página dedicada
(`/me/artist-journeys/[artistId]`, no en un modal ni inline en la página del artista), agrupando
**todos** los álbumes del artista por su categoría (`release_group.category`: `studio`,
`single_ep`, `compilation`, `live_other`), marcando como seleccionados los que ya son parte del
recorrido y como no seleccionados el resto, sin distinguir ni destacar editorialmente ningún
álbum dentro de su grupo de categoría. Dentro de cada grupo, los álbumes SHALL ordenarse por año
de lanzamiento ascendente; los álbumes sin año conocido SHALL ubicarse al final del grupo,
ordenados alfabéticamente entre sí — mismo criterio que ya usa la discografía de la página de
artista (`AlbumGrid`), para no presentar un orden distinto al que el usuario ya vio ahí. Cada
grupo SHALL poder colapsarse y expandirse de forma independiente; por defecto, el grupo `studio`
SHALL estar expandido y el resto de los grupos SHALL estar colapsados. Esta vista agrupada de
casilleros (el editor de la selección) SHALL permanecer oculta por defecto detrás de una acción
explícita que la despliegue, salvo cuando la selección del recorrido está vacía, caso en el que
SHALL aparecer ya desplegada — no hay nada más que mostrar en la página en ese caso. La página
SHALL requerir sesión y SHALL responder con un recorrido inexistente (404) si el usuario
autenticado no tiene un recorrido activo sobre el artista de la URL.

#### Scenario: Vista agrupada de un artista con varias categorías de lanzamiento
- **WHEN** el propietario abre la página de gestión de su recorrido sobre un artista con álbumes
  de estudio, en vivo/misceláneos y compilados
- **THEN** ve un grupo por categoría, cada uno con sus álbumes marcados según si están o no en
  la selección actual

#### Scenario: Estado de colapso por defecto
- **WHEN** el propietario abre la página de gestión por primera vez en una sesión
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

#### Scenario: Sin sesión
- **WHEN** una persona sin sesión abre la página de gestión de un recorrido
- **THEN** es redirigida al inicio de sesión

#### Scenario: Recorrido inexistente
- **WHEN** un usuario autenticado abre la página de gestión de un artista sobre el que nunca
  activó un recorrido
- **THEN** la página responde 404

#### Scenario: El editor está oculto por defecto
- **WHEN** el propietario abre la página de gestión de un recorrido con al menos un álbum
  seleccionado
- **THEN** no ve la grilla de casilleros de inmediato, sino una acción explícita para desplegarla

#### Scenario: El editor se abre automáticamente cuando la selección está vacía
- **WHEN** el propietario abre la página de gestión de un recorrido sin ningún álbum seleccionado
- **THEN** ve la grilla de casilleros ya desplegada, sin necesidad de un clic adicional

### Requirement: Editar un borrador local y guardar en una sola operación
El sistema SHALL editar la selección de un recorrido como un **borrador local** dentro de la
página de gestión: marcar o desmarcar un álbum, y "Seleccionar todo"/"Deseleccionar todo" por
grupo, SHALL modificar únicamente el estado del borrador en el cliente, sin llamar al servidor.
El sistema SHALL ofrecer una acción explícita "Guardar" que envíe el conjunto final completo de
álbumes seleccionados en una única petición, la cual SHALL reemplazar de una sola vez toda la
selección persistida del recorrido (altas y bajas incluidas), en cualquier dirección y sin
restricciones por categoría. Navegar fuera de la página sin guardar SHALL descartar el borrador
sin modificar la selección persistida. Cuando el borrador no difiere de la selección ya
persistida — incluido el caso en que se acaba de activar el recorrido y la preselección de
estudio ya quedó guardada — el botón "Guardar" SHALL aparecer deshabilitado junto a una señal
textual discreta de que no hay cambios pendientes, para que la ausencia de acción no se lea como
que la página quedó trabada.

#### Scenario: Marcar y desmarcar álbumes sin llamadas al servidor
- **WHEN** el propietario marca o desmarca varios álbumes dentro de la página de gestión
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
- **THEN** esa categoría no aparece en la página y no ofrece ninguna acción de selección masiva

#### Scenario: Guardar aplica todos los cambios del borrador de una vez
- **WHEN** el propietario modificó varios álbumes en el borrador (algunos agregados, otros
  quitados) y activa "Guardar"
- **THEN** el sistema envía una única petición que reemplaza la selección persistida por el
  conjunto final del borrador

#### Scenario: Cerrar sin guardar descarta el borrador
- **WHEN** el propietario modifica el borrador y navega fuera de la página sin activar "Guardar"
- **THEN** la selección persistida del recorrido no cambia

#### Scenario: Guardar sin cambios no envía nada
- **WHEN** el propietario abre la página y no modifica ningún álbum
- **THEN** el botón "Guardar" está deshabilitado, se muestra una señal de que no hay cambios
  pendientes, y no se genera ninguna petición

#### Scenario: Al llegar desde el modal de inicio, sin cambios frente a lo recién elegido
- **WHEN** el propietario guarda la selección inicial en el modal de inicio (Requirement "Modal
  de inicio: crear un recorrido con una selección elegida") y llega a la página de gestión
- **THEN** ve esa misma selección ya marcada, el botón "Guardar" deshabilitado, y la señal de que
  no hay cambios pendientes — no un botón que parezca trabado, porque lo que acaba de guardar en
  el modal es exactamente lo que ve

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
propietario, disponibles en la página de gestión del recorrido junto con la selección y el
borrado, y también desde el menú de tarjeta del listado propio (Requirement "Menú de tarjeta del
listado") — no en la página del artista.

#### Scenario: Archivar un recorrido en curso
- **WHEN** el propietario archiva, desde la página de gestión o desde el listado, un recorrido
  que está en curso
- **THEN** el recorrido pasa a estado archivado conservando su selección completa

#### Scenario: Desarchivar un recorrido
- **WHEN** el propietario desarchiva, desde la página de gestión o desde el listado, un
  recorrido archivado
- **THEN** el recorrido vuelve a mostrarse en curso o completo según su selección y las
  escuchas registradas, sin haber perdido nada

#### Scenario: Archivar un recorrido ajeno
- **WHEN** un usuario intenta archivar un recorrido que no le pertenece
- **THEN** la API responde `404` y no modifica el recorrido

### Requirement: Borrado del recorrido
El sistema SHALL permitir al propietario borrar un recorrido propio de forma física e
irreversible, eliminando su selección, desde la página de gestión del recorrido. El borrado de
un recorrido ajeno SHALL responder `404`.

#### Scenario: Borrar un recorrido propio
- **WHEN** el propietario borra su recorrido, desde la página de gestión, tras confirmar la
  acción destructiva
- **THEN** el recorrido y su selección se eliminan de forma permanente y el propietario es
  redirigido al listado de sus recorridos

#### Scenario: Borrar un recorrido ajeno
- **WHEN** un usuario intenta borrar un recorrido que no le pertenece
- **THEN** la API responde `404` y no borra nada

### Requirement: Progreso informativo acotado a la página de gestión
El sistema SHALL mostrar el progreso de un recorrido (proporción de la selección propia ya
escuchada) únicamente dentro de la página de gestión de ese recorrido
(`/me/artist-journeys/[artistId]`), de forma discreta y sin fracciones numéricas ni alertas en
ningún otro punto de la interfaz. La tarjeta de resumen en la página del artista SHALL poder
mostrar la misma señal discreta (barra de progreso sin fracción numérica), pero SHALL NOT ofrecer
edición de la selección ni ninguna otra acción mutable. El sistema SHALL NOT mostrar mensajes que
indiquen una cantidad de álbumes restantes fuera de la página de gestión.

#### Scenario: Progreso visible en la gestión del recorrido
- **WHEN** el propietario abre la página de gestión de un recorrido en curso
- **THEN** ve una señal discreta de su progreso contra su propia selección

#### Scenario: Resumen de solo lectura en la página del artista
- **WHEN** el propietario de un recorrido en curso visita la página del artista
- **THEN** ve el estado y una señal discreta de progreso, sin ningún control de edición,
  archivado o borrado en esa tarjeta

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
usuario autenticado (en curso, completos y archivados), cada uno con el artista y su estado, sin
fracción numérica visible en ningún modo — mismo criterio que la faceta de perfil; el modo
Detallada SHALL poder mostrar progreso discreto sin números (Requirement "Detalle discreto propio
del modo Detallada"), nunca como texto "X de Y". Cada entrada SHALL
enlazar a la página de gestión de ese recorrido (`/me/artist-journeys/[artistId]`), y SHALL
ofrecer además, agrupadas en su menú de tarjeta (Requirement "Menú de tarjeta del listado"),
acciones para ver la página del artista correspondiente, archivar/desarchivar, y eliminar ese
recorrido sin salir del listado (Requirement "Eliminar un recorrido desde el listado propio").
La ruta SHALL requerir sesión.

Cuando el usuario tiene al menos un recorrido, el sistema SHALL ofrecer un buscador que filtre
las entradas por nombre de artista (localmente, sin ida y vuelta al servidor), sin distinguir
mayúsculas de minúsculas ni diacríticos (una búsqueda sin tilde SHALL encontrar un nombre con
tilde, y viceversa), un control de
orden con tres opciones — por orden de agregado (activación más reciente primero, el orden en que
ya llega el listado del servidor), alfabético por nombre de artista, o por estado (en curso,
luego completo, luego archivado — mismo orden canónico que el resto de la aplicación) —, un
control de filtro por estado con cuatro opciones excluyentes — todo (por defecto), en curso,
completo, archivado — que acota las entradas visibles al estado elegido sin alterar el buscador ni
el orden, y un conmutador de modo de visualización con las mismas tres opciones excluyentes que el
resto de la aplicación (Detallada/Índice/Gráfico — ver `/me/lists/[id]` y Want to Listen), aplicado
por igual a todo el listado. La preferencia de modo SHALL persistir entre visitas para el mismo
navegador; el orden, la búsqueda y el filtro de estado no persisten, y vuelven a su valor por
defecto en cada visita, igual que los filtros de `/me/lists`. Ninguna de las opciones de orden, de
filtro de estado ni de modo SHALL alterar qué acción ofrece cada entrada (gestión como enlace
principal, menú de tarjeta con el resto, estado) — solo su densidad visual y su secuencia.

#### Scenario: Listado con recorridos en distintos estados
- **WHEN** un usuario autenticado con recorridos en curso, completos y archivados abre
  `/me/artist-journeys`
- **THEN** ve los tres, cada uno con su estado, sin ninguna fracción de progreso

#### Scenario: Entrada enlaza a la gestión del recorrido
- **WHEN** el propietario hace clic en una entrada del listado
- **THEN** llega a la página de gestión de ese recorrido, no a la página del artista

#### Scenario: Ver la página del artista sin gestionar el recorrido
- **WHEN** el propietario quiere ver la página del artista sin gestionar el recorrido
- **THEN** encuentra "Ver artista" en el menú de tarjeta de esa entrada

#### Scenario: Listado vacío
- **WHEN** un usuario sin ningún recorrido abre `/me/artist-journeys`
- **THEN** ve un estado vacío localizado, sin error, sin buscador, sin control de orden, sin
  filtro de estado ni conmutador de modo

#### Scenario: Sin sesión
- **WHEN** una persona sin sesión abre `/me/artist-journeys`
- **THEN** es redirigida al inicio de sesión

#### Scenario: Buscar filtra por nombre de artista
- **WHEN** el propietario escribe en el buscador un texto que coincide con el nombre de algunos
  de sus artistas
- **THEN** el listado muestra solo las entradas cuyo artista coincide, sin llamar al servidor

#### Scenario: Buscar sin distinguir diacríticos
- **WHEN** el propietario escribe en el buscador el nombre de un artista con tildes u otros
  diacríticos, sin incluirlos (o a la inversa: el artista no lleva diacríticos y el propietario
  los escribe igual)
- **THEN** el listado muestra la entrada que corresponde, sin exigir que los diacríticos
  coincidan exactamente

#### Scenario: Búsqueda sin coincidencias
- **WHEN** el texto del buscador no coincide con ningún artista del listado
- **THEN** el sistema muestra un estado vacío de "sin resultados", distinto del estado vacío de
  "todavía no armaste ningún recorrido"

#### Scenario: Orden por agregado (por defecto)
- **WHEN** el propietario abre el listado sin haber cambiado el orden
- **THEN** ve sus recorridos en el orden en que los activó, del más reciente al más antiguo

#### Scenario: Orden alfabético
- **WHEN** el propietario elige el orden alfabético
- **THEN** ve sus recorridos ordenados por nombre de artista, sin distinguir mayúsculas

#### Scenario: Orden por estado
- **WHEN** el propietario elige el orden por estado
- **THEN** ve primero los recorridos en curso, luego los completos, y por último los archivados;
  dentro de un mismo estado, conserva el orden de agregado

#### Scenario: El orden y la búsqueda se combinan
- **WHEN** el propietario tiene un filtro de búsqueda activo y cambia el orden a alfabético o por
  estado
- **THEN** ve el mismo subconjunto filtrado, reordenado según el criterio elegido

#### Scenario: Cambiar el modo de visualización conserva el listado filtrado
- **WHEN** el propietario cambia entre Detallada, Índice y Gráfico mientras hay un filtro de
  búsqueda activo
- **THEN** los tres modos muestran el mismo subconjunto filtrado, solo con distinta densidad
  visual

#### Scenario: La preferencia de modo persiste entre visitas
- **WHEN** el propietario elige un modo de visualización y vuelve a abrir `/me/artist-journeys`
  más tarde en el mismo navegador
- **THEN** el listado se abre en el modo elegido la vez anterior

#### Scenario: Filtrar por un solo estado
- **WHEN** el propietario elige "Archivado" (o "En curso", o "Completo") en el filtro de estado
- **THEN** el listado muestra únicamente los recorridos en ese estado

#### Scenario: El filtro "Todo" muestra los tres estados
- **WHEN** el propietario abre el listado sin haber cambiado el filtro de estado, o lo vuelve a
  poner en "Todo"
- **THEN** ve recorridos de cualquier estado, igual que antes de que existiera el filtro

#### Scenario: El filtro de estado se combina con la búsqueda y el orden
- **WHEN** el propietario tiene un filtro de estado activo y además busca por nombre o cambia el
  orden
- **THEN** ve el subconjunto que cumple el estado elegido y la búsqueda, en el orden seleccionado

#### Scenario: El filtro de estado no persiste entre visitas
- **WHEN** el propietario elige un estado en el filtro y vuelve a abrir `/me/artist-journeys` más
  tarde
- **THEN** el filtro de estado vuelve a "Todo", igual que el buscador y el orden

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

### Requirement: Eliminar un recorrido desde el listado propio
El sistema SHALL permitir al propietario eliminar un recorrido propio directamente desde
`/me/artist-journeys`, sin pasar por la página de gestión, en los tres modos de visualización.
La eliminación SHALL requerir una confirmación de dos pasos por entrada: elegir "Eliminar" en el
menú de tarjeta de esa entrada (Requirement "Menú de tarjeta del listado") arma la confirmación
sin eliminar nada, y un segundo paso explícito ("Confirmar eliminación") la ejecuta. La
eliminación SHALL usar el mismo endpoint y la misma semántica de borrado físico e irreversible
que el Requirement "Borrado del recorrido". Al eliminar exitosamente, la entrada SHALL
desaparecer del listado sin recargar la página; si el listado queda vacío, SHALL mostrarse el
estado vacío de "todavía no armaste ningún recorrido".

#### Scenario: Eliminar requiere confirmación de dos pasos
- **WHEN** el propietario activa la acción de eliminar sobre una entrada del listado
- **THEN** el sistema arma una confirmación sin eliminar nada todavía; solo un segundo clic sobre
  la confirmación ejecuta el borrado

#### Scenario: Eliminar quita la entrada sin recargar la página
- **WHEN** el propietario confirma la eliminación de una entrada
- **THEN** esa entrada desaparece del listado, y el resto de las entradas y el filtro/orden
  activos no se alteran

#### Scenario: Eliminar el último recorrido deja el estado vacío
- **WHEN** el propietario elimina desde el listado su único recorrido
- **THEN** el sistema muestra el estado vacío de "todavía no armaste ningún recorrido"

#### Scenario: Un error al eliminar conserva la entrada
- **WHEN** la eliminación falla
- **THEN** la entrada permanece visible en el listado y el sistema muestra un aviso de error

### Requirement: Menú de tarjeta del listado
Cada entrada del listado propio, en los tres modos de visualización (Detallada, Índice y
Gráfico), SHALL agrupar sus acciones secundarias — ver la página del artista, archivar o
desarchivar, y eliminar — en un único menú desplegable activado por un control "⋮", ubicado
junto al estado de la entrada, en vez de enlaces de texto sueltos. El control "⋮" SHALL tener
contraste suficiente para percibirse en reposo, sin depender del hover o foco para ser visible.
Elegir "Eliminar" en el menú SHALL armar, en el lugar de esa misma entrada (reemplazando
temporalmente su estado y su menú), la confirmación de dos pasos del Requirement "Eliminar un
recorrido desde el listado propio", en vez de eliminar de inmediato.

#### Scenario: El menú agrupa las tres acciones secundarias
- **WHEN** el propietario abre el menú "⋮" de una entrada, en cualquiera de los tres modos
- **THEN** encuentra "Ver artista", "Archivar" (o "Desarchivar" si el recorrido ya está
  archivado) y "Eliminar", en ese orden

#### Scenario: Ver artista desde el menú
- **WHEN** el propietario elige "Ver artista" en el menú de una entrada
- **THEN** llega a la página de ese artista

#### Scenario: Archivar o desarchivar desde el menú
- **WHEN** el propietario elige "Archivar" (o "Desarchivar") en el menú de una entrada
- **THEN** el estado de esa entrada se actualiza en el listado sin recargar la página, sin pasar
  por la página de gestión

#### Scenario: Eliminar desde el menú pide confirmación en la propia entrada
- **WHEN** el propietario elige "Eliminar" en el menú de una entrada
- **THEN** el menú se cierra y esa misma entrada muestra una confirmación sin haber eliminado
  nada todavía; solo confirmar ese segundo paso ejecuta el borrado

#### Scenario: El menú es el mismo en los tres modos
- **WHEN** el propietario cambia de modo de visualización
- **THEN** encuentra el mismo menú "⋮" con las mismas tres acciones en cada modo, solo con
  distinta ubicación y densidad visual según el layout de cada uno

### Requirement: Detalle discreto propio del modo Detallada
El modo Detallada SHALL mostrar, por cada entrada, una señal adicional que lo distinga de
Índice (deliberadamente compacto, sin esta información): una barra de progreso discreta de la
selección propia ya escuchada, sin fracción numérica visible en ningún punto de esa barra ni a
su lado (mismo criterio que el Requirement "Progreso informativo acotado a la página de
gestión" — §6.4.1: nunca "X de Y" fuera de la página de gestión), y la fecha de última
actualización del recorrido, en formato relativo. La barra SHALL omitirse por completo — sin
espacio vacío que la reemplace — cuando la selección está vacía. El modo Índice SHALL NOT mostrar
esta información: existe precisamente para ser la vista compacta.

#### Scenario: Progreso discreto sin fracción numérica en Detallada
- **WHEN** el propietario ve una entrada en modo Detallada con álbumes seleccionados
- **THEN** ve una barra de progreso proporcional a lo escuchado, sin ningún número de álbumes
  visible junto a ella

#### Scenario: Sin barra cuando la selección está vacía
- **WHEN** una entrada en modo Detallada no tiene ningún álbum seleccionado
- **THEN** no se muestra ninguna barra de progreso para esa entrada

#### Scenario: Última actualización visible en Detallada
- **WHEN** el propietario ve una entrada en modo Detallada
- **THEN** ve la fecha de última actualización de ese recorrido, en formato relativo

#### Scenario: Índice se mantiene compacto
- **WHEN** el propietario ve el listado en modo Índice
- **THEN** ninguna entrada muestra barra de progreso ni fecha de última actualización

### Requirement: Modal de inicio: crear un recorrido con una selección elegida
El sistema SHALL crear un recorrido únicamente a través de un modal de inicio, abierto desde el
botón "Armar recorrido" de la página del artista. Abrir el modal SHALL NOT crear ningún recorrido
ni llamar al servidor: el modal presenta la discografía completa del artista, agrupada por
categoría con el mismo criterio de orden y colapso que la página de gestión (Requirement "Vista
de gestión agrupada por tipo, en una página dedicada"), con los álbumes de categoría `studio`
preseleccionados como **borrador local** editable — marcar o desmarcar cualquier álbum de
cualquier categoría SHALL modificar únicamente ese borrador, sin llamar al servidor. El modal
SHALL ofrecer dos acciones: "Cancelar" (y, equivalentemente, la tecla `Escape` o un clic fuera
del modal), que SHALL cerrarlo sin crear el recorrido ni modificar nada; y "Guardar", que SHALL
activar el recorrido (Requirement "Activar un recorrido de artista") y reemplazar su selección
por el borrador elegido en el modal, en una sola acción del usuario, y entonces SHALL llevar al
usuario a la página de gestión de ese recorrido. Un error al guardar SHALL mantener el modal
abierto con un aviso, sin navegar.

#### Scenario: Abrir el modal no crea ningún recorrido
- **WHEN** el propietario hace clic en "Armar recorrido" en la página de un artista sin
  recorrido activo
- **THEN** ve el modal con los álbumes de estudio preseleccionados, sin que se haya generado
  ninguna petición al servidor

#### Scenario: Cancelar no crea ningún recorrido
- **WHEN** el propietario cierra el modal (Cancelar, `Escape`, o clic fuera) sin haber guardado
- **THEN** el modal se cierra y no queda ningún recorrido creado, incluso si había modificado la
  preselección dentro del modal

#### Scenario: Guardar crea el recorrido con la selección elegida en el modal
- **WHEN** el propietario modifica la preselección dentro del modal (agrega o quita álbumes de
  cualquier categoría) y activa "Guardar"
- **THEN** el sistema crea el recorrido con exactamente esa selección — no solo la preselección
  de estudio — y el propietario llega a la página de gestión de ese recorrido

#### Scenario: Guardar sin modificar la preselección
- **WHEN** el propietario activa "Guardar" sin haber tocado ningún casillero
- **THEN** el sistema crea el recorrido con los álbumes de estudio preseleccionados y el
  propietario llega a la página de gestión de ese recorrido

#### Scenario: Un clic accidental en "Armar recorrido" no deja nada creado
- **WHEN** el propietario abre el modal sin intención de continuar y lo cierra sin guardar
- **THEN** no queda ningún recorrido que deba borrar manualmente después

#### Scenario: Error al guardar mantiene el modal abierto
- **WHEN** la activación o el guardado de la selección fallan
- **THEN** el modal permanece abierto con un aviso de error, y el propietario no es llevado a la
  página de gestión

### Requirement: Vista de la selección actual con carátulas, orden y enlaces
El sistema SHALL mostrar, como contenido principal de la página de gestión, la selección actual
del recorrido — no la discografía completa del artista — agrupada por categoría con el mismo
criterio de agrupación y de orden por año que el editor (Requirement "Vista de gestión agrupada
por tipo, en una página dedicada"), incluyendo la carátula de cada álbum. El sistema SHALL ofrecer,
además del orden por año de lanzamiento, un orden alfabético por título, aplicado dentro de cada
grupo y seleccionable por el propietario. El sistema SHALL ofrecer dos modos de visualización
mutuamente excluyentes para esta vista — lista (carátula, título y año) y gráfico (pared de
carátulas) —, aplicados por igual a toda la vista; a diferencia del modo de `/me/artist-journeys`,
el modo de esta vista SHALL NOT persistir entre visitas. El título de cada álbum SHALL enlazar a
su propia página de catálogo. Cada álbum de esta vista SHALL ofrecer una acción de quitarlo
directamente, que SHALL modificar el mismo borrador local del Requirement "Editar un borrador
local y guardar en una sola operación" — sin llamar al servidor hasta que el propietario active
"Guardar". Cuando la selección del recorrido está vacía, esta vista SHALL NOT mostrarse.

#### Scenario: Selección agrupada con carátulas como contenido principal
- **WHEN** el propietario abre la página de gestión de un recorrido con álbumes seleccionados de
  más de una categoría
- **THEN** ve esos álbumes agrupados por categoría, cada uno con su carátula, sin ver los álbumes
  no seleccionados

#### Scenario: Orden alfabético de la selección
- **WHEN** el propietario elige el orden alfabético en la vista de selección
- **THEN** los álbumes de cada grupo se reordenan por título, sin distinguir mayúsculas

#### Scenario: Cambiar a modo gráfico
- **WHEN** el propietario cambia la vista de selección a modo gráfico
- **THEN** ve una pared de carátulas de los álbumes seleccionados, agrupados por categoría, en vez
  de la lista

#### Scenario: Enlace desde el título de un álbum
- **WHEN** el propietario hace clic en el título de un álbum de la selección
- **THEN** llega a la página de ese álbum

#### Scenario: Quitar un álbum desde la vista de selección
- **WHEN** el propietario activa la acción de quitar sobre un álbum de la vista de selección
- **THEN** ese álbum desaparece de la vista y el botón "Guardar" pasa a estar habilitado, sin que
  la selección persistida cambie hasta que el propietario confirme

#### Scenario: Selección vacía no muestra esta vista
- **WHEN** la selección del recorrido está vacía
- **THEN** la página no muestra esta vista, y el editor aparece ya desplegado en su lugar

### Requirement: Foto del artista en el encabezado de gestión
El sistema SHALL mostrar la foto del artista en el encabezado de la página de gestión del
recorrido cuando el catálogo tiene una foto registrada para ese artista, y un reemplazo neutro —
mismo tratamiento que el resto del catálogo — cuando no la tiene. El nombre del artista en ese
mismo encabezado SHALL enlazar a la página de ese artista.

#### Scenario: Foto disponible
- **WHEN** el artista del recorrido tiene una foto registrada en el catálogo
- **THEN** el encabezado de la página de gestión la muestra

#### Scenario: Sin foto registrada
- **WHEN** el artista del recorrido no tiene ninguna foto registrada
- **THEN** el encabezado muestra el mismo reemplazo neutro que usa el resto del catálogo para
  artistas sin foto

#### Scenario: Enlace desde el nombre del artista
- **WHEN** el propietario hace clic en el nombre del artista en el encabezado de la página de
  gestión
- **THEN** llega a la página de ese artista

### Requirement: Registrar una escucha de un álbum desde la vista de selección
El sistema SHALL permitir al propietario registrar una escucha de cualquier álbum de su selección
directamente desde la vista de selección de la página de gestión, sin salir de la página. Registrar
una escucha SHALL crear una entrada de diario privada para ese álbum, con la misma semántica de
registro rápido que el resto del catálogo. Inmediatamente después de crearla, el sistema SHALL
desplegar, sobre esa misma entrada y sin salir de la página, el mismo panel de ampliación
(impresión, contexto, reacción y audiencia) que ya ofrece el registro rápido en el resto del
catálogo, desplazándolo a la vista si hiciera falta — salvo que ya haya otro panel de ampliación
abierto, caso en el que el sistema SHALL NOT reemplazarlo automáticamente: registrar otro álbum
mientras un panel está abierto SHALL marcarlo como escuchado igual, sin abrirle panel ni descartar
lo que el propietario esté completando en el que ya tenía abierto. El propietario SHALL poder
ocultar el panel abierto y volver a desplegarlo después, o desplegar el de otro álbum ya
registrado, mediante un control "Ampliar"/"Cerrar", sin que volver a desplegarlo cree una nueva
entrada. Cada álbum de la selección SHALL indicar si el propietario ya tiene al menos una escucha
registrada para él. El progreso del recorrido (selección escuchada) y su estado derivado (en
curso/completo) SHALL reflejar la escucha recién registrada de inmediato, sin recargar la página.
Un error al registrar SHALL dejar el estado del álbum como estaba, con un aviso, sin descartar el
borrador de selección en curso.

#### Scenario: Registrar una escucha marca el álbum como escuchado
- **WHEN** el propietario activa "Registrar escucha" sobre un álbum de la vista de selección que no
  tenía ninguna escucha registrada
- **THEN** ese álbum pasa a indicarse como escuchado, sin salir de la página de gestión

#### Scenario: El progreso se actualiza al instante
- **WHEN** el propietario registra una escucha de un álbum de su selección
- **THEN** la señal de progreso de la página de gestión refleja la nueva cantidad de álbumes
  escuchados sin recargar la página

#### Scenario: El recorrido pasa a completo al registrar la última escucha pendiente
- **WHEN** el propietario registra la escucha del único álbum de su selección que le faltaba
- **THEN** el recorrido pasa a mostrarse en estado completo, sin acción manual adicional sobre el
  estado

#### Scenario: El panel de ampliación se abre solo tras registrar
- **WHEN** el propietario registra una escucha de un álbum desde la vista de selección, sin tener
  ya otro panel de ampliación abierto
- **THEN** el sistema despliega, debajo de ese álbum, el panel para completar impresión, contexto,
  reacción y audiencia de la entrada recién creada, desplazándolo a la vista si hiciera falta, sin
  ninguna acción adicional

#### Scenario: Registrar otro álbum no reemplaza un panel ya abierto
- **WHEN** el propietario registra una escucha de un álbum mientras ya tiene abierto el panel de
  ampliación de otro álbum
- **THEN** el álbum recién registrado se marca como escuchado, pero el panel abierto sigue siendo
  el mismo, con lo que el propietario haya completado ahí intacto

#### Scenario: Cerrar y volver a abrir el panel no crea otra entrada
- **WHEN** el propietario oculta el panel de ampliación con "Cerrar" y luego lo vuelve a desplegar
  con "Ampliar"
- **THEN** el sistema muestra la misma entrada ya creada, sin registrar una escucha nueva

#### Scenario: Un error al registrar no descarta el borrador de selección
- **WHEN** registrar una escucha falla mientras el propietario tiene cambios sin guardar en el
  borrador de selección
- **THEN** el sistema muestra un aviso de error y el borrador de selección sin guardar no se pierde

#### Scenario: El editor de selección no ofrece esta acción
- **WHEN** el propietario tiene abierto el editor de selección (grilla de casilleros)
- **THEN** no encuentra ahí ninguna acción de registrar escucha — solo en la vista de selección

### Requirement: Quitar el registro de una escucha creada desde la vista de selección
El sistema SHALL ofrecer, junto a la marca de "escuchado" de un álbum, una acción "Quitar
registro" cuando la entrada de diario que lo marcó fue creada por el propietario en la misma
sesión de edición de esta página, que SHALL eliminar esa entrada de forma permanente y revertir la
marca de "escuchado" del álbum si no le queda ninguna otra escucha registrada. Activar "Registrar
escucha" o "Quitar registro" repetidamente sobre el mismo álbum SHALL NOT crear entradas de diario
adicionales: cada álbum SHALL exponer como máximo una de las dos acciones a la vez, nunca ambas, y
nunca una acción de "registrar de nuevo" mientras ya está marcado como escuchado. Un álbum marcado
como escuchado por una entrada que el propietario ya tenía antes de abrir esta sesión de edición
(creada desde el diario o desde la página del álbum) SHALL NOT ofrecer ninguna de las dos acciones
— el sistema no elige por su cuenta cuál de las escuchas existentes de ese álbum eliminar; gestionar
esas entradas sigue siendo una acción del diario propio. Un error al quitar un registro SHALL dejar
el estado del álbum como estaba, con un aviso, sin descartar el borrador de selección en curso. Si
el álbum quitado tenía su panel de ampliación abierto, el sistema SHALL cerrarlo.

#### Scenario: Quitar el registro revierte la marca de escuchado
- **WHEN** el propietario activa "Quitar registro" sobre un álbum cuya única escucha registrada la
  creó en esta misma sesión de edición
- **THEN** la entrada de diario se elimina y el álbum deja de indicarse como escuchado, sin salir
  de la página de gestión

#### Scenario: Un álbum solo ofrece una de las dos acciones a la vez
- **WHEN** el propietario ve un álbum de la vista de selección, esté o no marcado como escuchado
- **THEN** encuentra "Registrar escucha" o "Quitar registro", nunca ambas ni ninguna acción de
  "registrar de nuevo" sobre un álbum ya marcado

#### Scenario: Un álbum ya escuchado antes de esta sesión no ofrece ninguna de las dos acciones
- **WHEN** el propietario ve un álbum que ya estaba marcado como escuchado al abrir la página de
  gestión, sin haber registrado ni quitado ninguna escucha de él en esta sesión
- **THEN** el álbum se indica como escuchado sin ofrecer "Registrar escucha" ni "Quitar registro"

#### Scenario: Quitar el registro cierra su panel de ampliación
- **WHEN** el propietario quita el registro de un álbum cuyo panel de ampliación está abierto
- **THEN** el panel se cierra junto con la eliminación de la entrada

#### Scenario: Un error al quitar el registro no descarta el borrador de selección
- **WHEN** quitar un registro falla mientras el propietario tiene cambios sin guardar en el
  borrador de selección
- **THEN** el sistema muestra un aviso de error, el álbum sigue marcado como escuchado, y el
  borrador de selección sin guardar no se pierde

### Requirement: Indicador de escuchado con contraste suficiente en modo gráfico
En el modo gráfico de la vista de selección, el control de escuchado sobre cada carátula SHALL
distinguirse por forma además de color entre marcado y sin marcar — no solo por una diferencia de
tono que pueda perderse contra la propia carátula —, y SHALL permanecer perceptible como marcado
incluso cuando no ofrece ninguna acción (Requirement "Quitar el registro de una escucha creada
desde la vista de selección").

#### Scenario: El estado marcado se distingue por forma, no solo por color
- **WHEN** el propietario ve la grilla de carátulas del modo gráfico con álbumes marcados y sin
  marcar como escuchados
- **THEN** puede distinguir unos de otros por la forma del control (relleno sólido vs. hueco), sin
  depender únicamente de percibir la diferencia de color

#### Scenario: Un álbum escuchado sin acción disponible sigue marcado visualmente
- **WHEN** un álbum ya escuchado antes de esta sesión no ofrece "Registrar escucha" ni "Quitar
  registro" (Requirement "Quitar el registro de una escucha creada desde la vista de selección")
- **THEN** su control sigue mostrándose con el mismo relleno sólido que un álbum marcado con acción
  disponible, sin verse atenuado

### Requirement: Buscador en la selección de álbumes de una discografía
El sistema SHALL ofrecer un buscador por título dentro de la vista agrupada de selección de
álbumes de una discografía — tanto en el editor de la página de gestión como en el modal de
inicio, que comparten esa misma vista —, sin distinguir mayúsculas de minúsculas ni diacríticos
(una búsqueda sin tilde SHALL encontrar un título con tilde, y viceversa), filtrando localmente
sin ida y vuelta al servidor. Mientras el buscador tiene texto, cualquier grupo de categoría con
al menos un álbum coincidente SHALL mostrarse expandido, sin importar su estado de colapso
previo; los grupos sin ningún álbum coincidente SHALL NOT mostrarse. Al vaciar el buscador, el
estado de colapso previo a la búsqueda SHALL regir de nuevo. Si ningún álbum de la discografía
coincide con el texto buscado, el sistema SHALL mostrar un estado vacío localizado. El buscador
SHALL NOT alterar la selección ya hecha, ni el alcance de "Seleccionar todo"/"Deseleccionar todo"
de un grupo, que SHALL seguir aplicando al grupo completo, no solo a los álbumes visibles por la
búsqueda.

#### Scenario: Buscar filtra por título de álbum
- **WHEN** el propietario escribe en el buscador un texto que coincide con el título de algunos
  álbumes de la discografía
- **THEN** la vista muestra solo los álbumes cuyo título coincide, sin llamar al servidor

#### Scenario: Buscar sin distinguir diacríticos
- **WHEN** el propietario escribe el título de un álbum con tildes u otros diacríticos sin
  incluirlos, o a la inversa
- **THEN** el sistema encuentra el álbum correspondiente sin exigir que los diacríticos coincidan
  exactamente

#### Scenario: Un grupo con coincidencias se muestra expandido durante la búsqueda
- **WHEN** el propietario busca un título que pertenece a un grupo de categoría que estaba
  colapsado
- **THEN** ese grupo se muestra expandido mientras dure la búsqueda, sin necesidad de expandirlo
  a mano

#### Scenario: Un grupo sin coincidencias no se muestra durante la búsqueda
- **WHEN** ningún álbum de un grupo de categoría coincide con el texto buscado
- **THEN** ese grupo no se muestra mientras dure la búsqueda

#### Scenario: Vaciar la búsqueda restaura el colapso previo
- **WHEN** el propietario vacía el buscador después de haber expandido un grupo solo por efecto
  de la búsqueda
- **THEN** ese grupo vuelve a mostrarse colapsado si así estaba antes de buscar

#### Scenario: Búsqueda sin coincidencias
- **WHEN** el texto buscado no coincide con ningún álbum de la discografía
- **THEN** el sistema muestra un estado vacío localizado de "sin resultados"

#### Scenario: Buscar no altera la selección ni "Seleccionar todo"
- **WHEN** el propietario activa "Seleccionar todo" de un grupo mientras el buscador está
  filtrando solo algunos de sus álbumes
- **THEN** el sistema marca todos los álbumes del grupo completo, no solo los visibles por la
  búsqueda

