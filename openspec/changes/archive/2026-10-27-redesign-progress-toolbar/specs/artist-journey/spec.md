## MODIFIED Requirements

### Requirement: Listado propio de recorridos
El sistema SHALL listar, en la pestaña **Discografías** del panel unificado `/me/progress`
(`?tab=discographies`, capability `progress-hub`), todos los recorridos del
usuario autenticado (en curso, completos y archivados), cada uno con el artista y su estado, sin
fracción numérica visible en ningún modo — mismo criterio que la faceta de perfil; el modo
Detallada SHALL poder mostrar progreso discreto sin números (Requirement "Detalle discreto propio
del modo Detallada"), nunca como texto "X de Y". Cada entrada SHALL
enlazar a la página de gestión de ese recorrido (`/me/artist-journeys/[artistId]`), y SHALL
ofrecer además, agrupadas en su menú de tarjeta (Requirement "Menú de tarjeta del listado"),
acciones para ver la página del artista correspondiente, archivar/desarchivar, y eliminar ese
recorrido sin salir del listado (Requirement "Eliminar un recorrido desde el listado propio").
La ruta SHALL requerir sesión. `/me/artist-journeys` SHALL redirigir a esta pestaña. El estado
vacío SHALL explicar cómo se empieza una discografía y SHALL ofrecer "Completar discografía", la misma acción de la
cabecera.

Cuando el usuario tiene al menos un recorrido, el sistema SHALL ofrecer un buscador que filtre
las entradas por nombre de artista (localmente, sin ida y vuelta al servidor), sin distinguir
mayúsculas de minúsculas ni diacríticos (una búsqueda sin tilde SHALL encontrar un nombre con
tilde, y viceversa), un control de
orden con cuatro opciones — por orden de agregado (activación más reciente primero, el orden en que
ya llega el listado del servidor), alfabético por nombre de artista, por estado (en curso,
luego completo, luego archivado — mismo orden canónico que el resto de la aplicación) o "Más
avanzadas" (mayor proporción escuchada de la selección primero, sin mostrar la proporción) —, un
control segmentado de estado con cuatro opciones excluyentes — todas (por defecto), en curso,
completas, archivadas —, cada una con la cantidad de recorridos en ese estado (sin contar la búsqueda), que acota las
entradas visibles al estado elegido sin alterar el buscador ni el orden; una opción sin recorridos SHALL quedar
deshabilitada salvo que esté activa, y un conmutador de modo de visualización con las mismas tres opciones excluyentes que el
resto de la aplicación (Detallada/Índice/Gráfico — ver `/me/lists/[id]` y Want to Listen), aplicado
por igual a todo el listado. La preferencia de modo SHALL persistir entre visitas para el mismo
navegador; hasta leerla, el listado SHALL mostrar un marcador neutro en lugar de pintar un modo y
saltar a otro. La búsqueda, el orden y el filtro de estado SHALL reflejarse en la URL (`q`, `sort`,
`state`, solo cuando difieren del valor por defecto, sin crear entradas de historial y conservando
`tab`), y la página SHALL abrirse con ellos; un valor inválido SHALL ignorarse. Abrir el panel sin
esos parámetros (desde el menú o cambiando de pestaña) SHALL empezar con los valores por defecto. Ninguna de las opciones de orden, de
filtro de estado ni de modo SHALL alterar qué acción ofrece cada entrada (gestión como enlace
principal, menú de tarjeta con el resto, estado) — solo su densidad visual y su secuencia.

#### Scenario: Listado con recorridos en distintos estados
- **WHEN** un usuario autenticado con recorridos en curso, completos y archivados abre
  `/me/progress?tab=discographies`
- **THEN** ve los tres, cada uno con su estado, sin ninguna fracción de progreso

#### Scenario: Entrada enlaza a la gestión del recorrido
- **WHEN** el propietario hace clic en una entrada del listado
- **THEN** llega a la página de gestión de ese recorrido, no a la página del artista

#### Scenario: Ver la página del artista sin gestionar el recorrido
- **WHEN** el propietario quiere ver la página del artista sin gestionar el recorrido
- **THEN** encuentra "Ver artista" en el menú de tarjeta de esa entrada

#### Scenario: Listado vacío
- **WHEN** un usuario sin ningún recorrido abre `/me/progress?tab=discographies`
- **THEN** ve un estado vacío localizado, sin error, sin buscador, sin control de orden, sin
  filtro de estado ni conmutador de modo

#### Scenario: Sin sesión
- **WHEN** una persona sin sesión abre `/me/progress?tab=discographies`
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
  "todavía no estás completando ninguna discografía"

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
- **WHEN** el propietario elige un modo de visualización y vuelve a abrir `/me/progress?tab=discographies`
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

#### Scenario: Orden "Más avanzadas"
- **WHEN** el propietario elige "Más avanzadas"
- **THEN** ve primero los recorridos con mayor parte de su selección escuchada, sin ninguna cifra de progreso visible

#### Scenario: Segmentos con la cantidad por estado
- **WHEN** el propietario tiene diez recorridos en curso, dos completos y ninguno archivado
- **THEN** los segmentos dicen "Todas 12", "En curso 10", "Completas 2" y "Archivadas 0", este último deshabilitado

#### Scenario: El filtro de estado no persiste entre visitas
- **WHEN** el propietario elige un estado en el filtro y más tarde vuelve a abrir `/me/progress?tab=discographies`
  desde el menú, sin parámetros
- **THEN** el filtro de estado vuelve a "Todo", igual que el buscador y el orden

#### Scenario: Los filtros sobreviven a la recarga
- **WHEN** el propietario busca "def", elige el orden alfabético y el estado "En curso", y recarga la página o vuelve
  desde la gestión de un recorrido
- **THEN** la URL lleva `q=def&sort=alpha&state=in_progress` y el listado se abre con esos mismos filtros

#### Scenario: Sin salto de modo
- **WHEN** el propietario tiene guardado el modo Índice y abre la pestaña
- **THEN** el listado no pinta Detallada antes de Índice
