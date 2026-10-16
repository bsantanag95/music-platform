# album-discovery Specification

## Purpose

Superficie pública `/explore` centrada en álbumes: colecciones editoriales de un usuario
curador (vía `user_list_featured`), exploración por década y por género desde datos de
catálogo, y rieles por reglas (mejor valorados, más reseñados) con degradación grácil ante
poca data. Descubrimiento editorial y por reglas, nunca personalizado por afinidad. Primera
pieza de la Fase 0 de `redefine-content-hierarchy` que hace visible al álbum como unidad
cultural. En Fase 1 solo álbumes; artistas, canciones y listas son pestañas futuras.
## Requirements
### Requirement: Superficie de descubrimiento de álbumes

El sistema SHALL exponer una vista pública en `/{locale}/explore` para los locales
soportados, accesible con y sin sesión, que presenta el descubrimiento de álbumes. La vista
SHALL componer, en este orden, las secciones que tengan contenido:

1. Colecciones
2. Popular ahora
3. Exploración por género
4. Novedades
5. Próximos lanzamientos
6. Premios
7. Mejor valorados de la comunidad
8. Exploración por década

Colecciones SHALL ser **una sola sección**, con un único orden, un único tope y un único enlace "Ver todas" a la
página de colecciones: la vista SHALL NOT separar las colecciones curadas de las generadas por plantilla, porque la
forma en que se mantiene una colección no es información para quien mira. Novedades, Próximos lanzamientos,
Exploración por década y
Exploración por género SHALL ser
**secciones independientes**, cada una con su propia lógica de navegación (Novedades y
Próximos lanzamientos abren sus listados completos; Década y Género abren listados filtrados
con parámetros distintos). Premios SHALL enlazar a las páginas de ceremonia y al índice de
premios (capacidad `music-awards`). El descubrimiento SHALL ser editorial y por reglas: SHALL
NOT usar recomendación algorítmica ni personalización por afinidad. La vista SHALL centrarse en
álbumes; la única sección que muestra artistas y canciones SHALL ser Popular ahora, con sus pestañas,
y la vista SHALL NOT ofrecer listas como objetivo de descubrimiento.

#### Scenario: Visita pública

- **WHEN** una persona con o sin sesión abre `/es/explore` o `/en/explore`
- **THEN** ve las secciones de descubrimiento de álbumes con las etiquetas de interfaz en
  el locale activo y los datos musicales sin traducir

#### Scenario: Sección sin contenido se omite

- **WHEN** una sección de la vista no tiene contenido que mostrar
- **THEN** esa sección no se renderiza — la vista se compone solo con las que sí tienen
  contenido, sin huecos ni mensajes de "vacío"

#### Scenario: Sin recomendación personalizada

- **WHEN** dos usuarios distintos con sesión abren `/explore`
- **THEN** ambos ven la misma composición: el contenido no depende de a quién siguen ni de
  su actividad

#### Scenario: Sección Premios

- **WHEN** hay ceremonias de premios cargadas
- **THEN** `/explore` muestra, después de Próximos lanzamientos, una tarjeta por cada una de
  las últimas 5 ceremonias y un enlace a `/awards`; sin ceremonias, la sección se omite

#### Scenario: La comunidad antes que la década

- **WHEN** `/explore` muestra Premios, Mejor valorados y Exploración por década
- **THEN** el riel de mejor valorados aparece antes que la exploración por década, que cierra la página

#### Scenario: Colecciones abre la página

- **WHEN** `/explore` renderiza la sección Colecciones
- **THEN** es la primera sección de la página y encabeza el recorrido, antes de Popular ahora y de la exploración por género

#### Scenario: Popular ahora después de Colecciones

- **WHEN** `/explore` renderiza Colecciones y Popular ahora
- **THEN** Popular ahora es la segunda sección, antes de la exploración por género

### Requirement: Colecciones destacadas

La vista `/explore` SHALL mostrar las colecciones destacadas en **un solo riel**, con las filas **vigentes** de
`user_list_featured` (`starts_at` pasado y `expires_at` nulo o futuro) cuya lista sea pública, visible y de álbumes,
sin distinguir el origen: las curadas a mano (`source='curated'`, de listas oficiales no retiradas) y las generadas
por plantilla (`source='template'`) SHALL compartir el riel, el orden y el tope.

El riel SHALL ordenarse por `weight` descendente y, a igualdad, por `rank` ascendente, con un máximo de 10 tarjetas, y
SHALL mostrarse siempre que exista al menos una colección vigente. Cada colección SHALL presentarse con su título, la
etiqueta de su familia, su conteo de ítems y sus carátulas disponibles, y SHALL enlazar a su página de detalle. El
riel SHALL ofrecer un enlace "Ver todas" a la página de colecciones.

El riel SHALL desplazarse horizontalmente y SHALL mostrar al menos **6 colecciones sin desplazar** en un ancho de
escritorio: la tarjeta del riel SHALL ser más compacta que la de la página de colecciones (pila de fundas reducida y
sin descripción), porque un riel horizontal no garantiza que alguien lo desplace y mostrar menos de 6 de entrada
empobrecería la sección. El riel SHALL ofrecer controles de desplazamiento anterior y siguiente con
etiqueta accesible, que SHALL desactivarse en cada extremo y SHALL omitirse cuando todas las tarjetas caben sin
desplazar. El desplazamiento SHALL funcionar con el gesto táctil nativo y SHALL respetar la preferencia de movimiento
reducido del sistema. La tarjeta SHALL NOT indicar si la colección se armó a mano o por plantilla.

#### Scenario: Con colecciones sembradas

- **WHEN** existen filas curadas y filas generadas vigentes
- **THEN** `/explore` muestra un solo riel "Colecciones" con las dos clases mezcladas, ordenadas por peso y rank, sin
  rótulo que distinga su origen

#### Scenario: Colección vencida

- **WHEN** una fila de `user_list_featured` tiene `expires_at` en el pasado
- **THEN** su colección no aparece en el riel

#### Scenario: Tope de tarjetas

- **WHEN** hay más de 10 colecciones vigentes
- **THEN** el riel muestra solo las 10 primeras según el orden definido

#### Scenario: Sin curaduría publicada

- **WHEN** no hay ninguna colección curada vigente
- **THEN** el riel se muestra con normalidad solo con las generadas, sin un bloque vacío ni un mensaje aparte

#### Scenario: Sin colecciones destacadas

- **WHEN** ninguna lista tiene fila vigente en `user_list_featured`
- **THEN** el riel no aparece en `/explore`

#### Scenario: Etiqueta de familia

- **WHEN** se muestra una colección generada por `grammy-winners`
- **THEN** su tarjeta lleva la etiqueta "Premios"

#### Scenario: Familia de una colección manual

- **WHEN** se muestra una colección curada a la que se asignó la familia `discovery`
- **THEN** su tarjeta lleva la etiqueta "Descubrimiento", igual que una generada de esa familia

#### Scenario: Controles de desplazamiento

- **WHEN** hay más colecciones vigentes de las que caben en el ancho visible
- **THEN** el riel ofrece los controles anterior y siguiente, el anterior está desactivado al inicio y el siguiente al
  llegar al final

#### Scenario: Todo cabe en pantalla

- **WHEN** las colecciones vigentes caben sin desplazar
- **THEN** el riel no muestra los controles de desplazamiento

#### Scenario: Seis de un vistazo

- **WHEN** hay 10 colecciones vigentes y se abre `/explore` en un ancho de escritorio
- **THEN** se ven 6 tarjetas completas en una sola fila, sin descripción, y las demás quedan a un desplazamiento

### Requirement: Exploración por década y por género

La vista `/explore` SHALL ofrecer navegación por **década** (derivada de
`release_group.first_release_year`), por **familia** de géneros y por **género** (derivados de
los géneros efectivos de cada álbum, ver capability `genre-seeds`). Las tarjetas de familia SHALL
mostrar, en el orden de la taxonomía, las familias principales que tienen álbumes, y las familias
secundarias con álbumes agrupadas detrás de "Más"; una familia sin álbumes SHALL NOT mostrar tarjeta.
Cada tarjeta SHALL ser visual: un mosaico de hasta cuatro carátulas de discos de estudio de la familia
con el nombre de la familia encima, y SHALL NOT mostrar número de álbumes ni barra de tamaño. Una
familia sin carátulas disponibles SHALL mostrarse como tarjeta plana con su nombre. Al elegir una década,
una familia o un género, el sistema SHALL mostrar
un listado paginado de álbumes de ese corte en `/{locale}/explore` acotado por un parámetro de
consulta (`?decada=`, `?familia=<clave>` o `?genero=<slug>`), aplicando **un solo corte a la vez**
con prioridad `decada` > `familia` > `genero`. El listado por familia SHALL incluir los álbumes con
algún género efectivo de la familia; el listado por género SHALL incluir los álbumes con ese género
o con cualquiera de sus subgéneros. Una familia o un slug desconocido SHALL mostrar el estado vacío.
El listado SHALL ordenarse de forma determinista. El orden por defecto, llamado **"Destacados"**
(no "Mejor valorados"), SHALL ser, en este orden de prioridad: los lanzamientos con fecha posterior a
hoy al final; luego la valoración agregada del álbum cuando alcanza `MIN_RATINGS_PER_ALBUM`; luego
el premio (ganador antes que nominado); luego los discos de estudio antes que el resto de tipos;
luego los de carátula ya resuelta; luego `first_release_year` descendente, con desempate estable por
identificador. Los álbumes sin año conocido SHALL NOT aparecer en un listado por década.

#### Scenario: Listado por década

- **WHEN** una persona elige la década de 1990 en `/explore`
- **THEN** ve un listado paginado de álbumes cuyo `first_release_year` cae en 1990–1999,
  con orden determinista

#### Scenario: Listado por género

- **WHEN** una persona elige un género en `/explore`
- **THEN** ve un listado paginado de álbumes etiquetados con ese género, con orden
  determinista

#### Scenario: Un corte a la vez

- **WHEN** la URL incluye tanto `decada` como `genero`
- **THEN** el sistema aplica solo uno de los dos (el documentado como prioritario) y
  compone el listado sin combinarlos

#### Scenario: Álbum sin año en el browse por década

- **WHEN** un álbum no tiene `first_release_year`
- **THEN** no aparece en ningún listado por década, pero sigue siendo alcanzable por
  género, novedades y búsqueda

#### Scenario: Listado por familia

- **WHEN** una persona elige la familia Latina en `/explore`
- **THEN** ve los álbumes con algún género efectivo de Latina, incluidos los de "latin pop" y
  "trap latino"

#### Scenario: Género con subgéneros

- **WHEN** una persona abre `/explore?genero=rock`
- **THEN** el listado incluye los álbumes de "rock" y los de sus subgéneros, como "shoegaze"

#### Scenario: Álbum con género heredado

- **WHEN** un álbum no tiene géneros propios y su artista principal tiene "shoegaze"
- **THEN** el álbum aparece en el listado de "shoegaze"

#### Scenario: Clave desconocida

- **WHEN** la URL es `/explore?familia=inexistente`
- **THEN** la vista muestra el estado vacío del listado

#### Scenario: Tarjeta de familia con carátulas

- **WHEN** una familia tiene discos de estudio con carátula
- **THEN** su tarjeta muestra un mosaico de hasta cuatro de esas carátulas con el nombre de la familia, sin número de
  álbumes ni barra

#### Scenario: Familia sin carátulas

- **WHEN** una familia tiene álbumes pero ninguno de estudio con carátula
- **THEN** su tarjeta se muestra plana con el nombre de la familia y sigue llevando a su listado

#### Scenario: Sin repetir discos entre familias

- **WHEN** dos familias comparten discos entre sus mejores candidatos
- **THEN** cada disco aparece en la tarjeta de una sola familia, salvo el relleno de una familia que de otro modo quedaría con
  menos de dos carátulas

#### Scenario: Carátulas estables

- **WHEN** se abre `/explore` dos veces sin que cambien los datos
- **THEN** cada familia muestra las mismas carátulas, elegidas por la señal de calidad y con desempate por id

#### Scenario: Estudio antes que sencillos en el orden por defecto

- **WHEN** se abre un listado sin elegir orden ni tipo y hay discos de estudio y sencillos sin valoraciones ni premios
- **THEN** los discos de estudio aparecen antes que los sencillos, las recopilaciones y los directos

#### Scenario: Lanzamientos futuros al final

- **WHEN** un disco tiene fecha de lanzamiento posterior a hoy
- **THEN** en el orden por defecto aparece después de los ya publicados, aunque su año sea el más reciente

#### Scenario: Valoración y premio mandan

- **WHEN** un disco alcanza `MIN_RATINGS_PER_ALBUM` valoraciones o ganó un premio
- **THEN** aparece antes que los discos sin valoración ni premio, y el de mayor promedio antes que el de menor

### Requirement: Novedades

La vista `/explore` SHALL incluir un riel de novedades con los release-groups de categoría
`studio` o `single_ep` cuya `first_release_date` (fecha completa, con precisión diaria) caiga
entre hoy menos `NEW_RELEASE_WINDOW_DAYS` días (90) y hoy, inclusive, ordenados por
`first_release_date` descendente y, ante empate, por `id`, acotado a `RAIL_SIZE` álbumes. El riel
SHALL excluir los álbumes sin `first_release_date` (solo año o mes conocidos), los de fecha
posterior a hoy y los sin carátula. El riel SHALL omitirse por completo cuando haya menos de
`MIN_ALBUMS_FOR_SECTION` álbumes elegibles. Cada tarjeta SHALL mostrar la fecha de lanzamiento (día y
mes) en lugar del año, y el riel SHALL ofrecer "Ver todo →" hacia el listado completo de novedades. El riel
de Novedades de la página de género NO SHALL verse afectado por este requisito.

#### Scenario: Riel de novedades

- **WHEN** hay al menos `MIN_ALBUMS_FOR_SECTION` álbumes de estudio o single/EP con carátula lanzados en los
  últimos 90 días
- **THEN** `/explore` muestra un riel de novedades con los más recientes primero por fecha de lanzamiento, con
  la fecha en cada tarjeta y un enlace "Ver todo →" a `/explore?novedades=1`

#### Scenario: Fuera de la ventana

- **WHEN** un álbum se lanzó hace 120 días
- **THEN** no aparece en el riel de novedades

#### Scenario: Lanzamiento futuro

- **WHEN** un álbum tiene `first_release_date` posterior a hoy
- **THEN** no aparece en el riel de novedades

#### Scenario: Fecha parcial

- **WHEN** un álbum solo tiene `first_release_year` (sin `first_release_date`)
- **THEN** no aparece en el riel de novedades

#### Scenario: Sin carátula

- **WHEN** un álbum reciente no tiene `cover_thumb_url`
- **THEN** no aparece en el riel de novedades

#### Scenario: Pocas novedades

- **WHEN** hay menos de `MIN_ALBUMS_FOR_SECTION` álbumes elegibles en la ventana
- **THEN** `/explore` no renderiza el riel de novedades ni un mensaje de vacío

#### Scenario: Orden dentro del mismo año

- **WHEN** dos álbumes de 2026 se lanzaron el 3 de mayo y el 20 de septiembre
- **THEN** el de septiembre aparece antes, sin importar cuál entró primero al catálogo

### Requirement: Rieles por reglas con degradación grácil

La vista `/explore` SHALL incluir un riel de **mejor valorados** (álbumes por valoración
agregada de `rating`) y la sección **Popular ahora** (capacidad `popularity`), que reemplaza al
antiguo riel de más reseñados. El sistema SHALL distinguir dos umbrales, con nombres y significados diferentes:

- **Elegibilidad del álbum** (`MIN_RATINGS_PER_ALBUM` para el riel de valorados; para Popular ahora,
  las personas distintas de la capacidad `popularity`): un álbum solo entra si alcanza ese mínimo. Esto evita
  que un promedio alto con muy pocas señales quede por encima de uno respaldado por muchas.
- **Visibilidad del riel** (`MIN_ALBUMS_FOR_SECTION`): el riel de valorados se muestra solo si el número
  de álbumes elegibles alcanza ese mínimo; Popular ahora sigue su propia ventana y sus mínimos por tipo.

Cada riel por reglas SHALL calcularse **sin tabla materializada**, y SHALL **omitirse por completo** cuando no
alcanza su mínimo — no SHALL mostrarse vacío ni con un texto de "todavía no hay datos". Los umbrales SHALL vivir
en constantes del servicio, ajustables sin migración.

#### Scenario: Riel oculto por falta de datos

- **WHEN** menos de `MIN_ALBUMS_FOR_SECTION` álbumes tienen al menos
  `MIN_RATINGS_PER_ALBUM` valoraciones
- **THEN** el riel de mejor valorados no aparece en `/explore`

#### Scenario: Riel visible cuando hay datos

- **WHEN** al menos `MIN_ALBUMS_FOR_SECTION` álbumes alcanzan `MIN_RATINGS_PER_ALBUM`
  valoraciones
- **THEN** el riel de mejor valorados aparece, ordenado por la valoración agregada de esos
  álbumes elegibles, sin tabla materializada

#### Scenario: Un promedio alto con pocas señales no domina el riel

- **WHEN** un álbum tiene un promedio de 5,0 con una sola valoración y otro tiene 4,7 con
  muchas
- **THEN** el primero no aparece en "mejor valorados" (no alcanza `MIN_RATINGS_PER_ALBUM`)
  y el riel no lo pone por encima del segundo

#### Scenario: Más reseñados

- **WHEN** se abre `/explore`
- **THEN** no hay un riel de más reseñados: su lugar lo ocupa Popular ahora, donde las reseñas son uno de los gestos que cuentan

### Requirement: Acceso desde la navegación global

El sistema SHALL exponer un enlace a `/explore` en la navegación global (encabezado y pie),
visible con y sin sesión. La aparición del enlace y la disponibilidad de la ruta SHALL
estar controladas por un flag de configuración leído en el servidor: con el flag apagado,
el enlace SHALL NOT mostrarse y `/explore` SHALL redirigir a Inicio.

#### Scenario: Flag encendido

- **WHEN** el flag de descubrimiento está encendido
- **THEN** el enlace a `/explore` aparece en el encabezado y el pie para cualquier
  visitante, y la ruta responde con la superficie de descubrimiento

#### Scenario: Flag apagado

- **WHEN** el flag de descubrimiento está apagado
- **THEN** el enlace no aparece en ninguna parte y abrir `/explore` redirige a Inicio

### Requirement: Cuenta curadora como fuente del contenido editorial

El sistema SHALL disponer de una cuenta de usuario **curadora** —`app_user` con
`username` `exploracion`, `display_name` `Exploración`, sin `password_hash`, con
`profile_visibility` público— cuyas listas públicas de álbumes son la fuente del contenido
editorial de `/explore`. La cuenta SHALL NOT poder iniciar sesión (no tiene credenciales ni
`auth_identity`). El contenido editorial SHALL sembrarse mediante un script idempotente, no
mediante una interfaz de administración en la aplicación.

#### Scenario: La cuenta curadora no puede autenticarse

- **WHEN** alguien intenta iniciar sesión con el `username` de la cuenta curadora
- **THEN** el intento falla como cualquier credencial inválida y no se crea sesión

#### Scenario: El seed es idempotente

- **WHEN** el script de siembra se ejecuta dos veces
- **THEN** la segunda ejecución no duplica la cuenta, las listas ni sus ítems

#### Scenario: Álbum de una colección que no está en el catálogo local

- **WHEN** el script de siembra referencia un álbum por `mbid` que aún no fue ingerido
- **THEN** ese ítem se omite con un aviso y el resto de la colección se siembra igual

### Requirement: Próximos lanzamientos

La vista `/explore` SHALL incluir, inmediatamente después del riel de Novedades, un riel de próximos
lanzamientos con los release-groups de categoría `studio` o `single_ep` cuya `first_release_date` (fecha
completa) sea posterior a hoy y no pase de hoy más `UPCOMING_WINDOW_DAYS` días (180), ordenados por
`first_release_date` ascendente y, ante empate, por `id`, acotado a `RAIL_SIZE` álbumes. El riel SHALL excluir
los álbumes sin `first_release_date`, los de fecha igual o anterior a hoy y los sin carátula, SHALL NOT ordenar
por popularidad ni limitar por artista o familia de géneros, y SHALL omitirse por completo cuando haya menos de
`MIN_ALBUMS_FOR_SECTION` álbumes elegibles. Cada tarjeta SHALL mostrar la fecha de lanzamiento (día y mes) en
lugar del año. El riel SHALL ser igual para todas las personas y SHALL ofrecer "Ver todo →" hacia el listado
completo.

#### Scenario: Riel de próximos lanzamientos

- **WHEN** hay al menos `MIN_ALBUMS_FOR_SECTION` álbumes de estudio o single/EP con carátula que salen en los
  próximos 180 días
- **THEN** `/explore` muestra, bajo Novedades, un riel con los más cercanos primero y la fecha en cada tarjeta

#### Scenario: Lo de hoy no es un próximo lanzamiento

- **WHEN** un álbum tiene `first_release_date` igual a hoy
- **THEN** aparece en Novedades y no en Próximos lanzamientos

#### Scenario: Fuera de la ventana

- **WHEN** un álbum sale dentro de 200 días
- **THEN** no aparece en el riel de próximos lanzamientos

#### Scenario: Fecha parcial o sin carátula

- **WHEN** un álbum futuro solo tiene `first_release_year`, o no tiene `cover_thumb_url`
- **THEN** no aparece en el riel de próximos lanzamientos

#### Scenario: Pocos próximos lanzamientos

- **WHEN** hay menos de `MIN_ALBUMS_FOR_SECTION` álbumes elegibles
- **THEN** `/explore` no renderiza el riel ni un mensaje de vacío

#### Scenario: Sin recorte por artista

- **WHEN** un artista tiene dos lanzamientos futuros dentro de la ventana
- **THEN** ambos pueden aparecer en el riel

### Requirement: Listado completo de próximos lanzamientos

`/explore?proximos=1` SHALL mostrar el listado completo y paginado (`FILTERED_PAGE_SIZE`) de los álbumes que
cumplen las condiciones del riel de próximos lanzamientos, en orden cronológico ascendente por
`first_release_date` y `id`, con la fecha de lanzamiento en cada tarjeta. SHALL permitir filtrar por tipo
(`tipo=`) y paginar (`page=`), SHALL NOT ofrecer selector de orden, y SHALL NOT aplicar el umbral
`MIN_ALBUMS_FOR_SECTION`. SHALL ofrecer cortes hermanos para saltar al listado de novedades. Sin resultados
SHALL mostrar el estado vacío del listado. El corte SHALL tener menor prioridad que década, familia y género, y
mayor que el de novedades, cuando se combinan en la URL.

#### Scenario: Listado completo

- **WHEN** una persona abre `/explore?proximos=1` y hay 30 álbumes futuros elegibles
- **THEN** ve 24 en orden cronológico y un enlace a la página siguiente con los 6 restantes

#### Scenario: Filtro por tipo

- **WHEN** abre `/explore?proximos=1&tipo=studio`
- **THEN** ve solo álbumes de estudio, sin selector de orden

#### Scenario: Pocos resultados

- **WHEN** solo hay 2 álbumes futuros elegibles
- **THEN** el listado los muestra igual, aunque el riel de la portada esté omitido

#### Scenario: Sin resultados

- **WHEN** no hay álbumes futuros elegibles
- **THEN** el listado muestra el estado vacío

#### Scenario: Salto al listado de novedades

- **WHEN** una persona está en `/explore?proximos=1&tipo=studio`
- **THEN** ve los cortes hermanos "Novedades" y "Próximos lanzamientos" con el segundo marcado, y el enlace a
  Novedades conserva el tipo y vuelve a la página 1

### Requirement: Listado completo de novedades

`/explore?novedades=1` SHALL mostrar el listado completo y paginado (`FILTERED_PAGE_SIZE`) de los álbumes que
cumplen las condiciones del riel de novedades (misma ventana de `NEW_RELEASE_WINDOW_DAYS`), en orden
cronológico descendente por `first_release_date` y `id`, con la fecha de lanzamiento en cada tarjeta. SHALL
permitir filtrar por tipo (`tipo=`) y paginar (`page=`), SHALL NOT ofrecer selector de orden, SHALL NOT aplicar
el umbral `MIN_ALBUMS_FOR_SECTION` y SHALL ofrecer cortes hermanos para saltar al listado de próximos
lanzamientos. Sin resultados SHALL mostrar el estado vacío del listado. El corte SHALL tener menor prioridad que
década, familia, género y próximos lanzamientos cuando se combinan en la URL.

#### Scenario: Listado completo

- **WHEN** una persona abre `/explore?novedades=1` y hay 40 álbumes elegibles en los últimos 90 días
- **THEN** ve 24 con el más reciente primero y un enlace a la página siguiente con los 16 restantes

#### Scenario: Filtro por tipo

- **WHEN** abre `/explore?novedades=1&tipo=single_ep`
- **THEN** ve solo singles y EPs, sin selector de orden

#### Scenario: Pocas novedades

- **WHEN** solo hay 3 álbumes elegibles
- **THEN** el listado los muestra igual, aunque el riel de la portada esté omitido

#### Scenario: Sin resultados

- **WHEN** no hay álbumes elegibles en la ventana
- **THEN** el listado muestra el estado vacío

#### Scenario: Salto al listado de próximos lanzamientos

- **WHEN** una persona está en `/explore?novedades=1`
- **THEN** ve los cortes hermanos "Novedades" y "Próximos lanzamientos" con el primero marcado

#### Scenario: Prioridad entre cortes

- **WHEN** la URL trae `novedades=1` y `proximos=1`
- **THEN** se muestra el listado de próximos lanzamientos

### Requirement: Navegación rápida de Explorar

La vista `/explore` SHALL mostrar, bajo el título, una fila de enlaces ("En esta página") con un enlace por cada
sección que se renderiza, en el mismo orden de la página, cada uno hacia el ancla de su sección: `colecciones`,
`popular`, `generos`, `novedades`, `proximos`, `premios`, `mejor-valorados` y `decadas`. La fila SHALL NOT
enlazar a una sección omitida y SHALL omitirse por completo cuando se rendericen menos de 4 secciones. La fila SHALL
funcionar sin JavaScript y SHALL NOT ser fija ni resaltar la sección activa. Las etiquetas SHALL ser cortas y estar en
el locale activo.

#### Scenario: Fila con todas las secciones

- **WHEN** `/es/explore` renderiza las 8 secciones
- **THEN** la fila muestra "Colecciones, Popular, Géneros, Novedades, Próximos, Premios, Mejor valorados,
  Décadas", cada una enlazada a su ancla

#### Scenario: Sección omitida

- **WHEN** Novedades y Próximos lanzamientos no tienen contenido
- **THEN** la fila no los incluye y ninguno de sus enlaces apunta a un ancla inexistente

#### Scenario: Pocas secciones

- **WHEN** `/explore` renderiza solo 3 secciones
- **THEN** la fila de navegación rápida no aparece

#### Scenario: Salto a una sección

- **WHEN** una persona activa "Premios" en la fila
- **THEN** la página se desplaza a la sección Premios sin que el encabezado global tape su título

### Requirement: Vista de familia de géneros

El listado de una familia (`/{locale}/explore?familia=<clave>`) SHALL mostrar, en este orden, el título de la familia sin rótulo
de tipo de corte encima, una fila de **géneros de la familia**, un selector de **otras familias** plegado y los filtros de tipo y orden
sobre la rejilla. La fila de géneros SHALL ofrecer hasta 12 chips con los géneros de estilo más grandes de la familia (por número de
álbumes con ese género efectivo), cada uno enlazado a la página del género (`/{locale}/genre/<slug>`), con el nombre en el idioma activo
y sin mostrar ninguna cifra. El selector de otras familias SHALL ser un desplegable cerrado por defecto que lista las demás familias con
álbumes y marca la actual. Ningún listado de década, familia, género, novedades o próximos SHALL mostrar un rótulo de tipo de corte sobre
su título.

#### Scenario: Géneros de la familia

- **WHEN** una persona abre `/es/explore?familia=rock`
- **THEN** ve una fila de géneros de Rock (por ejemplo "hard rock" y "psychedelic rock"), cada uno enlazado a su página, sin números

#### Scenario: Página completa del género

- **WHEN** elige un género de la fila
- **THEN** llega a la página del género con su descripción, subgéneros, artistas y listas

#### Scenario: Selector de familias plegado

- **WHEN** la vista de familia se abre por primera vez
- **THEN** el selector de otras familias está cerrado y el primer disco queda a la vista sin una fila de veinte chips antes

#### Scenario: Cambio de familia

- **WHEN** abre el selector y elige Jazz
- **THEN** llega a `/explore?familia=jazz` conservando el tipo y el orden elegidos

#### Scenario: Sin rótulo sobre el título

- **WHEN** se abre un listado de década, familia, género, novedades o próximos
- **THEN** el título va directamente bajo la miga de pan, sin un rótulo de tipo de corte encima

#### Scenario: Familia con pocos géneros

- **WHEN** una familia tiene menos de 12 géneros con álbumes
- **THEN** la fila muestra solo los que tienen álbumes

### Requirement: Sección Popular ahora

La vista `/explore` SHALL mostrar la sección **Popular ahora** (ancla `popular`) con la popularidad reciente de la comunidad
(capacidad `popularity`) en tres pestañas: **Álbumes**, **Artistas** y **Canciones**. Álbumes SHALL mostrarse como riel de carátulas de
hasta `RAIL_SIZE` discos; Artistas y Canciones como listas numeradas de hasta 10, el artista con su foto si la hay y la canción con la
carátula de su disco y su artista. Cada ítem SHALL enlazar a su página. El subtítulo SHALL decir la ventana usada ("este mes", "en los
últimos 3 meses" o "de siempre"); con pestañas de ventanas distintas, el subtítulo SHALL ser el de la pestaña activa. Una pestaña sin
resultado SHALL NOT mostrarse y, sin ninguna, la sección SHALL omitirse. La primera pestaña con resultado SHALL estar activa al cargar,
cambiar de pestaña SHALL NOT pedir datos al servidor y, sin JavaScript, SHALL verse la pestaña de álbumes. Las pestañas SHALL ser
accesibles por teclado (`tablist`, flechas). La cifra "N personas" SHALL aparecer solo desde 5.

#### Scenario: Tres pestañas

- **WHEN** hay álbumes, artistas y canciones con actividad suficiente
- **THEN** la sección muestra las tres pestañas, con Álbumes activa

#### Scenario: Sin canciones populares

- **WHEN** no hay gestos sobre canciones
- **THEN** la pestaña Canciones no aparece y las otras dos sí

#### Scenario: Ventana honesta

- **WHEN** los álbumes populares se calcularon con todos los gestos por falta de actividad reciente
- **THEN** el subtítulo dice "de siempre", no "este mes"

#### Scenario: Cambio de pestaña

- **WHEN** una persona elige la pestaña Artistas
- **THEN** ve la lista numerada de artistas sin recargar la página

