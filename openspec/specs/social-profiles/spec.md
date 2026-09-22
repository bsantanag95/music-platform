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

El sistema SHALL permitir buscar usuarios por username o nombre visible desde una superficie dedicada en `/users`, separada de la búsqueda del catálogo musical en `/search`. La búsqueda SHALL mostrar tanto perfiles públicos como privados y SHALL omitir email, password hash, tokens, actividades privadas y datos internos. La interfaz SHALL identificar la superficie con la terminología localizada de Usuarios, SHALL conservar el estado de relación y la acción social correspondiente cuando aplique, SHALL comunicar el término y los resultados cargados, y SHALL permitir continuar la búsqueda cuando existan más páginas.

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

- **WHEN** una persona utiliza el buscador musical del Header
- **THEN** la navegación continúa dirigiendo a `/search` y no mezcla resultados de usuarios

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

La vista del dueño SHALL incluir una tarjeta "Ajustes" que enlace al área de ajustes
(`/me/settings`) y muestre un indicador con el número de solicitudes de seguimiento pendientes
cuando sea mayor que cero, presentado como bandeja de entrada y no como métrica de logro. La
tarjeta SHALL NOT listar las superficies de biblioteca (`/me/diary`, `/me/favorites`,
`/me/lists`, `/me/collection` y similares), que se alcanzan desde el menú de usuario. La vista
del dueño SHALL ofrecer una previsualización que muestre el perfil tal como lo ve un visitante
público y tal como lo ve un visitante no autorizado.

El conjunto de destinos de gestión de red y de cuenta (seguidores, seguidos, solicitudes de
seguimiento, cuentas bloqueadas y ajustes) enlazados por el área de ajustes y el conjunto
expuesto por el menú de usuario del Header SHALL derivarse de una única definición compartida, de
modo que ambos permanezcan sincronizados. La definición compartida PODRÁ marcar destinos que
correspondan solo a una de las dos superficies (por ejemplo, el enlace al propio perfil, propio
del menú del Header, o las cuentas bloqueadas, propias del área de ajustes).

#### Scenario: Solicitudes pendientes en el panel

- **WHEN** el dueño abre su perfil y tiene solicitudes de seguimiento pendientes
- **THEN** la tarjeta "Ajustes" muestra el número de solicitudes pendientes y la pantalla Red de
  los ajustes lo muestra junto al enlace a `/me/follow-requests`

#### Scenario: Sin solicitudes pendientes

- **WHEN** el dueño abre su perfil y no tiene solicitudes pendientes
- **THEN** la tarjeta "Ajustes" no muestra ningún indicador numérico

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
sección "Reseñas", la sección "En rotación", la sección "Exploración" (artistas seguidos), la
Tarjeta de Identidad y los estantes de contenido SHALL renderizarse solo en los niveles
autorizado y dueño, organizados en tres niveles de profundidad:

- **Nivel 1** (comprensible en segundos): identidad extendida y la Tarjeta de Identidad
  (artista definitorio, álbum definitorio e himno; ver `profile-showcase`).
- **Nivel 2** (exploración de minutos, resumida): en este orden, "Empieza por aquí" (ver
  `profile-showcase`), "Valoraciones destacadas" (ver `rating-highlights`), "Reseñas", "En
  rotación", "Exploración" y un resumen de listas destacadas.
- **Nivel 3** (inmersión bajo demanda, accesible desde enlaces del Nivel 2, nunca
  precargada): la huella de gusto completa, el diario completo, todas las valoraciones,
  todas las listas, los recorridos de artista y la colección física.

La sección "Empieza por aquí" SHALL ubicarse antes de "Valoraciones destacadas"; ésta antes
de "Reseñas"; "Reseñas" antes de "En rotación"; y "En rotación" antes de "Exploración". La
huella de gusto completa (curvas y crestas) SHALL NOT renderizarse junto a estas secciones
de Nivel 2: SHALL vivir en el Nivel 3, accesible mediante un enlace desde el perfil.

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
- **THEN** ve la sección como primera del Nivel 2; un visitante no autorizado de un perfil
  privado no la ve

#### Scenario: El perfil no repite álbumes favoritos

- **WHEN** un visitante autorizado abre un perfil cuyo dueño tiene favoritos de álbum
- **THEN** esos álbumes aparecen solo en la sección Favoritos, no en una sección aparte de
  "Álbumes favoritos"

#### Scenario: "Reseñas" en el nivel autorizado

- **WHEN** un visitante autorizado abre un perfil cuyo dueño ha escrito al menos una reseña
  de álbum
- **THEN** ve la sección "Reseñas" entre "Valoraciones destacadas" y "En rotación", dentro
  del Nivel 2; un visitante no autorizado de un perfil privado no la ve

#### Scenario: "En rotación" en el nivel autorizado

- **WHEN** un visitante autorizado abre un perfil cuyo dueño tiene actividad de diario
  reciente visible para él que alcanza el umbral de rotación
- **THEN** ve la sección "En rotación" entre "Reseñas" y "Exploración", dentro del Nivel 2;
  un visitante no autorizado de un perfil privado no la ve

#### Scenario: "Exploración" en el nivel autorizado

- **WHEN** un visitante autorizado abre un perfil cuyo dueño sigue a al menos un artista
- **THEN** ve la sección "Exploración" con esos artistas, después de "En rotación", dentro
  del Nivel 2; un visitante no autorizado de un perfil privado no la ve

#### Scenario: Estado bloqueado

- **WHEN** el visitante y el dueño del perfil tienen una relación de bloqueo
- **THEN** el perfil muestra el estado de bloqueo y su acción correspondiente, sin huella,
  "Empieza por aquí", "Reseñas", "En rotación", "Exploración", Tarjeta de Identidad ni
  estantes

#### Scenario: Huella de gusto degradada al Nivel 3

- **WHEN** un visitante autorizado abre un perfil
- **THEN** no ve los gráficos de la huella de gusto junto a "Empieza por aquí", las
  valoraciones destacadas ni la exploración; los encuentra en la vista de Nivel 3 enlazada
  desde el perfil

#### Scenario: Valoraciones destacadas en el nivel autorizado

- **WHEN** un visitante autorizado abre un perfil cuyo dueño tiene valoraciones destacadas
  visibles para él
- **THEN** ve la sección "Valoraciones destacadas" entre "Empieza por aquí" y "Reseñas"

