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
vacío SHALL explicar que una discografía se empieza a completar desde la página de un artista
con "Completar discografía" y SHALL ofrecer un enlace a la búsqueda de artistas.

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

### Requirement: Eliminar un recorrido desde el listado propio
El sistema SHALL permitir al propietario eliminar un recorrido propio directamente desde
`/me/artist-journeys`, sin pasar por la página de gestión, en los tres modos de visualización.
La eliminación SHALL requerir una confirmación de dos pasos por entrada: elegir "Eliminar" en el
menú de tarjeta de esa entrada (Requirement "Menú de tarjeta del listado") abre un diálogo sin
eliminar nada, y un segundo paso explícito ("Eliminar discografía") la ejecuta. El diálogo SHALL
nombrar al artista, decir que se pierde la selección de discos y que las escuchas siguen en el
diario; Cancelar o Escape lo cierran sin cambios. La
eliminación SHALL usar el mismo endpoint y la misma semántica de borrado físico e irreversible
que el Requirement "Borrado del recorrido". Al eliminar exitosamente, la entrada SHALL
desaparecer del listado sin recargar la página; si el listado queda vacío, SHALL mostrarse el
estado vacío de "todavía no armaste ningún recorrido".

#### Scenario: Eliminar requiere confirmación de dos pasos
- **WHEN** el propietario activa la acción de eliminar sobre una entrada del listado
- **THEN** el sistema abre un diálogo que nombra al artista sin eliminar nada todavía; solo
  confirmar en el diálogo ejecuta el borrado

#### Scenario: Eliminar quita la entrada sin recargar la página
- **WHEN** el propietario confirma la eliminación de una entrada
- **THEN** esa entrada desaparece del listado, y el resto de las entradas y el filtro/orden
  activos no se alteran

#### Scenario: Eliminar el último recorrido deja el estado vacío
- **WHEN** el propietario elimina desde el listado su único recorrido
- **THEN** el sistema muestra el estado vacío de "todavía no armaste ningún recorrido"

#### Scenario: Un error al eliminar conserva la entrada
- **WHEN** la eliminación falla
- **THEN** la entrada permanece visible en el listado y el sistema muestra un aviso de error

### Requirement: Menú de tarjeta del listado
Cada entrada del listado propio, en los tres modos de visualización (Detallada, Índice y
Gráfico), SHALL agrupar sus acciones secundarias — ver la página del artista, archivar o
desarchivar, y eliminar — en un único menú desplegable activado por un control "⋮", ubicado
junto al estado de la entrada, en vez de enlaces de texto sueltos. El control "⋮" SHALL tener
contraste suficiente para percibirse en reposo, sin depender del hover o foco para ser visible, y
SHALL medir al menos 32 px (44 px con puntero grueso).
Elegir "Eliminar" en el menú SHALL abrir el diálogo de confirmación del Requirement "Eliminar un
recorrido desde el listado propio", en vez de eliminar de inmediato.

#### Scenario: El menú agrupa las tres acciones secundarias
- **WHEN** el propietario abre el menú "⋮" de una entrada, en cualquiera de los tres modos
- **THEN** encuentra "Ver artista", "Archivar" (o "Desarchivar" si el recorrido ya está
  archivado) y "Eliminar", en ese orden

#### Scenario: Ver artista desde el menú
- **WHEN** el propietario elige "Ver artista" en el menú de una entrada
- **THEN** llega a la página de ese artista

#### Scenario: Archivar o desarchivar desde el menú
- **WHEN** el propietario elige "Archivar" (o "Desarchivar") en el menú de una entrada
- **THEN** el estado de esa entrada se actualiza en el listado sin recargar la página, sin pasar
  por la página de gestión

#### Scenario: Eliminar desde el menú pide confirmación en la propia entrada
- **WHEN** el propietario elige "Eliminar" en el menú de una entrada
- **THEN** el menú se cierra y se abre un diálogo que nombra al artista, sin haber eliminado
  nada todavía; solo confirmar ese segundo paso ejecuta el borrado

#### Scenario: El menú es el mismo en los tres modos
- **WHEN** el propietario cambia de modo de visualización
- **THEN** encuentra el mismo menú "⋮" con las mismas tres acciones en cada modo, solo con
  distinta ubicación y densidad visual según el layout de cada uno

### Requirement: Detalle discreto propio del modo Detallada
El modo Detallada SHALL mostrar, por cada entrada, una señal adicional que lo distinga de
Índice (deliberadamente compacto, sin esta información): una barra de progreso discreta de la
selección propia ya escuchada, sin fracción numérica visible en ningún punto de esa barra ni a
su lado (mismo criterio que el Requirement "Progreso informativo acotado a la página de
gestión" — §6.4.1: nunca "X de Y" fuera de la página de gestión), y la fecha de última
actualización del recorrido, en formato relativo. La barra SHALL omitirse por completo — sin
espacio vacío que la reemplace — cuando la selección está vacía. Para un lector de pantalla, la
barra SHALL anunciarse con una etiqueta discreta sin números (sin empezar, recién empezado, a la
mitad, casi terminado, completo). La foto del artista SHALL tener un fondo neutro mientras carga. El modo Índice SHALL NOT mostrar
esta información: existe precisamente para ser la vista compacta.

#### Scenario: Progreso discreto sin fracción numérica en Detallada
- **WHEN** el propietario ve una entrada en modo Detallada con álbumes seleccionados
- **THEN** ve una barra de progreso proporcional a lo escuchado, sin ningún número de álbumes
  visible junto a ella

#### Scenario: La barra se anuncia sin números
- **WHEN** un lector de pantalla llega a la barra de un recorrido con la mitad de su selección escuchada
- **THEN** anuncia "Avance: a la mitad", sin fracción ni porcentaje

#### Scenario: Sin barra cuando la selección está vacía
- **WHEN** una entrada en modo Detallada no tiene ningún álbum seleccionado
- **THEN** no se muestra ninguna barra de progreso para esa entrada

#### Scenario: Última actualización visible en Detallada
- **WHEN** el propietario ve una entrada en modo Detallada
- **THEN** ve la fecha de última actualización de ese recorrido, en formato relativo

#### Scenario: Índice se mantiene compacto
- **WHEN** el propietario ve el listado en modo Índice
- **THEN** ninguna entrada muestra barra de progreso ni fecha de última actualización
