# social-profiles

## Purpose

Perfiles de usuario con visibilidad pública o privada, búsqueda de personas y configuración de
privacidad. Define qué identidad se expone en cada contexto y qué relación observa un visitante
frente a un perfil.
## Requirements
### Requirement: Visibilidad configurable del perfil
El sistema SHALL permitir que cada usuario configure su perfil como `public` o `private`. Los
usuarios nuevos SHALL comenzar con perfil público. El usuario SHALL poder cambiar esta
configuración desde una superficie autenticada sin modificar ni borrar sus actividades.

#### Scenario: Perfil público por defecto
- **WHEN** se crea un usuario nuevo
- **THEN** su perfil queda configurado como público

#### Scenario: Cambiar a perfil privado
- **WHEN** un usuario autenticado cambia la visibilidad a privada
- **THEN** el perfil requiere aprobación para nuevos seguidores y sus contenidos sociales quedan
  sujetos a las reglas de privacidad de perfil privado

### Requirement: Perfil público y perfil privado

El sistema SHALL exponer un perfil por identificador público estable, como username. Un
perfil SHALL mostrar siempre su **identidad extendida**: nombre visible, username,
"miembro desde", bio, enlaces externos y los contadores de seguidores y de seguidos. Los
pronombres, el país y la ciudad o región SHALL mostrarse solo a quien tiene acceso al perfil
(el dueño, cualquier visitante de un perfil público y un seguidor aprobado de uno privado; ver
`profile-personal-info`).

Un perfil **público** SHALL mostrar además su huella de gusto, sus destacados, su himno y
sus actividades y listas con audiencia compatible con el visitante.

Un perfil **privado** consultado por un visitante no autorizado (anónimo, sin relación
aceptada, o con solicitud pendiente) SHALL mostrar únicamente la identidad extendida y
SHALL NOT exponer su huella de gusto, sus destacados, su himno, sus actividades, ni sus
listados sociales (seguidores, seguidos, diario, favoritos, listas, colección).

Ninguna vista del perfil SHALL incluir conteos de progreso, elementos pendientes de
valorar, rachas ni medallas de completitud.

#### Scenario: Visitante consulta perfil público

- **WHEN** un visitante abre un perfil público
- **THEN** ve la identidad extendida, la huella de gusto, los destacados y el contenido
  permitido por la audiencia de cada elemento

#### Scenario: Visitante consulta perfil privado

- **WHEN** un visitante que no sigue a un usuario con relación aceptada abre su perfil
  privado
- **THEN** ve su identidad extendida (incluidos bio, enlaces y contadores de
  seguidores/seguidos) y un aviso de perfil privado
- **AND** no ve sus pronombres, país ni ciudad, ni su huella de gusto, destacados, himno,
  diario, favoritos, listas, colección ni sus listados de seguidores o seguidos

#### Scenario: Seguidor aprobado consulta perfil privado

- **WHEN** un seguidor con relación aceptada abre el perfil privado que sigue
- **THEN** ve la misma composición que un visitante de un perfil público, limitada a las
  actividades cuya audiencia lo alcanza

### Requirement: Búsqueda de usuarios

El sistema SHALL permitir buscar usuarios por username o nombre visible desde una superficie dedicada en `/users` y, además, desde el buscador global con el tipo **Usuarios** (`/search?type=user`, capacidad `search-scopes`), que aplica exactamente las mismas reglas. Los resultados de usuarios SHALL NOT mezclarse con resultados de catálogo: solo aparecen cuando el tipo activo es Usuarios. La búsqueda SHALL mostrar tanto perfiles públicos como privados y SHALL omitir email, password hash, tokens, actividades privadas y datos internos. La interfaz SHALL identificar la superficie con la terminología localizada de Usuarios, SHALL conservar el estado de relación y la acción social correspondiente cuando aplique, SHALL comunicar el término y los resultados cargados, y SHALL permitir continuar la búsqueda cuando existan más páginas.

#### Scenario: Encontrar perfil privado

- **WHEN** una persona busca el username de un perfil privado
- **THEN** el resultado muestra el nombre identificable y una acción `Seguir`, sin mostrar sus actividades

#### Scenario: Búsqueda sin coincidencias

- **WHEN** una búsqueda no encuentra usuarios
- **THEN** la UI muestra un estado vacío localizado y no un error técnico

#### Scenario: Búsqueda desde la superficie social

- **WHEN** una persona accede a `/users` desde un enlace contextual de Home o desde Footer
- **THEN** ve un formulario de búsqueda social y sus resultados debajo del formulario, sin ser redirigida a `/search`

#### Scenario: Separación del buscador musical

- **WHEN** una persona utiliza el buscador del Header con un tipo de catálogo (Artistas, Álbumes o Canciones)
- **THEN** la navegación continúa dirigiendo a `/search` con ese tipo y no mezcla resultados de usuarios; los usuarios solo aparecen al elegir el tipo Usuarios

#### Scenario: Navegación de usuarios fuera del Header

- **WHEN** se renderiza el Header global
- **THEN** no se muestra un enlace fijo a `/users` dentro de la navegación principal

#### Scenario: Presentación responsive de resultados

- **WHEN** se muestran resultados de usuarios en un viewport móvil o de escritorio
- **THEN** las tarjetas permanecen legibles, accesibles y no generan overflow horizontal

#### Scenario: Término persistido en la URL

- **WHEN** una persona realiza una búsqueda válida en `/users`
- **THEN** la URL conserva el término en el parámetro `q` y la pantalla mantiene la búsqueda social y sus resultados

#### Scenario: Restaurar una búsqueda compartida

- **WHEN** una persona abre `/users?q=ana`
- **THEN** el campo se inicializa con `ana` y la pantalla ejecuta la búsqueda correspondiente sin navegar a `/search`

#### Scenario: Carga incremental de resultados

- **WHEN** la respuesta de búsqueda indica `hasNext=true`
- **THEN** la UI muestra una acción localizada para cargar la siguiente página y agrega sus usuarios a los resultados existentes sin reemplazarlos

#### Scenario: Carga sin bloquear resultados existentes

- **WHEN** una persona solicita otra página de resultados
- **THEN** las tarjetas ya cargadas permanecen visibles, la acción queda ocupada y no se envían requests duplicadas

#### Scenario: Error recuperable de búsqueda

- **WHEN** falla la request inicial o una request de paginación
- **THEN** la UI muestra un error localizado sin ocultar el formulario ni los resultados ya cargados y permite reintentar

#### Scenario: Estado accesible de carga

- **WHEN** la búsqueda inicial está en curso
- **THEN** la zona de resultados comunica que está ocupada y muestra una indicación visual de carga sin anunciar contenido redundante

### Requirement: Perfil autenticado y configuración
El sistema SHALL permitir al usuario autenticado consultar su propio perfil y actualizar su
visibilidad y su nombre visible. La respuesta SHALL incluir el estado de seguimiento relevante
para el visitante cuando corresponda, sin exponer información de autenticación. El nombre visible
SHALL recortarse y, si queda vacío, SHALL guardarse como ausente para que el sitio muestre el
username en su lugar.

#### Scenario: Usuario actualiza su privacidad
- **WHEN** el usuario autenticado guarda un cambio de visibilidad válido
- **THEN** la configuración se persiste y la UI refleja el nuevo estado sin cerrar la sesión

#### Scenario: Visitante no autenticado intenta actualizar privacidad
- **WHEN** una request sin sesión intenta cambiar la visibilidad de un perfil
- **THEN** la API responde `401` con código `AUTH_REQUIRED` y no modifica datos

#### Scenario: Usuario actualiza su nombre visible
- **WHEN** el usuario autenticado guarda un nombre visible válido
- **THEN** el nombre se persiste y las superficies que muestran su nombre reflejan el nuevo valor

### Requirement: Ruta canónica del perfil

El sistema SHALL servir el perfil de cualquier usuario, incluido el propio, en una única
ruta canónica basada en el username (`/users/{username}`). El sistema SHALL NOT exponer una
ruta de perfil separada para el dueño. Las superficies de gestión bajo `/me/*` SHALL
conservarse como destinos de gestión enlazados desde el área de ajustes (`/me/settings`) y
desde el menú de usuario.

#### Scenario: El dueño abre su propio perfil

- **WHEN** un usuario autenticado navega a `/users/{su-username}`
- **THEN** ve su perfil con las capas de dueño (barra del dueño con el interruptor "Editar
  perfil", tarjeta de acceso a Ajustes, elementos privados marcados, previsualización "cómo te
  ven"); los controles de edición aparecen solo al activar el modo edición

#### Scenario: Enlace al perfil propio desde otra superficie

- **WHEN** un usuario pulsa el acceso a "mi perfil" desde el Header o el Inicio
- **THEN** llega a `/users/{su-username}` y no a una ruta de perfil distinta

### Requirement: Panel del dueño

La cabecera del perfil, vista por su dueño, SHALL mostrar bajo los recuentos una línea con el
número de solicitudes de seguimiento pendientes, enlazada a `/me/follow-requests`, cuando sea
mayor que cero, presentada como bandeja de entrada y no como métrica de logro. La vista del dueño
SHALL NOT incluir una tarjeta de acceso a los ajustes ni listar las superficies de biblioteca
(`/me/diary`, `/me/favorites`, `/me/lists`, `/me/collection` y similares), que se alcanzan desde el
menú de usuario; el acceso a Privacidad y audiencia es la marca de visibilidad junto al nombre (ver
`profile-edit-mode`). La vista del dueño SHALL ofrecer una previsualización que muestre el perfil
tal como lo ve un visitante público y tal como lo ve un visitante no autorizado.

El conjunto de destinos de gestión de red y de cuenta (seguidores, seguidos, solicitudes de
seguimiento, cuentas bloqueadas y ajustes) enlazados por el área de ajustes y el conjunto
expuesto por el menú de usuario del Header SHALL derivarse de una única definición compartida, de
modo que ambos permanezcan sincronizados. La definición compartida PODRÁ marcar destinos que
correspondan solo a una de las dos superficies (por ejemplo, el enlace al propio perfil, propio
del menú del Header, o las cuentas bloqueadas, propias del área de ajustes).

#### Scenario: Solicitudes pendientes en el panel

- **WHEN** el dueño abre su perfil y tiene solicitudes de seguimiento pendientes
- **THEN** bajo los recuentos ve cuántas solicitudes tiene, con un enlace a `/me/follow-requests`,
  y la pantalla Red de los ajustes lo muestra junto al enlace a `/me/follow-requests`

#### Scenario: Sin solicitudes pendientes

- **WHEN** el dueño abre su perfil y no tiene solicitudes pendientes
- **THEN** la cabecera no muestra ninguna línea ni indicador numérico de solicitudes

#### Scenario: Previsualizar "cómo te ven"

- **WHEN** el dueño activa la previsualización de vista pública o de vista no autorizada
- **THEN** el perfil se re-renderiza con la composición correspondiente a esa relación, sin
  los controles de edición del dueño

#### Scenario: Panel y menú del Header comparten destinos

- **WHEN** se añade, quita o renombra un destino de red o de cuenta en la definición compartida
- **THEN** la pantalla Red de los ajustes y el menú de usuario del Header reflejan el mismo
  cambio sin edición por separado

### Requirement: Reportar y suspender desde el perfil

El perfil de un usuario SHALL ofrecer reportar al dueño del perfil a cualquier usuario autenticado y,
solo a moderadores, suspender su actividad social con expiración y motivo.

#### Scenario: Usuario reporta un perfil desde su página
- **WHEN** un usuario autenticado visita el perfil de otra persona y confirma un reporte con motivo
- **THEN** se crea un reporte pendiente de perfil con el mismo endpoint de reportes

#### Scenario: Usuario normal no ve la suspensión
- **WHEN** un usuario sin `moderation.suspend_social` visita un perfil
- **THEN** solo ve la acción de reportar, nunca la de suspender

### Requirement: Composición visual única para dueño y visitante autorizado

La vista del dueño SHALL usar la misma composición estructural (columnas y orden de
secciones) que la vista de un visitante autorizado sobre el mismo perfil. Las capas propias
del dueño (edición inline, panel de gestión, previsualización "cómo te ven") SHALL
superponerse a esa misma composición en vez de reemplazarla por una estructura distinta.

#### Scenario: El dueño ve la misma estructura que un visitante autorizado

- **WHEN** el dueño abre su propio perfil
- **THEN** ve las mismas columnas y el mismo orden de secciones que vería un seguidor
  aprobado, con los controles de edición superpuestos a esa estructura

#### Scenario: La previsualización no introduce una estructura distinta

- **WHEN** el dueño activa la previsualización de "cómo te ven"
- **THEN** ve la misma composición estructural, filtrada según el nivel de acceso
  simulado, sin cambiar de columnas ni de orden de secciones

### Requirement: Composición del perfil por niveles de acceso

El perfil SHALL componerse desde un único árbol de componentes con tres niveles de acceso
determinados por la relación del visitante: no autorizado, autorizado (público o seguidor
aprobado) y dueño. La identidad extendida SHALL renderizarse en los tres niveles. El aviso
de perfil privado y su llamada a la acción de seguir SHALL renderizarse solo en el nivel no
autorizado sobre un perfil privado.

La huella de gusto, la sección "Empieza por aquí", la sección "Valoraciones destacadas", la
sección "Reseñas", la sección "En rotación", la sección "Artistas seguidos" (antes
"Exploración"), la Tarjeta de Identidad y los estantes de contenido SHALL renderizarse solo
en los niveles autorizado y dueño, organizados en tres niveles de profundidad:

- **Nivel 1** (comprensible en segundos): la cabecera del perfil, con la identidad extendida
  y la Tarjeta de Identidad (artista definitorio, álbum definitorio e himno; ver
  `profile-showcase`), y la franja de identidad (ficha, resumen de la huella de gusto y
  "Artistas seguidos").
- **Nivel 2** (exploración de minutos, resumida): en filas (ver "Cuerpo del perfil en
  filas"), en este orden, "En rotación", "Empieza por aquí" (ver `profile-showcase`) con
  "Valoraciones destacadas" (ver `rating-highlights`), "Reseñas" con el diario, Favoritos,
  "Listas" con la colección física, y Conciertos.
- **Nivel 3** (inmersión bajo demanda, accesible desde el enlace de cada sección del Nivel 2
  o de la franja, nunca precargada): la huella de gusto completa, el diario completo, todas
  las valoraciones, todas las listas, los recorridos de artista y la colección física.

"En rotación" SHALL ubicarse antes de "Empieza por aquí"; "Empieza por aquí" antes de
"Valoraciones destacadas" (a su izquierda en la misma fila); y "Valoraciones destacadas"
antes de "Reseñas". "Artistas seguidos" SHALL ubicarse en la franja de identidad, antes de
todas las secciones del Nivel 2. La huella de gusto completa (curvas y crestas) SHALL NOT
renderizarse junto a estas secciones de Nivel 2: SHALL vivir en el Nivel 3, accesible
mediante un enlace desde el perfil.

#### Scenario: Perfil privado sin autorización

- **WHEN** se compone la vista de un perfil privado para un visitante sin autorización
- **THEN** se muestran la identidad extendida, el aviso de perfil privado y la acción de
  seguir o solicitar, y nada más

#### Scenario: Estante de contenido vacío

- **WHEN** un visitante autorizado abre un perfil cuyo diario, favoritos, listas o
  colección no tienen elementos visibles
- **THEN** ese estante no se muestra y el resto del perfil se compone sin espacios vacíos

#### Scenario: "Empieza por aquí" en el nivel autorizado

- **WHEN** un visitante autorizado abre un perfil cuyo dueño tiene ítems en "Empieza por aquí"
- **THEN** ve la sección en el Nivel 2, después de "En rotación" y antes de "Valoraciones
  destacadas"; un visitante no autorizado de un perfil privado no la ve

#### Scenario: El perfil no repite álbumes favoritos

- **WHEN** un visitante autorizado abre un perfil cuyo dueño tiene favoritos de álbum
- **THEN** esos álbumes aparecen solo en la sección Favoritos, no en una sección aparte de
  "Álbumes favoritos"

#### Scenario: "Reseñas" en el nivel autorizado

- **WHEN** un visitante autorizado abre un perfil cuyo dueño ha escrito al menos una reseña
  de álbum
- **THEN** ve la sección "Reseñas" después de "Valoraciones destacadas", junto al diario,
  dentro del Nivel 2; un visitante no autorizado de un perfil privado no la ve

#### Scenario: "En rotación" en el nivel autorizado

- **WHEN** un visitante autorizado abre un perfil cuyo dueño tiene actividad de diario
  reciente visible para él que alcanza el umbral de rotación
- **THEN** ve la sección "En rotación" como primera del Nivel 2, después de la franja de
  identidad; un visitante no autorizado de un perfil privado no la ve

#### Scenario: "Exploración" en el nivel autorizado

- **WHEN** un visitante autorizado abre un perfil cuyo dueño sigue a al menos un artista
- **THEN** ve esos artistas bajo "Artistas seguidos" en la franja de identidad, antes de
  las secciones del Nivel 2; un visitante no autorizado de un perfil privado no la ve

#### Scenario: Estado bloqueado

- **WHEN** el visitante y el dueño del perfil tienen una relación de bloqueo
- **THEN** el perfil muestra el estado de bloqueo y su acción correspondiente, sin huella,
  "Empieza por aquí", "Reseñas", "En rotación", "Artistas seguidos", Tarjeta de Identidad
  ni estantes

#### Scenario: Huella de gusto degradada al Nivel 3

- **WHEN** un visitante autorizado abre un perfil
- **THEN** no ve los gráficos de la huella de gusto junto a "Empieza por aquí", las
  valoraciones destacadas ni los artistas seguidos; los encuentra en la vista de Nivel 3
  enlazada desde el perfil

#### Scenario: Valoraciones destacadas en el nivel autorizado

- **WHEN** un visitante autorizado abre un perfil cuyo dueño tiene valoraciones destacadas
  visibles para él
- **THEN** ve la sección "Valoraciones destacadas" junto a "Empieza por aquí" y antes de
  "Reseñas"

### Requirement: Cabecera del perfil

En los niveles autorizado y dueño, el perfil SHALL abrirse con una cabecera a todo el ancho
que reúne, en un mismo bloque, la identidad extendida de la persona (avatar, nombre visible
como título principal, nombre de usuario, pronombres, ubicación, antigüedad, hora local
cuando corresponde, bio y enlaces), sus acciones (seguir o su estado, compartir y, cuando
corresponde, bloquear, reportar o moderar), los recuentos de seguidores y seguidos, los
seguidores en común y la afinidad con el visitante cuando existen, y la Tarjeta de Identidad
(ver `profile-showcase`) bajo el rótulo «Identidad musical». Cuando el dueño eligió un álbum
definitorio, su carátula SHALL usarse, difuminada, como fondo decorativo de la cabecera. La
bio SHALL presentarse como una cita. Debajo de la cabecera, el perfil SHALL ofrecer una barra
de navegación fija con anclas a sus secciones visibles (Resumen, Diario, Reseñas, Favoritos,
Listas y Colección, cada una solo si tiene contenido visible y con su recuento cuando lo
tiene). El perfil SHALL NOT usar una columna lateral fija: el contenido debajo de la cabecera
SHALL ocupar todo el ancho del contenedor.

#### Scenario: Perfil público con identidad completa
- **WHEN** un visitante sin sesión abre un perfil público cuyo dueño eligió artista, álbum e
  himno definitorios
- **THEN** ve en la primera pantalla el nombre, la bio como cita, «Seguir», «Compartir», los
  recuentos y los tres elementos de «Identidad musical», con la carátula del álbum
  difuminada de fondo

#### Scenario: Sin álbum definitorio
- **WHEN** el dueño no eligió álbum definitorio
- **THEN** la cabecera usa un fondo neutro y muestra los elementos de la Tarjeta de
  Identidad que existan, sin huecos

#### Scenario: Anclas solo a secciones con contenido
- **WHEN** un visitante abre un perfil sin colección física visible
- **THEN** la barra de navegación no ofrece el ancla «Colección»

#### Scenario: Identidad musical en un teléfono
- **WHEN** un visitante abre un perfil con artista, álbum e himno definitorios en una
  pantalla de 390 px
- **THEN** los tres elementos de «Identidad musical» se ven completos dentro de la pantalla,
  con sus títulos recortados si no caben

#### Scenario: Artista definitorio con foto
- **WHEN** el artista definitorio tiene una foto disponible en el catálogo
- **THEN** la Tarjeta de Identidad muestra esa foto, igual que el resto del perfil

### Requirement: Franja de identidad

Inmediatamente después de la cabecera, en los niveles autorizado y dueño, el perfil SHALL
mostrar una franja a todo el ancho con, cuando tengan contenido, tres partes separadas: la
ficha musical (ver `profile-music-identity`), el resumen de la huella de gusto (ver
`taste-fingerprint`) con su década predominante destacada, y los artistas que el dueño sigue
bajo el rótulo «Artistas seguidos», con un enlace a la lista completa. Cada parte SHALL
omitirse cuando no tiene contenido, sin dejar hueco, y la franja SHALL omitirse por completo
cuando ninguna lo tiene.

#### Scenario: Franja completa
- **WHEN** un visitante autorizado abre un perfil con ficha, huella calculable y artistas
  seguidos
- **THEN** ve debajo de la cabecera la ficha, la huella con su década predominante y los
  artistas seguidos, uno junto a otro en escritorio

#### Scenario: Sin huella de gusto
- **WHEN** la huella de gusto no tiene datos suficientes para el visitante
- **THEN** la franja muestra la ficha y los artistas seguidos sin espacio vacío

### Requirement: Cuerpo del perfil en filas

En los niveles autorizado y dueño, después de la franja de identidad, el cuerpo del perfil
SHALL componerse en filas a todo el ancho del contenedor, en este orden: "En rotación";
"Empieza por aquí" junto a "Valoraciones destacadas"; "Reseñas" junto al diario; Favoritos;
"Listas" (las listas y las listas para completar del dueño) junto a la colección física; y
Conciertos. En una pantalla angosta, las secciones de una misma fila SHALL apilarse en ese
orden. Cuando una de las dos secciones de una fila no tiene contenido, la otra SHALL ocupar la
fila completa, sin hueco.

Cada sección SHALL tener un título, su recuento cuando lo tiene y, cuando existe una vista
completa de Nivel 3, un enlace a ella; SHALL NOT tener subtítulos ni numeración. Las vistas
previas SHALL ser acotadas y legibles sin controles propios: el diario SHALL mostrarse como
una tabla de sus entradas más recientes (fecha, obra y tipo de escucha) sin desplazamiento
interno; Favoritos SHALL mostrar las carátulas de sus álbumes y, al lado, sus artistas y
canciones; la colección física SHALL mostrar sus copias más recientes sin selector de modo de
visualización (que sigue en la vista completa). El perfil SHALL NOT repetir al final un
bloque aparte de enlaces a las vistas de Nivel 3.

Las acciones que requieren sesión sobre el contenido ajeno del perfil (guardar o seguir una
lista, seguir el progreso de una lista para completar) SHALL ofrecerse solo a un visitante autenticado
que no es el dueño.

#### Scenario: Filas completas en escritorio

- **WHEN** un visitante autorizado abre en escritorio un perfil con contenido en todas las
  secciones
- **THEN** ve "En rotación", luego "Empieza por aquí" y "Valoraciones destacadas" lado a lado,
  luego "Reseñas" y el diario lado a lado, Favoritos, "Listas" y la colección
  física lado a lado, y Conciertos

#### Scenario: Una sección de la fila vacía

- **WHEN** el dueño no tiene valoraciones destacadas pero sí ítems en "Empieza por aquí"
- **THEN** "Empieza por aquí" ocupa la fila completa

#### Scenario: Diario sin caja de desplazamiento

- **WHEN** un visitante autorizado ve el diario en el perfil
- **THEN** ve una tabla con las entradas más recientes, completa sin desplazarse dentro de
  ella, y un enlace al diario completo

#### Scenario: Colección sin selector de vista

- **WHEN** un visitante autorizado ve la colección física en el perfil
- **THEN** ve sus copias más recientes sin selector de modo de visualización, con un enlace a
  la colección completa, donde sí puede cambiarlo

#### Scenario: Visitante sin sesión

- **WHEN** un visitante sin sesión ve las listas y las listas para completar de un perfil público
- **THEN** no se le ofrecen las acciones de guardar, seguir ni seguir el progreso

#### Scenario: Sin bloque de enlaces al final

- **WHEN** un visitante autorizado llega al final del perfil
- **THEN** no encuentra una lista aparte de enlaces a las vistas completas: cada sección
  enlaza la suya desde su título

### Requirement: Tono del perfil

Cada perfil SHALL tener un tono de acento derivado de la carátula de su álbum definitorio (ver
`profile-showcase`): el matiz dominante de la carátula, con saturación y luminosidad acotadas para que
el tono contraste al menos 3:1 con el fondo del sitio. El tono SHALL calcularse en el servidor cuando el
dueño elige o cambia su álbum definitorio, SHALL guardarse con el perfil y SHALL NOT recalcularse al
mostrar el perfil. Cuando el dueño no tiene álbum definitorio, la carátula no tiene arte o no tiene un
matiz dominante suficientemente saturado, el tono SHALL ser el ámbar del sitio. El tono SHALL usarse
solo en detalles de la página del perfil accesible —la línea inferior de la cabecera, las comillas de
la bio, la marca de la sección activa de la barra de anclas y la etiqueta del vinilo de la Tarjeta de
Identidad—, nunca en textos de lectura, valoraciones ni en otras páginas.

#### Scenario: Tono desde la carátula

- **WHEN** el dueño elige como álbum definitorio uno cuya carátula es predominantemente roja
- **THEN** su perfil usa un tono rojo en la línea de la cabecera, las comillas de la bio, la sección
  activa de las anclas y la etiqueta del vinilo

#### Scenario: Sin álbum definitorio

- **WHEN** el dueño no tiene álbum definitorio, o lo quita
- **THEN** su perfil usa el ámbar del sitio en esos mismos detalles

#### Scenario: Carátula sin color dominante

- **WHEN** la carátula del álbum definitorio es en blanco y negro o casi sin saturación
- **THEN** el perfil usa el ámbar del sitio

#### Scenario: Contraste mínimo

- **WHEN** el matiz dominante de la carátula, con la luminosidad de referencia, contrasta menos de 3:1
  con el fondo del sitio
- **THEN** el tono guardado se aclara hasta alcanzar ese contraste

#### Scenario: El tono no se calcula al visitar

- **WHEN** un visitante abre un perfil
- **THEN** el tono se lee guardado, sin descargar ni analizar la carátula en esa visita

#### Scenario: Perfiles anteriores al tono

- **WHEN** se despliega el cambio con perfiles que ya tenían álbum definitorio
- **THEN** un script operativo calcula y guarda su tono, y hasta que corra esos perfiles usan el ámbar

### Requirement: Vista del perfil privado sin acceso

Un perfil privado consultado por quien no tiene acceso SHALL presentarse con la misma cabecera del
perfil accesible (ver "Cabecera del perfil"): avatar, nombre visible como título principal, nombre de
usuario, antigüedad, bio como cita, enlaces, recuentos de seguidores y seguidos y la acción para
compartir, junto a una marca «Privado». Esa cabecera SHALL NOT incluir la Tarjeta de Identidad, el fondo
de carátula, los pronombres, el país ni la ciudad, ni la afinidad; los recuentos SHALL NOT enlazar a los
listados de conexiones. Debajo, en lugar del cuerpo del perfil, SHALL mostrarse una franja a todo el
ancho con un título, una sola oración y la acción que corresponde a quien mira, y las siluetas de las
secciones que se abren al seguir (Diario, Favoritos, Listas y Colección física): siempre las cuatro y
sin ningún dato, recuento ni carátula, para no revelar actividad de la cuenta. La palabra «privado» SHALL
aparecer una sola vez como marca, sin repetirse en rótulo y título.

Según quien mira:

- **Sin sesión**: invita a iniciar sesión para pedir seguir, con un acceso secundario para crear una
  cuenta.
- **Con sesión, sin relación**: ofrece pedir seguir y, cuando los hay, indica cuántos seguidores tienen
  en común (ver `profile-affinity`).
- **Solicitud enviada**: indica que la solicitud está pendiente, que se le avisará cuando la acepte y
  que el perfil se abrirá en esa misma página, y ofrece cancelarla.
- **Solicitud recibida de esa cuenta**: indica que esa cuenta pidió seguirle y permite responder.
- **Bloqueo hecho por quien mira**: indica el bloqueo y ofrece desbloquear, sin siluetas.
- **Bloqueo hecho por la cuenta**: solo el nombre visible y el usuario, sin bio, enlaces, recuentos,
  siluetas ni acciones.
- **Previsualización «cómo te ven» del dueño**: la vista de un visitante sin sesión, con la acción
  inerte y el aviso para volver.

#### Scenario: Visitante sin sesión

- **WHEN** un visitante sin sesión abre un perfil privado
- **THEN** ve la cabecera con la marca «Privado», la franja «Solo para seguidores» con la invitación a
  iniciar sesión y las siluetas de las cuatro secciones, sin datos ni recuentos

#### Scenario: Solicitud enviada

- **WHEN** quien pidió seguir abre el perfil privado
- **THEN** la franja indica que la solicitud está pendiente, que se le avisará y que el perfil se
  abrirá ahí, y ofrece cancelarla

#### Scenario: Recuentos sin listados

- **WHEN** un visitante sin acceso pulsa el recuento de seguidores de un perfil privado
- **THEN** no navega al listado de seguidores: el recuento es solo texto

#### Scenario: Bloqueado por la cuenta

- **WHEN** quien fue bloqueado por la cuenta abre su perfil privado
- **THEN** ve solo el nombre visible y el usuario, sin bio, enlaces, recuentos, siluetas ni acciones

#### Scenario: Siluetas sin actividad

- **WHEN** el dueño de un perfil privado no tiene diario, favoritos, listas ni colección
- **THEN** un visitante sin acceso ve igualmente las cuatro siluetas, idénticas a las de un perfil
  con contenido

#### Scenario: Teléfono

- **WHEN** un visitante sin acceso abre un perfil privado en una pantalla de 390 px
- **THEN** la cabecera, la franja y las siluetas se apilan sin desplazamiento horizontal

### Requirement: Aviso para quien no sigue un perfil público

Un perfil accesible visto por quien no es su dueño y no lo sigue (sin sesión, con sesión sin relación,
con una solicitud recibida de esa cuenta, o el dueño en la previsualización «cómo te ven») SHALL
terminar su cuerpo con un aviso genérico: «Si sigues a @usuario, verás también lo que comparte solo
con sus seguidores», con la acción de seguir (o de iniciar sesión para seguir; inerte en la
previsualización; sin acción cuando hay una solicitud recibida, que se responde desde la cabecera).
El aviso SHALL mostrarse a todo visitante que no sigue, haya o no contenido solo para seguidores, y
SHALL NOT indicar qué secciones ni cuántos elementos están ocultos (ver `diary-visibility`).

Cuando ninguna sección del cuerpo ni de la franja de identidad tiene contenido visible para ese
visitante, el cuerpo SHALL mostrar en su lugar «Nada público por ahora», con una oración equivalente
y la misma acción (sin sesión, además, un acceso para crear una cuenta).

El dueño y quien sigue el perfil SHALL NOT ver el aviso ni el estado vacío.

#### Scenario: Perfil con contenido público

- **WHEN** un visitante sin sesión abre un perfil público con secciones visibles
- **THEN** ve las secciones y, al final, el aviso genérico con la acción de iniciar sesión para seguir

#### Scenario: Sin nada oculto

- **WHEN** un visitante que no sigue abre un perfil público cuyo contenido es todo público
- **THEN** ve igualmente el aviso genérico, idéntico al de un perfil con contenido solo para seguidores

#### Scenario: Nada visible

- **WHEN** un visitante que no sigue abre un perfil público en el que ninguna sección tiene contenido
  visible para él
- **THEN** debajo de la cabecera ve «Nada público por ahora», la oración y la acción, en lugar de un
  cuerpo vacío

#### Scenario: Seguidor

- **WHEN** quien sigue el perfil lo abre
- **THEN** no ve el aviso ni el estado vacío

#### Scenario: Dueño

- **WHEN** el dueño abre su propio perfil sin previsualizar
- **THEN** no ve el aviso ni el estado vacío

### Requirement: Marcas de audiencia y acciones para agregar del dueño

En la vista del dueño (no en la previsualización "cómo te ven"), las entradas del diario, los
favoritos y las listas (incluidas las listas para completar) que el cuerpo del perfil muestra SHALL
llevar una marca con su audiencia cuando no sea pública: "Seguidores" para solo seguidores y "Solo
tú" para privada; los elementos públicos SHALL NOT llevar marca. Los estantes Diario, Favoritos,
Listas y Colección física SHALL ofrecer al dueño, junto a la vista completa, una acción para agregar
que abre la acción correspondiente del diálogo "Añadir" del sitio (registrar una escucha, marcar un
favorito, crear una lista, agregar a la colección), también cuando el estante está vacío; al
cerrarlo tras un cambio, el perfil SHALL mostrar lo agregado sin recargar a mano. Un visitante, y el
dueño en la previsualización, SHALL NOT ver marcas de audiencia ni acciones para agregar.

#### Scenario: Entrada solo para seguidores

- **WHEN** el dueño abre su perfil y una de las entradas recientes del diario es solo para seguidores
- **THEN** esa fila lleva la marca "Seguidores" y las entradas públicas no llevan marca

#### Scenario: Lista privada

- **WHEN** el dueño abre su perfil y una de sus listas es privada
- **THEN** su tarjeta lleva la marca "Solo tú"

#### Scenario: Registrar desde el diario

- **WHEN** el dueño pulsa "Registrar" en el estante Diario, registra una escucha y cierra el diálogo
- **THEN** el diálogo abre en la acción Escucha y, al cerrarlo, el diario del perfil muestra la entrada nueva

#### Scenario: Visitante y previsualización

- **WHEN** un visitante, o el dueño en "Ver como visitante", abre el perfil
- **THEN** no ve marcas de audiencia ni acciones para agregar

### Requirement: Franja «Tu perfil» del dueño

Cuando el dueño ve su propio perfil (no en «Ver como visitante») y le falta alguna de siete partes
—Foto, Bio, Identidad musical, Ficha, Empieza por aquí, Preguntas y Enlaces—, SHALL mostrarse bajo la
cabecera una franja «Tu perfil · N de 7», donde N es el número de partes completas, con una barra de
progreso. Cada parte completa SHALL mostrarse con una marca y sin acción; cada parte pendiente SHALL
ser un botón que abre el panel de edición del bloque que la contiene, sin necesidad de activar el modo
edición. La franja SHALL ofrecer «Ocultar», que la esconde en ese dispositivo, y SHALL NOT mostrarse
con las siete partes completas ni a ningún visitante.

#### Scenario: Perfil incompleto

- **WHEN** el dueño, sin preguntas respondidas ni enlaces, ve su perfil
- **THEN** ve «Tu perfil · 5 de 7» con «Preguntas» y «Enlaces» como acciones pendientes

#### Scenario: Una parte pendiente abre su editor

- **WHEN** el dueño pulsa «Enlaces» en la franja
- **THEN** se abre el panel de la cabecera con el editor de enlaces

#### Scenario: Perfil completo

- **WHEN** el dueño tiene las siete partes completas
- **THEN** la franja no se muestra

#### Scenario: Ocultar

- **WHEN** el dueño pulsa «Ocultar» y vuelve a cargar su perfil en el mismo dispositivo
- **THEN** la franja no se muestra

#### Scenario: Visitante y vista previa

- **WHEN** un visitante ve un perfil incompleto, o el dueño lo ve con «Ver como visitante»
- **THEN** la franja no se muestra

