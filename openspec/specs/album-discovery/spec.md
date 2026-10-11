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

1. Colecciones destacadas
2. Exploración por género
3. Novedades
4. Próximos lanzamientos
5. Premios
6. Exploración por década
7. Mejor valorados de la comunidad
8. Más reseñados

Novedades, Próximos lanzamientos, Exploración por década y Exploración por género SHALL ser
**secciones independientes**, cada una con su propia lógica de navegación (Novedades y
Próximos lanzamientos abren sus listados completos; Década y Género abren listados filtrados
con parámetros distintos). Premios SHALL enlazar a las páginas de ceremonia y al índice de
premios (capacidad `music-awards`). El descubrimiento SHALL ser editorial y por reglas: SHALL
NOT usar recomendación algorítmica ni personalización por afinidad. En Fase 1 la vista SHALL
centrarse en álbumes; SHALL NOT ofrecer pestañas de artistas, canciones ni listas.

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

### Requirement: Colecciones destacadas

La vista `/explore` SHALL mostrar las listas públicas de álbumes que tienen una fila en
`user_list_featured`, ordenadas de forma ascendente por `rank`, como el riel de colecciones
editoriales. Cada colección SHALL presentarse con su título, su conteo de ítems y sus
carátulas disponibles, y SHALL enlazar a la página de detalle de esa lista. El riel SHALL
mostrarse siempre que exista al menos una lista destacada.

#### Scenario: Con colecciones sembradas

- **WHEN** existen listas de álbumes con fila en `user_list_featured`
- **THEN** `/explore` las muestra en el riel de colecciones destacadas, en orden ascendente
  de `rank`, cada una enlazando a su detalle

#### Scenario: Sin colecciones destacadas

- **WHEN** ninguna lista tiene fila en `user_list_featured`
- **THEN** el riel de colecciones destacadas no aparece en `/explore`

### Requirement: Exploración por década y por género

La vista `/explore` SHALL ofrecer navegación por **década** (derivada de
`release_group.first_release_year`), por **familia** de géneros y por **género** (derivados de
los géneros efectivos de cada álbum, ver capability `genre-seeds`). Los chips de género SHALL
mostrar, en el orden de la taxonomía, las familias principales que tienen álbumes, con su número
de álbumes, y las familias secundarias con álbumes agrupadas detrás de "Más"; una familia sin
álbumes SHALL NOT mostrar chip. Al elegir una década, una familia o un género, el sistema SHALL mostrar
un listado paginado de álbumes de ese corte en `/{locale}/explore` acotado por un parámetro de
consulta (`?decada=`, `?familia=<clave>` o `?genero=<slug>`), aplicando **un solo corte a la vez**
con prioridad `decada` > `familia` > `genero`. El listado por familia SHALL incluir los álbumes con
algún género efectivo de la familia; el listado por género SHALL incluir los álbumes con ese género
o con cualquiera de sus subgéneros. Una familia o un slug desconocido SHALL mostrar el estado vacío.
El listado SHALL ordenarse de forma determinista: por valoración agregada del álbum cuando
alcanza `MIN_RATINGS_PER_ALBUM`, luego por `first_release_year` descendente, con desempate
estable. Los álbumes sin año conocido SHALL NOT aparecer en un listado por década.

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
agregada de `rating`) y un riel de **más reseñados** (álbumes por conteo de `review`). El
sistema SHALL distinguir dos umbrales, con nombres y significados diferentes:

- **Elegibilidad del álbum** (`MIN_RATINGS_PER_ALBUM` para el riel de valorados,
  `MIN_REVIEWS_PER_ALBUM` para el de reseñados): un álbum solo entra en el riel si su
  conteo de valoraciones (o reseñas) alcanza ese mínimo. Esto evita que un promedio alto
  con muy pocas señales quede por encima de uno respaldado por muchas.
- **Visibilidad del riel** (`MIN_ALBUMS_FOR_SECTION`): el riel se muestra solo si el número
  de álbumes elegibles alcanza ese mínimo.

Cada riel por reglas SHALL calcularse **bajo demanda, sin tabla materializada**, y SHALL
**omitirse por completo** cuando no alcanza `MIN_ALBUMS_FOR_SECTION` álbumes elegibles — no
SHALL mostrarse vacío ni con un texto de "todavía no hay datos". Los umbrales SHALL vivir
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

- **WHEN** al menos `MIN_ALBUMS_FOR_SECTION` álbumes alcanzan `MIN_REVIEWS_PER_ALBUM`
  reseñas
- **THEN** `/explore` muestra un riel de más reseñados ordenado por conteo de reseñas

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

