## MODIFIED Requirements

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
