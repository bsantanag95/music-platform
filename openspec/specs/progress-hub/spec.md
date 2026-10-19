# progress-hub Specification

## Purpose
TBD - created by archiving change clarify-user-menu-names. Update Purpose after archive.
## Requirements
### Requirement: Panel unificado de progreso en /me/progress
El sistema SHALL exponer una ruta `/me/progress` que requiere sesión y reúne, como pestañas de una
sola página titulada "Progreso" ("Progress" en inglés), los tres conjuntos sobre los que el usuario
sigue su progreso de escucha:

- **Discografías**: los recorridos de artista propios (capability `artist-journey`, Requirement
  "Listado propio de recorridos").
- **Mis listas**: los Caminos propios (capability `camino`, pestaña de Caminos propios).
- **Listas que sigo**: las listas ajenas con seguimiento de progreso activo (capability `camino`,
  pestaña de listas seguidas).

La pestaña activa SHALL vivir en `?tab=` con los valores `discographies`, `lists` y `following`,
de modo que sea enlazable y sobreviva a la recarga. Sin `tab`, o con un valor desconocido, SHALL
abrirse la pestaña Discografías. Cada pestaña SHALL conservar íntegro el comportamiento de su
listado (buscador, orden, filtro de estado, modos de visualización, menú de tarjeta y estado vacío),
y el sistema SHALL NOT mezclar entradas de dos pestañas en un mismo listado ordenable.

Bajo el título, la página SHALL mostrar una línea localizada que explique qué reúne (cuánto llevas
escuchado de discografías y listas, según tu diario), y cada pestaña SHALL ofrecer su acción de
creación cuando exista: Mis listas ofrece "Nueva lista para completar". Discografías explica que se
empieza desde la página de un artista con "Completar discografía".

#### Scenario: Pestaña por defecto
- **WHEN** un usuario con sesión abre `/me/progress` sin `tab`
- **THEN** ve el título "Progreso" con las pestañas Discografías, Mis listas y Listas que sigo, y
  la pestaña Discografías seleccionada

#### Scenario: Pestaña enlazable
- **WHEN** un usuario abre `/me/progress?tab=following` y recarga la página
- **THEN** sigue viendo la pestaña Listas que sigo seleccionada

#### Scenario: Valor de pestaña desconocido
- **WHEN** un usuario abre `/me/progress?tab=otra`
- **THEN** ve la pestaña Discografías, sin error

#### Scenario: Cada pestaña conserva su listado
- **WHEN** el usuario abre la pestaña Discografías
- **THEN** encuentra el mismo buscador, orden, filtro de estado y modos de visualización que tenía
  el listado de recorridos, aplicados solo a sus discografías

#### Scenario: Sin sesión
- **WHEN** una persona sin sesión abre `/me/progress`
- **THEN** es redirigida al inicio de sesión

### Requirement: Redirección desde los listados anteriores
Las rutas `/me/artist-journeys` y `/me/caminos` SHALL redirigir a `/me/progress` con la pestaña
equivalente: `/me/artist-journeys` a `?tab=discographies`, `/me/caminos` (o `?tab=mine`) a
`?tab=lists` y `/me/caminos?tab=tracked` a `?tab=following`. Las rutas de detalle
(`/me/artist-journeys/[artistId]`, `/me/caminos/[caminoId]`) SHALL seguir existiendo sin cambios de
ruta, y su breadcrumb y su vuelta tras borrar SHALL apuntar a la pestaña correspondiente de
`/me/progress`.

#### Scenario: Enlace viejo a recorridos
- **WHEN** un usuario con sesión abre `/me/artist-journeys`
- **THEN** llega a `/me/progress?tab=discographies`

#### Scenario: Enlace viejo a listas seguidas
- **WHEN** un usuario con sesión abre `/me/caminos?tab=tracked`
- **THEN** llega a `/me/progress?tab=following`

#### Scenario: Volver desde un detalle
- **WHEN** el propietario borra un Camino desde su página de detalle
- **THEN** la aplicación lo lleva a `/me/progress?tab=lists`

### Requirement: Vocabulario visible de progreso
La interfaz SHALL nombrar los conceptos de dominio "recorrido de artista" y "Camino" con un
vocabulario que describa lo que el usuario hace, en todas las superficies visibles y en ambos
locales. Los nombres internos (rutas existentes, endpoints, tablas, tipos, claves de mensajes,
`kind` del feed y nombres de capability) SHALL NOT cambiar. En las demás specs, "recorrido" y
"Camino" siguen nombrando el concepto de dominio, y las etiquetas literales que esas specs citan
SHALL mostrarse con este vocabulario:

| Concepto | es | en |
|---|---|---|
| Destino del menú y título del panel | Progreso | Progress |
| Recorrido, como pestaña | Discografías | Discographies |
| Crear un recorrido (panel del artista, acción rápida, Pendientes) | Completar discografía | Complete discography |
| Fila del panel del artista | Tu progreso | Your progress |
| Camino, en singular | lista para completar | list to complete |
| Crear un Camino | Nueva lista para completar | New list to complete |
| Caminos propios, como pestaña | Mis listas | My lists |
| Listas ajenas seguidas, como pestaña | Listas que sigo | Lists I follow |
| Estante del perfil y su página | Listas para completar | Lists to complete |
| Descubrimiento público (`/caminos`) | Listas para completar | Lists to complete |
| Evento de feed: crear | Armó una lista para completar | Started a list to complete |
| Evento de feed: completar | Completó una lista | Completed a list |

La interfaz SHALL NOT mostrar las palabras "Recorrido", "Camino" ni "Trackeados" (ni "Journey",
"Path" ni "Tracked" en inglés) como nombre de estas funciones.

#### Scenario: Acción en la página del artista
- **WHEN** un usuario sin recorrido de un artista abre su página
- **THEN** el panel personal ofrece "Completar discografía" y no "Armar recorrido"

#### Scenario: Evento de feed de un Camino
- **WHEN** un seguido crea un Camino público
- **THEN** el feed muestra "Armó una lista para completar" con el título enlazado

#### Scenario: Sin nombres anteriores en inglés
- **WHEN** un usuario navega el menú, el panel de progreso y las acciones rápidas con el locale `en`
- **THEN** ve "Progress", "Discographies", "Complete discography" y "list to complete", y ninguna
  etiqueta "Journeys" ni "Paths"

