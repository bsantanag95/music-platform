## ADDED Requirements

### Requirement: Página completa del feed en /me/feed

`/me/feed` SHALL ser la versión completa del feed de seguidos. Su cabecera SHALL alinearse a la izquierda, con migas
(Inicio / Actividad), el título "Actividad" y un subtítulo, en el mismo ancho de lectura que el resto de `/me/*`.

La búsqueda, el tipo y la persona SHALL reflejarse en la URL (`q`, `kind` y `author`, este último con el nombre de
usuario) sin crear entradas de historial, y SHALL restaurarse al recargar o abrir el enlace: la primera página SHALL
llegar ya filtrada. Un `kind` fuera del enum o un `author` que no sea un seguido aceptado del lector SHALL ignorarse.
Cada selector SHALL nombrar su valor vacío ("Todos los tipos", "Todas las personas") en lugar de repetir su etiqueta, y
SHALL medir al menos 44 px de alto con puntero grueso.

El listado SHALL agrupar las filas en bloques de fecha (Hoy, Esta semana, Este mes, Antes) y SHALL presentar la reseña
como tarjeta de lectura con "Leer reseña", igual que `/activity`.

Una fila de actividad de otra persona SHALL NOT mostrar la audiencia que esa persona eligió, en ninguna superficie; la
audiencia SHALL mostrarse solo en el rastro propio.

Sin filtros y sin entradas, la página SHALL distinguir al lector que no sigue a nadie (con una salida a buscar personas)
del que sigue a personas que todavía no publicaron nada (con una salida a la actividad de la comunidad).

#### Scenario: Filtros que sobreviven a la recarga
- **WHEN** el lector filtra por reseñas y por la persona `fran` y recarga la página
- **THEN** la URL contiene `kind=review&author=fran`, ve solo reseñas de Fran y los selectores muestran esos valores

#### Scenario: Persona que no sigue
- **WHEN** el lector abre `/me/feed?author=alguien` y no sigue a `alguien`
- **THEN** ve el feed sin filtro de persona

#### Scenario: Valor vacío nombrado
- **WHEN** el lector abre `/me/feed` sin filtros
- **THEN** los selectores dicen "Todos los tipos" y "Todas las personas"

#### Scenario: Bloques de fecha y tarjeta de reseña
- **WHEN** el lector ve una reseña de hace tres días y una escucha de hace dos meses
- **THEN** la reseña aparece bajo "Esta semana" como tarjeta con "Leer reseña" y la escucha bajo "Antes"

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
