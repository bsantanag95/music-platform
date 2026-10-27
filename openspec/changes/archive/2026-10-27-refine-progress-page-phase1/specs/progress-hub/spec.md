## MODIFIED Requirements

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

El título y su descripción SHALL alinearse a la izquierda, en el mismo ancho que el resto de
las secciones personales (Pendientes, Favoritos, Colección, Listas). Las pestañas SHALL caber en una
sola fila a 375 px, y las tres pestañas SHALL ordenar su barra igual: búsqueda, selects y conmutador
de modo al final.

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

#### Scenario: Pestañas en una fila en un teléfono
- **WHEN** un usuario abre `/me/progress` en una pantalla de 375 px
- **THEN** las tres pestañas ocupan una sola fila

#### Scenario: Sin sesión
- **WHEN** una persona sin sesión abre `/me/progress`
- **THEN** es redirigida al inicio de sesión
