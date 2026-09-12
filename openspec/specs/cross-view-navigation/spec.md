# cross-view-navigation

Navegación locale-aware entre las vistas públicas del catálogo, con encabezado global, breadcrumbs y enlaces de créditos.

## Purpose

Definir la navegación transversal de la aplicación: el encabezado global (barra general de
descubrimiento y menú de usuario autenticado), los breadcrumbs de las vistas de catálogo,
los enlaces de créditos y la preservación del locale activo al moverse entre vistas.
## Requirements
### Requirement: Navegación global del catálogo

La aplicación SHALL mostrar un encabezado común en las páginas públicas del catálogo con un
acceso al buscador y un selector de los locales soportados (`es` y `en`).

#### Scenario: Acceso global al buscador

- **WHEN** una persona visita una página de inicio, artista o álbum
- **THEN** el encabezado muestra un enlace al buscador que conserva el locale activo

#### Scenario: Cambio de idioma en una página de álbum

- **WHEN** una persona cambia de `/es/album/<id>` a inglés desde el selector
- **THEN** la aplicación navega a `/en/album/<id>` manteniendo el mismo id de álbum

### Requirement: Breadcrumbs navegables y localizados

Las páginas de artista y álbum SHALL mostrar breadcrumbs con etiquetas localizadas y enlaces
locale-aware hacia el inicio y las entidades cuyo contexto esté disponible.

#### Scenario: Breadcrumb de álbum con artista principal

- **WHEN** el detalle del álbum incluye un artista principal
- **THEN** la página muestra enlaces hacia inicio y `/artist/<artistId>`, además del álbum actual

#### Scenario: Álbum sin artista principal

- **WHEN** el detalle del álbum no tiene un artista principal identificable
- **THEN** la página mantiene el enlace a inicio y muestra el álbum actual sin crear un enlace roto

### Requirement: Créditos destacados navegables

Los créditos de track con rol `featured` SHALL mostrarse como enlaces hacia el perfil del artista
acreditado usando su `artistId` propio y preservando el locale activo.

#### Scenario: Crédito featured con artista válido

- **WHEN** un track contiene un crédito destacado con `artistId` válido
- **THEN** el nombre del crédito aparece enlazado a `/<locale>/artist/<artistId>`

#### Scenario: Track sin créditos destacados

- **WHEN** un track no contiene créditos con rol `featured`
- **THEN** no se muestra una sección de colaboración ni un enlace adicional

### Requirement: Datos de catálogo sin traducción

La navegación SHALL traducir únicamente etiquetas de interfaz, mientras que títulos, nombres de
artistas y nombres de créditos SHALL conservarse tal como los entrega el catálogo.

#### Scenario: Mismo álbum en dos locales

- **WHEN** una persona visita el álbum en español y en inglés
- **THEN** cambian las etiquetas de navegación y permanecen iguales los datos musicales

### Requirement: Estructura del Header para el usuario autenticado

Cuando existe sesión, el Header SHALL separar dos zonas: una **barra general** de
navegación de contenido y un **menú de usuario** anclado al nombre visible, cuyo control
SHALL mostrar un indicador de despliegue (cheurón hacia abajo) junto al nombre.

La barra general SHALL contener el acceso al buscador del catálogo, el enlace a la
superficie pública de Listas de la comunidad (`/lists`), el enlace a la superficie pública
de Actividad de la comunidad (`/activity`) y, cuando el catálogo editorial esté habilitado,
el enlace a Explorar. El enlace "Listas" de la barra general SHALL apuntar a la superficie
pública `/lists`, distinta de la gestión personal en `/me/lists`. El enlace "Actividad"
SHALL apuntar a la superficie pública `/activity`, distinta del feed de seguidos en
`/me/feed`. La barra general SHALL NOT mostrar en su nivel superior enlaces a las
superficies personales del usuario (`/me/diary`, `/me/feed`, `/me/favorites`, `/me/lists`,
`/me/collection`).

La barra general SHALL incluir además un control **"Registrar"** —solo cuando hay sesión—
que **no es un enlace de navegación** sino el disparador de un modal para registrar una
escucha eligiendo el objetivo con el buscador del catálogo (ver `listen-diary`). El control
SHALL presentarse como acción (no como enlace de texto plano) y SHALL ubicarse después de
los enlaces de contenido.

En escritorio el menú de usuario SHALL desplegarse al posar el cursor sobre el control y
SHALL replegarse cuando el cursor abandona el conjunto de control y menú. El menú SHALL
agrupar los accesos a: el perfil propio (`/users/{username}`), el diario, los favoritos,
las listas, la colección, los artistas seguidos, el feed de actividad, los seguidores, los
seguidos, las solicitudes de seguimiento, los ajustes y el cierre de sesión. El menú SHALL
mostrar un indicador con el número de solicitudes de seguimiento pendientes junto al acceso
a solicitudes cuando ese número sea mayor que cero, presentado como bandeja de entrada y no
como métrica de logro.

El feed de actividad (`/me/feed`) SHALL alcanzarse desde el menú de usuario y SHALL NOT
ocupar un lugar en la barra general.

Sin depender del cursor, el menú de usuario SHALL ser operable: su control SHALL alternar el
menú al activarse (soporte táctil y de teclado), el menú SHALL cerrarse con `Escape`
devolviendo el foco al control, y el control SHALL exponer su estado mediante
`aria-expanded` y `aria-controls`. El menú SHALL cerrarse al navegar a una ruta nueva.

En viewports por debajo del punto de corte `md`, el Header SHALL colapsar en un panel único
que conserve la misma división: un bloque de barra general (buscador, Listas, Actividad,
Explorar y el control "Registrar") y un bloque de usuario con los mismos accesos del menú,
el selector de locale y el cierre de sesión.

#### Scenario: Barra general sin superficies personales

- **WHEN** un usuario con sesión abre cualquier página con el Header en un viewport de
  escritorio
- **THEN** la barra general muestra el buscador, el enlace a `/lists`, el enlace a
  `/activity`, el control "Registrar" y, si el catálogo editorial está habilitado, el
  enlace a Explorar
- **AND** no muestra enlaces de nivel superior a diario, feed, favoritos, `/me/lists` ni
  colección

#### Scenario: El enlace de Listas apunta a la superficie pública

- **WHEN** el usuario activa el enlace "Listas" de la barra general
- **THEN** llega a `/lists` (descubrimiento de listas de la comunidad) y no a `/me/lists`
  (gestión de sus propias listas)

#### Scenario: El enlace de Actividad apunta a la superficie pública

- **WHEN** el usuario activa el enlace "Actividad" de la barra general
- **THEN** llega a `/activity` (actividad de la comunidad) y no a `/me/feed` (su feed de
  seguidos)

#### Scenario: El control "Registrar" solo con sesión

- **WHEN** se renderiza el Header sin sesión
- **THEN** la barra general no muestra el control "Registrar"
- **AND** con sesión, la barra general sí lo muestra

#### Scenario: El control "Registrar" abre el modal de registro

- **WHEN** un usuario con sesión activa el control "Registrar"
- **THEN** se abre el modal para elegir un objetivo del catálogo y registrar una escucha, sin
  navegar a otra ruta

#### Scenario: El menú de usuario agrupa las superficies personales

- **WHEN** el usuario abre el menú anclado a su nombre visible
- **THEN** ve los accesos a su perfil, diario, favoritos, listas, colección, artistas
  seguidos, feed de actividad, seguidores, seguidos, solicitudes, ajustes y cierre de
  sesión

#### Scenario: Apertura al posar el cursor en escritorio

- **WHEN** en escritorio el usuario posa el cursor sobre el control del menú, que muestra un
  cheurón hacia abajo junto a su nombre
- **THEN** el menú se despliega sin necesidad de hacer clic
- **AND** se repliega cuando el cursor abandona el control y el menú

#### Scenario: Indicador de solicitudes pendientes en el menú

- **WHEN** el usuario abre el menú y tiene solicitudes de seguimiento pendientes
- **THEN** el acceso a solicitudes muestra el número de pendientes y enlaza a
  `/me/follow-requests`

#### Scenario: Sin solicitudes pendientes

- **WHEN** el usuario abre el menú y no tiene solicitudes pendientes
- **THEN** el acceso a solicitudes no muestra ningún indicador numérico

#### Scenario: Feed accesible solo desde el menú

- **WHEN** el usuario busca su feed de actividad en el Header
- **THEN** lo encuentra dentro del menú de usuario y no como enlace de la barra general

#### Scenario: Cierre del menú con teclado

- **WHEN** el menú de usuario está abierto y el usuario pulsa `Escape`
- **THEN** el menú se cierra y el foco vuelve al control que lo abre

#### Scenario: Cierre del menú al navegar

- **WHEN** el menú de usuario está abierto y el usuario activa uno de sus enlaces
- **THEN** la aplicación navega a esa ruta y el menú queda cerrado

#### Scenario: Panel colapsado en viewport móvil

- **WHEN** un usuario con sesión abre el panel del Header en un viewport por debajo de `md`
- **THEN** ve un bloque de barra general con el buscador, el enlace a `/lists`, el enlace a
  `/activity`, Explorar y el control "Registrar", y un bloque de usuario con los mismos
  accesos del menú más el selector de locale y el cierre de sesión

