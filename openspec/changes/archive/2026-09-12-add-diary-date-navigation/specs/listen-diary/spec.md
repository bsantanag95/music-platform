## MODIFIED Requirements

### Requirement: Diario propio

El sistema SHALL permitir al usuario autenticado listar sus propias escuchas en orden cronológico
descendente con paginación. El listado SHALL contener únicamente entradas del usuario que lo
consulta y SHALL incluir el objetivo, el contexto, la impresión, la reacción y la audiencia de cada
entrada. El listado SHALL presentarse como una lista vertical de filas (no como tarjetas ancladas
independientes) y NUNCA SHALL agrupar ni colapsar dos o más entradas en una sola fila: cada
escucha SHALL permanecer accesible de forma individual para su ampliación o borrado,
independientemente de cuántas entradas consecutivas compartan contexto, ausencia de reacción o
ausencia de impresión. El sistema SHALL permitir acotar el listado combinando, de forma independiente
y simultánea: texto libre, contexto, reacción (incluida la ausencia explícita de reacción), audiencia,
año y mes calendario. Un filtro de mes SHALL requerir un año también especificado — no existe un
filtro de "este mes, en cualquier año". La búsqueda por texto SHALL coincidir tanto con el título del
objetivo (artista, álbum o canción) como con el artista acreditado como principal de un álbum o
canción, para que una búsqueda por nombre de artista encuentre también sus álbumes y canciones, no
únicamente las entradas cuyo objetivo es la artista misma. Cada álbum o canción listado SHALL mostrar
el nombre de su artista acreditado como principal junto al título. Cada filtro SHALL aplicarse sobre
la totalidad de las entradas del usuario, no únicamente sobre las ya cargadas en el cliente. Un valor
de contexto, reacción o audiencia fuera de su vocabulario cerrado, o un mes sin año, SHALL producir
un error de validación y no SHALL alterar el listado.

#### Scenario: Listar el diario
- **WHEN** un usuario autenticado abre su diario
- **THEN** ve sus escuchas ordenadas de la más reciente a la más antigua, paginadas

#### Scenario: Diario vacío
- **WHEN** un usuario sin escuchas abre su diario
- **THEN** ve un estado vacío localizado y no un error técnico

#### Scenario: Varias escuchas sin nota consecutivas no se colapsan
- **WHEN** un usuario tiene 3 o más escuchas consecutivas sin impresión escrita ni reacción
- **THEN** cada una se muestra como su propia fila, con sus propias acciones de ampliar y borrar,
  y ninguna se pliega en una fila resumen

#### Scenario: Buscar por título del objetivo
- **WHEN** el usuario busca un texto que coincide parcialmente con el título de un artista, álbum
  o canción de alguna de sus escuchas
- **THEN** el listado muestra únicamente las entradas cuyo objetivo coincide, sin importar en qué
  página habrían aparecido sin el filtro

#### Scenario: Buscar por el artista de un álbum o canción
- **WHEN** el usuario busca el nombre de una artista y alguna de sus escuchas es un álbum o
  canción acreditado a esa artista (no una escucha de la artista misma)
- **THEN** esa entrada aparece en el listado igual que si el texto buscado fuera el título del
  álbum o la canción

#### Scenario: Filtrar por contexto
- **WHEN** el usuario filtra su diario por el contexto `rediscovery`
- **THEN** el listado muestra únicamente las entradas registradas con ese contexto

#### Scenario: Filtrar por ausencia de reacción
- **WHEN** el usuario filtra su diario para ver solo las entradas sin reacción
- **THEN** el listado muestra únicamente las entradas cuya reacción es nula, sin incluir las que
  tienen la reacción `neutral` elegida explícitamente

#### Scenario: Filtrar por audiencia
- **WHEN** el usuario filtra su diario por audiencia `private`
- **THEN** el listado muestra únicamente sus entradas privadas

#### Scenario: Combinar filtros
- **WHEN** el usuario aplica a la vez una búsqueda de texto, un contexto y una reacción
- **THEN** el listado muestra solo las entradas que cumplen las tres condiciones simultáneamente

#### Scenario: Valor de filtro inválido
- **WHEN** el sistema recibe un valor de contexto, reacción o audiencia que no pertenece a su
  vocabulario cerrado
- **THEN** la API responde un error de validación y el listado no se modifica

#### Scenario: Filtro sobre entradas fuera de la página actual
- **WHEN** el usuario aplica un filtro que solo coincide con entradas más antiguas que las ya
  cargadas en pantalla
- **THEN** esas entradas aparecen igual, sin necesidad de haberlas cargado antes con "cargar más"

#### Scenario: Filtrar por año

- **WHEN** el usuario filtra su diario por un año concreto
- **THEN** el listado muestra únicamente las entradas registradas ese año calendario

#### Scenario: Filtrar por año y mes

- **WHEN** el usuario filtra su diario por un año y, dentro de ese año, un mes calendario concreto
- **THEN** el listado muestra únicamente las entradas registradas ese mes de ese año

#### Scenario: Un mes sin año es inválido

- **WHEN** el sistema recibe un filtro de mes sin un año que lo acompañe
- **THEN** la API responde un error de validación y el listado no se modifica

### Requirement: Vista de cronología del diario propio

El diario propio SHALL presentar siempre sus entradas agrupadas por **mes calendario** de su fecha
de registro, con un encabezado por mes — no SHALL ofrecer una vista de lista plana alternativa ni un
conmutador entre vistas: la agrupación por mes es la única presentación. Dentro de cada mes las
entradas SHALL conservar el orden cronológico descendente y las mismas afordancias de edición y menú
de acciones que el resto del diario. La vista de cronología NO SHALL mostrar conteos por mes, totales
ni rachas: es la misma información reordenada, no un resumen estadístico. El agrupado SHALL operar
sobre las entradas ya cargadas, de modo que también agrupe las que llegan al pedir más. Cada
encabezado de mes SHALL ofrecer un control para colapsar u ocultar las filas de ese mes puntual y
volver a expandirlas — todo mes SHALL arrancar expandido por defecto, y el sistema NO SHALL ofrecer
un control que colapse o expanda todos los meses a la vez. Colapsar un mes NUNCA SHALL mostrar cuántas
filas oculta, ni SHALL interpretarse como un conmutador de vista: la agrupación por mes con
encabezado sigue siendo la única presentación del diario.

#### Scenario: Agrupar por mes

- **WHEN** el usuario abre su diario y tiene entradas de varios meses
- **THEN** ve un encabezado por mes y, bajo cada uno, sus entradas en orden cronológico descendente

#### Scenario: Sin conmutador de vista

- **WHEN** el usuario abre su diario
- **THEN** no ve ningún control para elegir entre una vista de lista y una de cronología — la
  agrupación por mes con encabezado es la única forma en que se presenta el diario

#### Scenario: La cronología no es un resumen

- **WHEN** el usuario ve su diario
- **THEN** no aparece ningún conteo por mes, total ni racha; solo los encabezados de mes y las filas

#### Scenario: La cronología agrupa lo que se va cargando

- **WHEN** el usuario pide más entradas
- **THEN** las nuevas entradas se ubican bajo el encabezado del mes que les corresponde, sin romper
  la agrupación

#### Scenario: Todo mes arranca expandido

- **WHEN** el usuario abre su diario
- **THEN** las filas de todos los meses son visibles, sin necesidad de expandir ninguno a mano

#### Scenario: Colapsar un mes puntual

- **WHEN** el usuario acciona el control de colapso del encabezado de un mes
- **THEN** las filas de ese mes dejan de mostrarse, y las de los demás meses no se ven afectadas

#### Scenario: Expandir un mes colapsado

- **WHEN** el usuario acciona el control de un mes que ya está colapsado
- **THEN** las filas de ese mes vuelven a mostrarse, en el mismo orden que antes de colapsarlo

#### Scenario: El encabezado no revela cuántas filas oculta

- **WHEN** el usuario colapsa un mes
- **THEN** el encabezado de ese mes no muestra ningún número de entradas ocultas

#### Scenario: Sin control para colapsar o expandir todos los meses a la vez

- **WHEN** el usuario ve su diario con varios meses cargados
- **THEN** no encuentra ningún control que colapse o expanda todos los meses de una sola acción —
  solo el control individual de cada encabezado

## ADDED Requirements

### Requirement: Meses disponibles para filtrar el diario

El sistema SHALL exponer, para el usuario autenticado, el conjunto de pares año/mes calendario en
los que tiene al menos una escucha registrada, del más reciente al más antiguo, para poblar los
filtros de año y mes — sin exponer cuántas escuchas tiene cada mes.

#### Scenario: Solo meses con al menos una escucha

- **WHEN** el usuario abre el selector de año o de mes del diario
- **THEN** las opciones ofrecidas corresponden únicamente a años/meses donde tiene escuchas
  registradas, sin ninguna opción vacía

#### Scenario: Sin conteos en la lista de meses disponibles

- **WHEN** el sistema devuelve los meses disponibles para filtrar
- **THEN** la respuesta no incluye cuántas escuchas tiene el usuario en cada mes
