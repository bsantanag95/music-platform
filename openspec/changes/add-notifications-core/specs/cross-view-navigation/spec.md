## MODIFIED Requirements

### Requirement: Estructura del Header con acciones rápidas

Cuando existe sesión, el Header SHALL separar dos zonas: una **barra general** de
navegación de contenido y un **menú de usuario** anclado al nombre visible, cuyo control
SHALL mostrar un indicador de despliegue (cheurón hacia abajo) junto al nombre.

La barra general SHALL contener, en este orden, el acceso al buscador del catálogo, el enlace
a Explorar (cuando el catálogo editorial esté habilitado), el enlace a la superficie pública
de Listas de la comunidad (`/lists`) y el enlace a la superficie pública de actividad de la
comunidad (`/activity`), etiquetado **"Comunidad"**. El enlace "Listas" de la barra general
SHALL apuntar a la superficie pública `/lists`, distinta de la gestión personal en
`/me/lists`. El enlace "Comunidad" SHALL apuntar a `/activity`, distinta del feed de
seguidos en `/me/feed`. La barra general SHALL NOT mostrar un enlace al descubrimiento de
Caminos (`/caminos`), que se alcanza desde `/lists` (ver `camino-discovery`). La barra
general SHALL NOT mostrar en su nivel superior enlaces a las superficies personales del
usuario (`/me/diary`, `/me/feed`, `/me/favorites`, `/me/lists`, `/me/collection`,
`/me/progress`).

Ninguna etiqueta SHALL nombrar con la misma palabra una superficie pública de la barra
general y una superficie personal distinta del menú de usuario, salvo "Listas", cuyo
título de grupo en el menú ("Tu música") las distingue.

La zona de usuario SHALL incluir además un control **"Añadir"** —solo cuando hay sesión—
ubicado **junto al menú de usuario** (a su izquierda, después del selector de idioma) y NO en
la barra general. El control **no es un enlace de navegación** sino el disparador del diálogo
de acciones rápidas (ver `header-quick-actions`): registrar una escucha, valorar, marcar un
favorito, dejar algo Pendiente, agregar a una lista y crear una lista, eligiendo el objetivo
con el buscador del catálogo. El control SHALL presentarse como acción (no como enlace de
texto plano). La barra general queda para lo que el sitio ofrece a cualquiera; la escritura
de datos propios vive en la zona de usuario.

Con sesión, la zona de usuario SHALL incluir también el control de **notificaciones** (ver
`notifications`), ubicado entre el control "Añadir" y el menú de usuario en escritorio. Por
debajo del punto de corte `lg`, el control de notificaciones SHALL quedar en la fila superior,
junto al botón del panel colapsado, y no dentro del panel.

En escritorio el menú de usuario SHALL desplegarse al posar el cursor sobre el control y
SHALL replegarse cuando el cursor abandona el conjunto de control y menú. El menú SHALL
agrupar, en este orden, los accesos a: el perfil propio (`/users/{username}`, "Perfil");
un grupo titulado **"Tu música"** con Diario, Valoraciones, Favoritos, Pendientes,
Colección física, Listas y Progreso (`/me/progress`); un grupo titulado **"Social"** con
Actividad (el feed de seguidos, `/me/feed`), Artistas seguidos, Seguidores, Seguidos y
Solicitudes; las herramientas de rol; los ajustes y el cierre de sesión. Los títulos de
grupo SHALL mostrarse como rótulos no interactivos y SHALL NOT ser enlaces. Ninguna
etiqueta de acceso del menú SHALL llevar posesivo ("Mi", "Mis"): la pertenencia la dan los
títulos de grupo. El menú SHALL NOT mostrar un indicador numérico junto al acceso a solicitudes: las
solicitudes pendientes se avisan en el control de notificaciones.

El feed de actividad (`/me/feed`) SHALL alcanzarse desde el menú de usuario, con la
etiqueta "Actividad", y SHALL NOT ocupar un lugar en la barra general.

Sin depender del cursor, el menú de usuario SHALL ser operable: su control SHALL alternar el
menú al activarse (soporte táctil y de teclado), el menú SHALL cerrarse con `Escape`
devolviendo el foco al control, y el control SHALL exponer su estado mediante
`aria-expanded` y `aria-controls`. El menú SHALL cerrarse al navegar a una ruta nueva.

Los accesos a herramientas de rol (Moderación, para quien tenga permisos de moderación, y
Administración, para quien tenga permiso de autoría editorial) SHALL mostrarse solo a
quienes tengan ese permiso, dentro del menú de usuario y del bloque de usuario del panel
colapsado, en un grupo propio antes de los ajustes, y SHALL NOT ocupar un lugar en la barra
general.

En viewports por debajo del punto de corte `lg`, el Header SHALL colapsar en un panel único
que conserve la misma división: un bloque de barra general (buscador, Explorar, Listas y
Comunidad) y un bloque de usuario que empieza por el control "Añadir" y sigue con los mismos
accesos y títulos de grupo del menú, el selector de locale y el cierre de sesión.

#### Scenario: Barra general sin superficies personales

- **WHEN** un usuario con sesión abre cualquier página con el Header en un viewport de
  escritorio
- **THEN** la barra general muestra el buscador, si el catálogo editorial está habilitado el
  enlace a Explorar, el enlace a `/lists` y el enlace "Comunidad" a `/activity`
- **AND** no muestra enlaces de nivel superior a diario, feed, favoritos, `/me/lists`,
  colección ni progreso
- **AND** no muestra un enlace a `/caminos`
- **AND** no muestra el control "Añadir", que vive en la zona de usuario

#### Scenario: El enlace de Listas apunta a la superficie pública

- **WHEN** el usuario activa el enlace "Listas" de la barra general
- **THEN** llega a `/lists` (descubrimiento de listas de la comunidad) y no a `/me/lists`
  (gestión de sus propias listas)

#### Scenario: El enlace de Actividad apunta a la superficie pública

- **WHEN** el usuario activa el enlace "Comunidad" de la barra general
- **THEN** llega a `/activity` (actividad de la comunidad) y no a `/me/feed` (su feed de
  seguidos)

#### Scenario: El control "Añadir" solo con sesión

- **WHEN** se renderiza el Header sin sesión
- **THEN** la zona de usuario no muestra el control "Añadir"
- **AND** con sesión, la zona de usuario sí lo muestra

#### Scenario: El control "Añadir" va junto al menú de usuario

- **WHEN** un usuario con sesión abre una página con el Header en un viewport de escritorio
- **THEN** en la zona de usuario el orden es selector de idioma, control "Añadir", control de
  notificaciones y menú de usuario

#### Scenario: El control "Añadir" abre el diálogo de acciones rápidas

- **WHEN** un usuario con sesión activa el control "Añadir"
- **THEN** se abre el diálogo de acciones rápidas con la acción "Escucha" seleccionada, sin
  navegar a otra ruta

#### Scenario: El menú de usuario agrupa las superficies personales

- **WHEN** el usuario abre el menú anclado a su nombre visible
- **THEN** ve "Perfil"; el rótulo "Tu música" seguido de Diario, Valoraciones, Favoritos,
  Pendientes, Colección física, Listas y Progreso; el rótulo "Social" seguido de Actividad,
  Artistas seguidos, Seguidores, Seguidos y Solicitudes; y luego Ajustes y Cerrar sesión

#### Scenario: Menú de usuario incluye los recorridos de artista

- **WHEN** un usuario autenticado abre el menú de usuario del Header
- **THEN** encuentra un único acceso "Progreso" que lleva a `/me/progress`
- **AND** no encuentra accesos separados a recorridos de artista ni a Caminos

#### Scenario: Sin posesivos en los accesos

- **WHEN** el usuario recorre las etiquetas de los accesos del menú, en cualquier locale
- **THEN** ninguna empieza por "Mi", "Mis", "My" ni equivalente

#### Scenario: Los títulos de grupo no son enlaces

- **WHEN** el usuario navega el menú con el teclado
- **THEN** el foco pasa por los accesos y no se detiene en los rótulos "Tu música" ni "Social"

#### Scenario: Apertura al posar el cursor en escritorio

- **WHEN** en escritorio el usuario posa el cursor sobre el control del menú, que muestra un
  cheurón hacia abajo junto a su nombre
- **THEN** el menú se despliega sin necesidad de hacer clic
- **AND** se repliega cuando el cursor abandona el control y el menú

#### Scenario: Solicitudes pendientes sin indicador en el menú

- **WHEN** el usuario abre el menú y tiene solicitudes de seguimiento pendientes
- **THEN** el acceso a solicitudes enlaza a `/me/follow-requests` sin indicador numérico
- **AND** el control de notificaciones del Header cuenta las solicitudes nuevas

#### Scenario: Notificaciones en la fila superior móvil

- **WHEN** un usuario con sesión abre una página en un viewport por debajo de `lg`
- **THEN** el control de notificaciones se ve en la fila superior junto al botón del panel,
  sin abrir el panel

#### Scenario: Feed accesible solo desde el menú

- **WHEN** el usuario busca su feed de actividad en el Header
- **THEN** lo encuentra dentro del menú de usuario, como "Actividad" en el grupo "Social", y
  no como enlace de la barra general

#### Scenario: Cierre del menú con teclado

- **WHEN** el menú de usuario está abierto y el usuario pulsa `Escape`
- **THEN** el menú se cierra y el foco vuelve al control que lo abre

#### Scenario: Cierre del menú al navegar

- **WHEN** el menú de usuario está abierto y el usuario activa uno de sus enlaces
- **THEN** la aplicación navega a esa ruta y el menú queda cerrado

#### Scenario: Panel colapsado en viewport móvil

- **WHEN** un usuario con sesión abre el panel del Header en un viewport por debajo de `lg`
- **THEN** ve un bloque de barra general con el buscador, Explorar, el enlace a `/lists` y el
  enlace "Comunidad" a `/activity`, y un bloque de usuario que empieza por el control
  "Añadir" y sigue con los mismos accesos y rótulos de grupo del menú más el selector de
  locale y el cierre de sesión

#### Scenario: Herramientas de rol en el menú de usuario

- **WHEN** un usuario con permisos de moderación y de autoría editorial abre el menú de
  usuario
- **THEN** encuentra los accesos a Moderación (`/moderation`) y Administración (`/admin`) en
  un grupo propio del menú
- **AND** la barra general no muestra esos enlaces

#### Scenario: Sin permisos de rol

- **WHEN** un usuario sin permisos de moderación ni de autoría editorial abre el menú
- **THEN** el menú no muestra accesos a Moderación ni a Administración

#### Scenario: Sin desborde horizontal en anchos intermedios

- **WHEN** un usuario con sesión y todos los permisos de rol abre una página en un viewport
  de 800 px de ancho
- **THEN** el Header se muestra colapsado con el botón del panel y la página no tiene
  desplazamiento horizontal

#### Scenario: El menú de usuario incluye Mis valoraciones
- **WHEN** un usuario autenticado abre el menú de usuario del Header o el panel móvil
- **THEN** encuentra el acceso "Valoraciones", después de Diario, que lleva a `/me/ratings`
