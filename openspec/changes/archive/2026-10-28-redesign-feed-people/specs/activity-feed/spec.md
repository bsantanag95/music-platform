## MODIFIED Requirements

### Requirement: Página completa del feed en /me/feed

`/me/feed` SHALL ser la versión completa del feed de seguidos. Su cabecera SHALL alinearse a la izquierda, con migas
(Inicio / Actividad), el título "Actividad", un subtítulo y un enlace a la actividad de toda la comunidad, en el mismo
ancho de lectura que el resto de `/me/*`.

La persona SHALL elegirse en una franja con el avatar y el nombre de cada seguido aceptado, encabezada por "Todas"; el
tipo, en chips con los nueve tipos del feed encabezados por "Todo". Elegir otra vez la persona activa SHALL volver a
"Todas". La búsqueda, el tipo y la persona SHALL reflejarse en la URL (`q`, `kind` y `author`, este último con el nombre
de usuario) sin crear entradas de historial, y SHALL restaurarse al recargar o abrir el enlace: la primera página SHALL
llegar ya filtrada. Un `kind` fuera del enum o un `author` que no sea un seguido aceptado del lector SHALL ignorarse.
Cada control SHALL medir al menos 44 px de alto con puntero grueso.

La página SHALL recordar la última visita del lector. Al abrirla, las entradas posteriores a la visita anterior SHALL
agruparse en un bloque "Nuevo desde tu última visita" antes de los bloques de fecha, y la franja SHALL marcar con un
punto (y un texto para lectores de pantalla) a las personas que tienen actividad nueva, ordenándolas primero. La marca
SHALL moverse al abrir la página en el navegador, nunca al renderizarla en el servidor. En la primera visita no SHALL
haber bloque ni puntos.

El listado SHALL agrupar las filas en bloques de fecha (Hoy, Esta semana, Este mes, Antes) y SHALL presentar la reseña
como tarjeta de lectura con "Leer reseña", igual que `/activity`.

Una fila de actividad de otra persona SHALL NOT mostrar la audiencia que esa persona eligió, en ninguna superficie; la
audiencia SHALL mostrarse solo en el rastro propio.

Sin filtros y sin entradas, la página SHALL distinguir al lector que no sigue a nadie (con una salida a buscar personas)
del que sigue a personas que todavía no publicaron nada (con una salida a la actividad de la comunidad).

#### Scenario: Filtros que sobreviven a la recarga
- **WHEN** el lector elige el chip Reseñas y a Fran en la franja y recarga la página
- **THEN** la URL contiene `kind=review&author=fran`, ve solo reseñas de Fran y el chip y la persona siguen elegidos

#### Scenario: Persona que no sigue
- **WHEN** el lector abre `/me/feed?author=alguien` y no sigue a `alguien`
- **THEN** ve el feed sin filtro de persona

#### Scenario: Valor vacío nombrado
- **WHEN** el lector abre `/me/feed` sin filtros
- **THEN** la franja tiene elegida "Todas" y los chips, "Todo"

#### Scenario: Volver a todas desde la persona activa
- **WHEN** el lector tiene elegida a Fran y la vuelve a elegir
- **THEN** la franja vuelve a "Todas" y la URL pierde `author`

#### Scenario: Bloques de fecha y tarjeta de reseña
- **WHEN** el lector ve una reseña de hace tres días y una escucha de hace dos meses
- **THEN** la reseña aparece bajo "Esta semana" como tarjeta con "Leer reseña" y la escucha bajo "Antes"

#### Scenario: Novedades desde la última visita
- **WHEN** el lector visitó el feed ayer y desde entonces Fran reseñó un disco
- **THEN** la reseña aparece bajo "Nuevo desde tu última visita", antes de los bloques de fecha, y Fran va primera en la
  franja con un punto

#### Scenario: Primera visita
- **WHEN** el lector abre el feed por primera vez
- **THEN** no ve el bloque "Nuevo" ni puntos en la franja

#### Scenario: Recargar mueve la marca
- **WHEN** el lector abre el feed y lo recarga
- **THEN** en la segunda carga lo que antes era nuevo ya no está bajo "Nuevo desde tu última visita"

#### Scenario: Sin audiencia en filas ajenas
- **WHEN** una persona seguida suma un disco a su colección con audiencia `followers`
- **THEN** la fila del feed dice que lo sumó, sin "Seguidores"

#### Scenario: La audiencia sigue en el rastro propio
- **WHEN** el lector ve su propio rastro en Inicio o en `/activity` → Tú
- **THEN** sus filas siguen mostrando la audiencia

#### Scenario: Sin seguidos
- **WHEN** el lector no sigue a nadie
- **THEN** ve "Todavía no sigues a nadie" con un enlace a buscar personas

#### Scenario: Seguidos sin actividad
- **WHEN** el lector sigue a dos personas que no tienen actividad visible
- **THEN** ve que la gente que sigue todavía no publicó nada, con un enlace a la actividad de la comunidad
