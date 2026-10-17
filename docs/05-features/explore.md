# Descubrimiento — `/explore`

Cambio: `add-album-discovery` (Fase 0 de `redefine-content-hierarchy`).

Superficie pública centrada en álbumes que responde *"¿qué obras debería conocer?"*,
separada del feed (*"¿qué hace mi red?"*). En Fase 1 solo álbumes; artistas / canciones /
listas son pestañas futuras.

## Secciones de la portada

Se componen en `src/services/discovery/discovery.ts` (`getExplorePage`), server-render,
sin tabla materializada. Cada sección se **omite** si no tiene contenido. En orden (cambio
`reorder-explore-sections`: agrupadas por intención — entrada, lo que pasa, la comunidad y un cierre de navegación por
época):

| Sección | Fuente | Presentación |
|---|---|---|
| Colecciones | todas las filas de `user_list_featured` vigentes, sin distinguir el origen: las curadas a mano desde `/admin` (ADR 0034) y las generadas por plantillas (ADR 0033 y 0035), por `weight` desc y `rank` asc, máximo 10 (`COLLECTION_RAIL_LIMIT`, ADR 0038) | un solo riel, en fila desplazable con flechas; tarjeta `CollectionRail` (pila de hasta 6 fundas, **familia** sobre el título, título, descripción y número de álbumes) y «Ver todas →» a `/explore/collections`; la tarjeta no dice si la colección se armó a mano o por plantilla |
| Popular ahora | popularidad de la comunidad por personas distintas (cambio `explore-popular-now`, ADR 0041, `popularity.ts`) | segunda sección, tras Colecciones: pestañas **Álbumes · Artistas · Canciones** (`PopularNow`, `PopularTabs`: `tablist` con flechas, la primera con resultado activa; los tres paneles llegan del servidor, sin JS se ve Álbumes); las tres pestañas con la misma forma de **chart** (`PopularChart`, como los de Spotify, Apple Music o Last.fm): el n.º 1 como pieza grande con su imagen difuminada de fondo, y del 2 en adelante numerados en dos columnas (carátula cuadrada para álbumes y canciones, foto redonda o inicial para artistas; artista y "año · tipo" del disco). Las pestañas son un control segmentado. Hasta 12 álbumes y 10 artistas o canciones. El subtítulo dice la ventana usada por la pestaña activa (este mes / últimos 3 meses / de siempre). Cifra "N personas" solo desde 5 (`POPULARITY_FIGURE_MIN`). Una pestaña sin resultado no aparece; sin ninguna, la sección se omite. Reemplaza al antiguo riel "Más reseñados". Ver "Popular ahora" abajo |
| Explorar por género | familias de géneros con álbumes (vista `release_group_effective_genre`, cambio `add-genre-taxonomy`) | tarjetas **visuales** (cambio `visual-genre-families`): un mosaico a sangre de hasta 4 carátulas de discos de estudio de la familia con el nombre encima sobre un velo (4 → 2×2, 3 → la primera a dos filas, 2 → dos columnas, 1 → una, 0 → tarjeta plana) → `/explore?familia=rock`; **sin número de álbumes ni barra**: el conteo de lo que la base ha guardado crece con cada artista que alguien abre y no dice nada de la familia (incluía sencillos, recopilaciones y discos en vivo), así que solo sirve internamente para omitir las familias vacías. La flecha solo aparece al pasar el mouse; las familias secundarias se despliegan desde una tarjeta "N familias más" dentro de la propia grilla (botón con `aria-expanded`, "Ver menos" para plegar) (`MosaicGrid`, que también usan las décadas). Las carátulas (`family-covers.ts`) se eligen por la señal de las colecciones del día 0 (premio, calendario, valoración de la comunidad cuando existe) con desempate por id; un disco se usa en una sola familia (se atiende primero a la que tiene menos candidatos) salvo el relleno de las que quedarían con menos de dos; se calculan en una sola consulta con ventana y se guardan 6 horas en memoria (la consulta tarda ~1 s en frío); un error no se cachea y la portada pinta tarjetas planas |
| Explorar por década | `first_release_year` agrupado por década; carátulas por la señal de las colecciones (cambio `redesign-explore-decades`) | tarjetas **visuales**, las mismas de los géneros (`MosaicGrid`, `CoverMosaic`): un mosaico de hasta 4 carátulas de discos de estudio de la década con su nombre encima ("Años 90" en español, "1990s" en inglés) → `/explore?decada=1990`, **sin número de álbumes ni barra** (el histograma anterior mostraba lo que la base había guardado, no lo publicado: "2010s = 15.117" parecía decir que fue la mejor década y crecía con cada artista abierto). De la más reciente a la más antigua; desde 1950 (`MOSAIC_FIRST_DECADE`, una decisión de producto y no un umbral de datos, para que una década no cambie de sitio al ingerir discos) son tarjetas de la grilla y las anteriores van tras una tarjeta "Décadas anteriores" que las despliega (sin cifras; una década sin carátulas sale plana). Las carátulas (`decade-covers.ts`) son discos `studio` con carátula elegidos por la señal de las colecciones con desempate por id, en una consulta con ventana y 6 horas de caché en memoria; las décadas son disjuntas, así que no hace falta repartir discos como en las familias. Va justo después de Géneros: los dos ejes del catálogo juntos, antes de los feeds con fecha |
| Novedades | `release_group` studio/single_ep con `first_release_date` completa en los últimos `NEW_RELEASE_WINDOW_DAYS` (90) días hasta hoy, con carátula, por fecha desc | riel horizontal con la fecha ("9 oct") en cada tarjeta y "Ver todo →" a `/explore?novedades=1`; se omite con menos de `MIN_ALBUMS_FOR_SECTION` (6); sin lanzamientos futuros ni fechas parciales (cambios `redefine-explore-new-releases` y `add-explore-new-releases-listing`) |
| Próximos lanzamientos | `release_group` studio/single_ep con `first_release_date` completa posterior a hoy y hasta hoy + `UPCOMING_WINDOW_DAYS` (180), con carátula, por fecha asc (cambio `add-explore-upcoming-releases`) | riel horizontal bajo Novedades, con la fecha ("24 oct") en cada tarjeta y "Ver todo →" a `/explore?proximos=1`; se omite con menos de `MIN_ALBUMS_FOR_SECTION` (6) |
| Premios | ceremonias cargadas desde `data/awards/` (cambio `add-music-awards`, ADR 0032) | una tarjeta por cada una de las últimas 5 ceremonias, con el ganador destacado (Álbum del año en los Grammy: carátula, título y artista; `listRecentCeremonies` lo resuelve en una consulta para todas) → `/awards/<premio>/<año>` y "Ver todos" → `/awards`; se omite sin ceremonias (`AwardsExploreSection`). Ver `awards.md` |
| Mejor valorados | `rating` agregado por álbum | riel horizontal; ver umbrales abajo |

### Navegación rápida

Bajo el título hay una fila de píldoras "En esta página" (`ExploreJumpNav`) con un enlace por cada sección que se
renderiza, en el orden de la página. Las anclas son `colecciones`, `popular`, `generos`, `decadas`, `novedades`, `proximos`, `premios` y
`mejor-valorados` (el `id` del `<section>`, con `scroll-mt-24` para que el encabezado fijo no
tape el título). La página decide qué secciones están visibles con los mismos datos con los que cada una se omite, así que
la fila nunca enlaza a una sección ausente. Se omite con menos de `MIN_SECTIONS_FOR_JUMP_NAV` (4) secciones. Es solo
enlaces (sin JavaScript): no es fija ni resalta la sección activa. En móvil se desplaza en horizontal. Las etiquetas son
cortas (`catalog.explore.jump.*`) y no repiten los títulos de sección.

Cada sección lleva bajo el título una línea que dice qué reúne o con qué regla (la de Mejor valorados
cita `MIN_RATINGS_PER_ALBUM`). Los rieles de álbumes de la portada son **horizontales**
(`AlbumRail` con `layout="scroll"`, `RailScroller`): una fila con `scroll-snap`, flechas desde `sm`
que se apagan en cada extremo, y degradados de borde como capas aparte (una `mask-image` recortaría
el menú "…" de las tarjetas, que en el riel se abre con `positioning="fixed"`). La grilla de dos
filas (`layout="grid"`, el predeterminado) sigue en la página de género y en la Inicio anónima.

Las tarjetas de álbum de Explorar (rieles y listados) llevan bajo el título el **artista principal**
(primer crédito `primary`, `albumArtistNames`: una consulta para todos los álbumes de la página). Los
rieles por reglas muestran sobre la carátula la cifra que ubica al disco ahí: el promedio en Mejor
valorados ("★ 4,3") y, en Popular ahora, las personas ("12 personas", solo desde 5). Próximos lanzamientos (riel y
listado) muestra ahí la cuenta regresiva ("Hoy", "Mañana", "En 5 días"; `daysUntilRelease`, días de calendario UTC
como la fecha de la tarjeta). Los rieles no dibujan
barra de desplazamiento: se avanzan con las flechas o deslizando.

### Novedades y Próximos lanzamientos: rieles y listados completos

Las ventanas de Novedades (`<= hoy`) y Próximos lanzamientos (`> hoy`) no se solapan ni dejan hueco. Ambas
leen `release_group`: el sync del calendario de Inicio (ADR 0029) ya vincula al catálogo lo que muestra, así que
no se lee `release_calendar_entry`. **Qué aporta frente a Inicio**, que es el resumen: ventana de 180 días
(Inicio: 60–90), orden cronológico (Inicio: popularidad), sin tope por artista ni por familia de géneros, fecha
exacta en la tarjeta y un listado completo.

`/explore?novedades=1` lista todo lo que cumple la condición del riel de Novedades (misma ventana de
`NEW_RELEASE_WINDOW_DAYS`, para que riel y listado digan lo mismo), paginado, por fecha descendente, con filtro por
tipo y sin selector de orden ni umbral. Servicio: `listNewAlbums`, con la condición compartida con el riel
(`newReleasesCondition()`). Los dos listados se enlazan con cortes hermanos ("Novedades | Próximos
lanzamientos"), conservando el tipo. **Prioridad de los cortes en la URL:** década > familia > género >
`proximos` > `novedades`.

`/explore?proximos=1` lista todo lo elegible, paginado (`FILTERED_PAGE_SIZE`) y en orden cronológico
(`first_release_date`, `id`), con filtro por tipo (`?tipo=`) y **sin** selector de orden. No aplica el umbral de 6
del riel (con 1 o 2 futuros se muestra) y sin resultados cae al estado vacío. Tiene menor prioridad que década,
familia y género si se combinan en la URL. Servicio: `listUpcomingReleases` (riel) y `listUpcomingAlbums`
(listado), con la condición compartida `upcomingCondition()`.

### Umbrales de los rieles por reglas (`src/services/discovery/constants.ts`)

- **Elegibilidad del álbum** — `MIN_RATINGS_PER_ALBUM` (=3) para Mejor valorados:
  un álbum solo entra en el riel si supera ese conteo. Popular ahora tiene sus propios umbrales (abajo). Evita que un promedio alto con pocas
  señales domine.
- **Visibilidad del riel** — `MIN_ALBUMS_FOR_SECTION` (=6): el riel se muestra solo si hay
  esa cantidad de álbumes elegibles; debajo, se omite por completo.

Ajustar estos valores es editar la constante — no hay migración.

### Popular ahora (cambio `explore-popular-now`, ADR 0041)

Una sola definición de popularidad (`src/services/discovery/popularity.ts`) para tres usos: la sección "Popular ahora", el orden
"Populares" de los listados y la colección automática "Lo más popular del mes".

- **Puntuación**: por objetivo, cada persona aporta la suma de los pesos de los **tipos** de gesto distintos que hizo sobre él,
  con tope 4 (`POPULARITY_PERSON_CAP`); se suma sobre las personas. Pesos (`POPULARITY_WEIGHTS`): favorito 3; reseña 2; seguir al
  artista 2; escucha, valoración, lista y colección 1; pendiente y "en búsqueda" 0,5. Las estrellas no cuentan por su nota.
  Desempate: personas, actividad más reciente, id. La valoración fecha por `updated_at` (cambiar la nota es actividad).
- **Objetivos**: álbumes (gestos con `release_group_id`), canciones (`recording_id`) y artistas (gestos directos más los de sus
  discos, atribuidos al primer crédito del disco).
- **Privacidad**: solo cuentas activas; no cuenta nada con `audience = 'private'` (favoritos, diario, colección, "en búsqueda",
  listas) ni reseñas ocultas.
- **Ventana**: 30 días; si no hay al menos `POPULAR_MIN` (6 álbumes, 5 artistas, 5 canciones) con 2 personas, 90 días; si tampoco,
  desde siempre con 1 persona. Cada tipo elige su escalón y lo informa. Medido en scratch: la escalera completa, 245–344 ms en frío.
- **Caché**: 15 minutos en memoria (`ttl-cache.ts`) para la sección y para el ranking de siempre de los álbumes.
- **Orden "Populares"** de los listados (familia, década, género, pestaña de álbumes de la página de género): posición del disco en
  el ranking de siempre (`allTimeAlbumRanking`, `array_position`) y, para los que no tienen actividad, el orden "Destacados". La
  etiqueta pasó de "Más valorados" a "Populares" / "Popular".

### Tarjetas de álbum

Cada tarjeta (`AlbumCard`) lleva en la esquina de la portada el menú "…" de acciones del disco
(cambio `extend-album-quick-actions`): registrar escucha, Favorito y Pendiente con su estado,
listas, calificar e ir al álbum, más las acciones que solo tenía el menú "···" anterior: "Ver en
listas", "Lo busco" y "Ya la tengo". Las marcas se piden al abrir el menú. La página pasa la
sesión a las tarjetas (antes las trataba a todas como anónimas).

## Listados filtrados

`/explore?decada=<año>`, `/explore?familia=<clave>` o `/explore?genero=<slug>` (prioridad `decada` > `familia` > `genero`).
La **década se refina**: `anio` y `genero` acotan su listado (`?decada=1980&anio=1985&genero=hard-rock`, cambio `redesign-decade-view`) y
una `familia` junto a la década se ignora; familia y género sueltos siguen siendo cortes de uno en uno. La familia lista los álbumes con algún género efectivo de
ella; el género, los de ese género **o un subgénero** (CTE recursiva sobre "subgénero de"). Los
géneros efectivos incluyen los heredados del artista (3 primeros). Una clave o un slug desconocido
muestra el estado vacío; una década mal escrita (`?decada=abc`, `?decada=1995`) también, en lugar
de la pantalla de error. Las décadas válidas van de 1800 a 2100 (el catálogo tiene discos de los
1890s; antes el límite era 1900 y esa columna llevaba a un error). No hay endpoint dedicado.

La vista (`FilteredAlbumList`) tiene miga de pan (Inicio / Explorar / corte) y el título directamente bajo
ella: **sin rótulo de tipo de corte encima** (cambio `redesign-family-view`: la miga ya dice dónde estás y el sistema
de diseño no admite un eyebrow sobre el encabezado). Y:

- **Vista de década** (solo en `?decada=`, cambios `redesign-explore-decades` y `redesign-decade-view`). Cabecera, dos filas de filtros
  rotuladas y los filtros de tipo y orden:
  - **Cabecera**: el título y, desde `sm`, el mosaico 2×2 de la tarjeta de la portada (`listDecadeCovers`, misma selección y misma caché; `CoverMosaic`,
    decorativo, sin cifras). Títulos: "Álbumes de los años 80", "Álbumes de 1985", "Álbumes de hard rock de los años 80" y "…de 1985".
  - **Fila "Año"**: "Toda la década" y un chip por año con al menos un disco ya publicado (`listDecadeYears`; un año con solo
    lanzamientos por salir no tiene chip, aunque `?anio=` con ese año funcione), sin cifras; filtra con `?anio=<año>`. Al final de la fila,
    el menú **«Otras décadas»** (`<details>` cerrado, sin JavaScript; panel flotante desde `md` y en su propia línea en angosto), que
    conserva género, tipo y orden y quita el año. Un `anio` que no sea de la década se ignora; el servicio rechaza un año ajeno con
    `VALIDATION_ERROR`.
  - **Fila "Género"**: "Todos" y hasta 12 chips con los géneros de estilo con más discos de la década (`listDecadeGenres`,
    `decade-genres.ts`), **sin cifras**, con como mucho 3 de una misma familia (`DECADE_GENRES_PER_FAMILY`; sin ese tope, los 12 más
    grandes de los 1990s incluían cinco de Clásica y ninguno de hip hop) y **mostrados por familia** en el orden de la taxonomía (Rock,
    Metal, Pop… Clásica al final; `orderByFamily`) y por tamaño dentro de cada una. Los chips **filtran esta misma lista** con
    `?genero=<slug>` (el género y sus subgéneros dentro de la década, `listAlbumsByGenre` con `decade`): antes enlazaban a la página del
    género y no se sabía que salían de Explorar. Con un género elegido, bajo el título hay «Ir a la página de <género>» a
    `/genre/<slug>?tab=albums&decada=<año>`; un género de la URL fuera de los 12 se agrega al final, marcado. Consulta con ventana,
    ~85 ms en frío en scratch (Rock de los 1980s: ~110 ms) y 6 horas de caché por década.
  - **Combinación**: cada chip conserva el resto de parámetros; "Toda la década" quita el año, "Todos" quita el género, y cambiar de década
    conserva género, tipo y orden y quita el año (comparar épocas dentro de un género). Con un corte vacío, «Quitar filtros» vuelve a la
    década sin refinamientos. La miga de pan tiene un nivel por refinamiento (Explorar / Años 80 / 1985 / hard rock).
  - **Tipos sin discos** (`listDecadeCategories`, `ExploreFilterBar` con `availableCategories`): los chips de tipo que no tienen discos en el
    corte salen deshabilitados, sin enlace; "Todos" y el tipo elegido siguen activos.
  - **Nombre de la década** (`decade-label.ts`): en español "Años 80" (de 1920 a 1990; con cuatro cifras antes de 1920 y desde 2000,
    "Años 1910", "Años 2000", "Años 2020", porque "Años 10" se lee como los 2010), en inglés "1980s". Solo en Explorar: las colecciones, el
    perfil y la página de género conservan "1990s".
- **Géneros de la familia** (solo en `?familia=`): hasta 12 chips con los géneros de estilo más grandes de la familia
  (`listFamilyGenres`, `family-genres.ts`), cada uno hacia su página `/genre/<slug>` con el nombre en el idioma activo y
  **sin cifras**. Es la forma de seguir navegando hacia dentro (subgéneros) y de llegar a la ficha completa; incluye el
  género raíz (`rock` dentro de Rock). La consulta tarda ~0,4 s en frío y se guarda 6 horas en memoria por familia
  (`src/lib/ttl-cache.ts`, el mismo helper de las carátulas de las tarjetas de familia).
- **Cortes hermanos**: las otras familias, para saltar sin volver a la portada (conservan tipo y orden), en un desplegable cerrado
  («Otras familias»; `<details>`, sin JavaScript): veinte chips empujaban el primer disco bajo el pliegue. Las otras décadas son el menú de
  la fila "Año" de la vista de década. El listado por género enlaza en su lugar a la página del género. Los chips de género de la vista
  de familia siguen enlazando a la página del género (queda pendiente unificarlos con los de la década).
- **Tipo y orden** (`ExploreFilterBar`): el tipo es una fila de enlaces (`?tipo=studio|single_ep|
  compilation|live_other`, sin JS) y el orden un `<select>` (`?orden=mejor|populares|recientes|
  antiguos|az`, los mismos valores que la página de género). Contrato de URL en
  `src/services/discovery/explore-params.ts`: lectura tolerante (un valor inválido cae al
  predeterminado), solo se escriben los valores no predeterminados y cambiar tipo u orden vuelve a la
  página 1.
- **Paginación** server-side por `?page=` (anterior / "Página N" / siguiente), que conserva tipo y orden.
- Estado vacío con "Quitar filtros" si hay tipo u orden elegidos, o "Volver a Explorar" si no.

Cada género también tiene su propia página, `/genre/<slug>` (cambios `show-genres` y `redesign-genre-page`, ver
`genres.md`), con pestañas, filtros y orden. Comparte con estos listados la función `listAlbumsFiltered`
(`discovery.ts`): Explorar la llama con el tipo y el orden de la URL (sin ellos, el orden `best`).

### Orden por defecto: «Destacados» (cambio `redesign-family-view`)

El orden `best` ya no es "valoración y luego año" (con 32 discos valorados sobre 47.000, salía por año descendente y
abría con lo último que se ingestó, incluso discos que aún no salen). Ahora, en este orden de prioridad:

1. los lanzamientos con fecha **posterior a hoy** al final (pertenecen a "Próximos");
2. la valoración agregada, si el disco alcanza `MIN_RATINGS_PER_ALBUM`;
3. el premio (ganador antes que nominado, directo o como disco ancla de una grabación);
4. los discos de **estudio** antes que sencillos, recopilaciones y directos;
5. la **carátula ya resuelta**;
6. `first_release_year` descendente, y el id como desempate. **Dentro de una década o un año el año no desempata** (`bestOrderFor({ yearTiebreak: false })`, cambio `redesign-explore-decades`): sin valoraciones ni premios la primera página era entera del último año de la década (1999 en los 1990s); sin él, el id (un uuid) mezcla los años de forma estable. También rige en la pestaña de álbumes de la página de género cuando se filtra por década.

La etiqueta del selector pasó de "Mejor valorados" a **"Destacados" / "Featured"** (`catalog.genres.page.filters.sortBest`,
compartida con la página de género): no ordena solo por valoración. Los rieles "Mejor valorados" de la portada sí siguen
siendo por valoración. El premio se calcula con subconsultas **no correlacionadas** (conjuntos de ids que Postgres evalúa
una vez): la versión correlacionada por fila llevaba el listado de Rock de ~0,3 s a ~1,5 s. Medido en scratch, el listado de
Rock con el orden nuevo tarda ~0,35–0,4 s, igual que ordenar por columnas simples. El filtro por defecto sigue siendo
"Todos" (sin `tipo` = todos); con este orden los discos de estudio ya salen primero. `popular`, `newest`, `oldest` y `az`
no cambian, y `popular` conserva este orden como desempate.

## Flag de lanzamiento

`EXPLORE_ENABLED` (server-side, `src/lib/config/discovery.ts`):

- `EXPLORE_ENABLED=1` fuerza encendido, `=0` fuerza apagado.
- Sin la variable: encendido fuera de producción, **apagado en producción**.
- Apagado: el enlace a `/explore` no aparece en Header/Footer y la ruta redirige a Inicio.

Encender en producción cuando el seed tenga contenido suficiente.

## Contenido semilla

```
ALLOW_SMOKE_ON_REAL_DB=1 npx tsx --env-file=.env scripts/seed-discovery.ts
```

Idempotente. Crea la cuenta `@exploracion` y genera sus colecciones destacadas con las
**mismas plantillas** que `/explore` usa cada semana (ver abajo). Para regenerar solo las
colecciones, con la cuenta ya creada:

```
npx tsx --env-file=.env scripts/sync-explore-collections.ts [--template <clave>]
```

## Colecciones generadas por plantillas

Cambio `automate-explore-collections` ([ADR 0033](../02-architecture/adr/0033-colecciones-destacadas-generadas-por-plantillas.md)).
El riel no depende de un seed manual: plantillas en `src/services/discovery/collections/templates.ts`
producen listas públicas de `@exploracion` (`kind='standard'`, no oficiales), registradas en
`user_list_featured` con `source='template'`.

| Plantilla | Período | Contenido |
|---|---|---|
| `new-releases` | `evergreen` | "Novedades esenciales": studio/single_ep de los últimos `NEW_RELEASE_WINDOW_DAYS`, ordenados por la señal de calidad (popularidad del calendario si no hay comunidad) y desempatados por fecha |
| `grammy-winners` | `<premio>-<año>` | "Ganadores del Grammy {año}": ganadores con álbum (directo o disco ancla) de la última ceremonia cargada; categorías generales primero |
| `genre-spotlight` | semana ISO + familia (`2026-W43-rock`) | "Para entrar a {familia}": una familia de géneros por semana (rota por el orden de la taxonomía); un álbum por era de 5 años, en orden cronológico |
| `anniversaries` | mes (`2026-10`) | "Cumplen años en {mes}": studio con fecha completa que cumple 10 años o más en el mes; primero los múltiplos de 5, del mayor al menor; si no alcanzan, cualquier aniversario ≥ 10 |
| `upcoming` | `evergreen` | "Lo que viene": próximos lanzamientos del calendario enlazados al catálogo, por rango de popularidad, completados con los próximos del catálogo |
| `one-per-decade` | `evergreen` | "Un disco por década": el mejor studio de cada década según la señal de calidad, con carátula |
| `top-rated-quarter` | trimestre (`2026-Q4`) | "Mejor valorados del N.º trimestre de AAAA": valoraciones del trimestre, ≥ `MIN_RATINGS_PER_ALBUM`. Comunidad: se activa sola (peso 10) |
| `popular-month` | mes (`2026-10`) | "Lo más popular de <mes> de AAAA": la popularidad del mes (personas distintas con peso por gesto, ≥ 2 personas; cartela "N personas" solo desde 5). Comunidad: se activa sola (peso 10). Reemplazó a `most-reviewed-month` ("Lo más reseñado"), retirada en `explore-popular-now`: sus colecciones archivadas conservan título (es/en) y familia |

Las seis primeras son el conjunto del **día 0**: no dependen de valoraciones ni reseñas. Las dos de comunidad
siguen registradas, quedan sin colección hasta que haya actividad y, al crearse, pasan por delante dentro del
tope de 6 tarjetas.

- **Refresco semanal bajo demanda, sin cron.** Una visita a la portada de `/explore` programa con
  `after()` la regeneración de las plantillas cuya última corrida exitosa tiene más de
  `COLLECTION_REFRESH_DAYS` (7) días. Una corrida por plantilla a la vez (fila `running` de menos de 15
  minutos en `explore_collection_sync`, tomada bajo `pg_advisory_xact_lock`); un fallo se registra
  `failed`, conserva lo anterior y no detiene a las demás. `scripts/sync-explore-collections.ts` fuerza la
  corrida (primer llenado, o respaldo si el entorno corta tareas posteriores a la respuesta).
- **Reemplazo completo** de ítems, en el orden del selector, sin tocar `user_list` (su trigger de
  `updated_at` generaría eventos de feed). Con menos de `MIN_ALBUMS_FOR_SECTION` álbumes no se crea ni
  se modifica nada.
- **Períodos:** una lista nueva por período; al crearla, la del período anterior de la misma plantilla
  recibe `expires_at` y sale del riel (sigue pública y accesible por su URL).
- **Vigencia del riel:** `starts_at <= now()` y `expires_at` nulo o futuro; orden `weight` desc, `rank` asc,
  `starts_at` desc; tope `FEATURED_RAIL_LIMIT` (6). La sección "Destacadas" de Listas (`/lists`) usa la misma
  vigencia y orden.
- **Fuera de la consola y del feed:** las listas con `source='template'` no aparecen en `/admin` ni son
  actividad de feed (`notGeneratedCollectionCondition()`).

Limpieza: `DELETE FROM app_user WHERE username = 'exploracion';` (cascade).

### Colección y lista: un solo riel (cambio `unify-explore-collections`, ADR 0038)

Reemplaza la presentación del cambio `split-explore-collections` (ADR 0036), que partía el riel en "Selección
editorial" y "Descubre". Esa partición exponía `source`, es decir **cómo se mantiene** una colección, que no es
información para quien mira: las dos son contenido oficial de la plataforma.

El modelo que rige, separado por de quién es la voz:

| | Colección | Lista |
| --- | --- | --- |
| Autor | la plataforma | una persona |
| Vive en | `/explore` y `/explore/collections` | `/lists` y el perfil |
| Se arma | a mano **o** por plantilla, indistinto | a mano |
| Se organiza por | familia | autor y popularidad |

- **Un riel:** `listCollections()` lee las vigentes sin filtrar por `source`, por `weight` desc y `rank` asc, con tope
  `COLLECTION_RAIL_LIMIT` (10). `layout="scroll"` de `CollectionRail` lo pinta como fila desplazable sobre
  `RailScroller` (flechas solo si hay a dónde ir, gesto táctil nativo, respeta el movimiento reducido). La Inicio
  anónima conserva `listFeaturedCollections` con su propio tope.
- **Seis de un vistazo:** en el riel la tarjeta es **densa** (pila de 3 fundas más chica, sin descripción) y mide 5 por
  fila desde `lg` y 6 desde `xl`, como el riel de álbumes; en móvil asoma la siguiente. Con la tarjeta ancha de la
  rejilla solo se veían 3, menos que los dos riles de 6 que este reemplaza, y lo que queda fuera de vista en un riel
  horizontal puede no verse nunca. La descripción completa está en la página de colecciones y en el detalle.
- **Familias** (`collections/families.ts` + columna `user_list_featured.family`, migración `0071`): `ephemeris`,
  `awards`, `releases`, `discovery`, `rankings`. La familia **vive en la fila**, no se deriva de `template_key`: la
  plantilla declara la suya y la generación la escribe; destacar a mano la exige. Así una colección curada tiene
  familia y el archivo conserva la de una plantilla retirada del registro. `community` se renombró a `rankings` para no
  chocar con las listas de la comunidad.
- **Un solo orden:** `rank` es una secuencia única sobre los dos orígenes.
  `PUT /api/admin/editorial/featured/order` recibe solo `listIds` (ya no `group`) con todas las vigentes. Mover el
  orden mueve también las automáticas, y la próxima corrida de una plantilla entra al final; `weight` sigue sirviendo
  para subir una sin reordenar.
- **`/explore/collections`** (cambio `redesign-collections-hub`, [ADR 0040](../02-architecture/adr/0040-pagina-de-colecciones-destacada-filtro-y-resumenes.md)):
  cabecera que explica qué es una colección (con enlace a Listas), barra de **filtro por tipo** (`?familia=`, solo las
  familias con contenido; filtra vigentes y archivo a la vez) y dos bloques. Las **vigentes** (hasta
  `HUB_COLLECTION_LIMIT`, 120): sin filtro, la primera del orden editorial —la misma del riel de `/explore`— como
  **colección destacada** grande (`FeaturedCollection`) y el resto en **una sola rejilla** de cuatro columnas, sin
  agrupar por familia (la dice el sello). Cada tarjeta lleva la **frase de contexto** del presentador de su plantilla
  (`listCollectionSummaries`: un lote de álbumes y un presentador por colección, tope `HUB_SUMMARY_LIMIT`, 24), que sustituye
  a la descripción; una curada o una plantilla sin presentador propio no la lleva. El **archivo** de las automáticas
  vencidas (`expires_at` pasado, lista aún pública y visible): la más reciente primero, 24 por página (`?pagina=`), en
  tarjetas densas y omitido si está vacío. El archivo sigue acotado a las automáticas: vencer es un concepto de plantilla, y
  una colección manual que deja de estar destacada conserva su lista y su URL. **Una colección sin álbumes no se lista** en
  ninguna superficie (la consola la marca `empty`); su detalle por enlace directo sigue abriéndose. Mismo interruptor
  `EXPLORE_ENABLED` que `/explore`.
- **No se fusiona con Listas:** `/lists` → Destacadas conserva solo las **listas editoriales oficiales** publicadas,
  por fecha de publicación, y su encabezado enlaza a `/explore/collections`. Ninguna colección aparece ahí, ni las
  generadas ni las curadas: una colección no es una lista.
- **La ficha vertical (y no la fila de `ListCard`):** una colección es contenido de la plataforma y una lista es de una
  persona; que se vean distintas a primera vista es parte del modelo. La tarjeta de colección es siempre vertical
  (abanico de fundas en un escenario enmarcado, texto abajo, **familia como sello sobre la carátula**, flecha al pasar
  el mouse) y nunca muestra dueño ni insignia «Oficial». La lista es siempre una fila (mosaico 2×2 a la izquierda,
  «por <dueño>»). El **detalle** sigue la misma lógica con `CollectionDetailHeader`: el abanico en grande, el sello de
  familia, el nombre de la plataforma como texto y el conteo de álbumes; sin «por», audiencia ni antigüedad, que son de
  las listas. La pila de fundas vive en `CollectionSleeves.tsx` (tamaños `dense`, `card` y `hero`). La cabecera es una
  **portada** a todo el ancho: la primera carátula difuminada como luz de fondo, el texto a la izquierda (sello de
  familia, título grande, la descripción de la colección o, si no tiene, la de su familia —
  `catalog.explore.collectionFamilyDescriptions`—) y el abanico a la derecha. Los discos se muestran como **muro de carátulas** (`CollectionAlbumGrid`,
  2–4 columnas), no en las filas verticales de una lista, para ver casi todos de entrada. El **número de orden** sobre la
  carátula aparece solo cuando el presentador de la colección lo pide (`rankings`, donde el orden es un ranking); en los
  demás haría creer que el primero «vale más» (en Premios el orden es por categoría).

  **Cómo se explica cada colección (cambio `add-collection-presenters`, ADR 0039).** El detalle no decide su contexto: lo
  decide el **presentador** de la plantilla (`services/discovery/collections/presenters/`), con la caída plantilla → familia →
  vacío. Un presentador devuelve `CollectionContext` (resumen de la cabecera, enlace, cartela por disco, grupos y
  numeración) como **datos**: claves de mensaje y parámetros que `renderContext` traduce con
  `catalog.explore.collectionContext`; nada traducido se guarda. Hoy hay presentadores de **Premios** (categoría ganada por
  disco: "Álbum del año · Mejor álbum de country", las generales primero, hasta dos y «+N»; la cabecera dice qué ceremonia es
  y cuándo se entregó y enlaza a su página), de **Novedades esenciales** (resumen con el rango real de los discos mostrados,
  cartela relativa "Hace 5 días · 9 oct" y los discos agrupados por mes) y de las **cinco familias** como respaldo para
  una colección cuya plantilla se retiró (efemérides: aniversario con fecha completa; lanzamientos: fecha; el resto: año).
  Desde `add-remaining-collection-presenters` **toda plantilla tiene presentador propio**: **Lo que viene** (rango real,
  cuenta regresiva "Sale en 9 días · 24 oct" y meses del más cercano al más lejano), **Cumplen años en …** (mes y rango de
  años, y la edad según el **año del período**, no el de hoy: una colección archivada dice la edad que tenía entonces),
  **Para entrar a …** (la regla "un disco por cada era de 5 años de {género}" y "Era 1990–1994 · 1992" por disco), **Un
  disco por década** (la regla y "Década de 1990 · 1994") y los dos rankings de la comunidad, que dicen la cifra del
  **período del propio ranking** ("★ 4,5 · 12 valoraciones" del trimestre, "12 reseñas" visibles del mes) y numeran los
  discos (`ranking-stats.ts`, una consulta por dato y por lote). Un período ilegible o una familia de géneros desconocida
  hacen que el presentador se abstenga y caiga al de la familia. Para dar contexto a otra colección se
  escribe su presentador, sus textos y una línea en `TEMPLATE_PRESENTERS`; la página no cambia. Un presentador no puede
  elegir ni ordenar discos (eso es de `plan()`), y sus grupos son una partición: un disco sin grupo cae a un último grupo
  sin encabezado. Los datos salen de una consulta por lote (`albumReleaseDates`, `ceremonyContext`), no una por disco.
- **Consola:** la distinción entre lo manual y lo automático vive en las **pestañas** ("Destacadas en Explorar" y
  "Generadas automáticamente"), no en dos grupos. El panel de destacadas es una sola lista en el orden del riel, con el
  origen y la familia como rótulos por fila —eso es lo que dice qué sobreescribirá la próxima corrida— y «dentro del
  tope» se evalúa contra el tope único. Destacar a mano pide la familia.

### Títulos y rutas por idioma (cambio `localize-collection-titles`, ADR 0037)

El título de una colección **generada** no se guarda traducido: se deriva al leer de su plantilla y su período con un
catálogo es/en (`collections/titles.ts`). "Novedades esenciales" es "Essential new releases" en inglés;
"Cumplen años en octubre de 2026" es "Anniversaries in October 2026" (los períodos llevan año). `user_list.title` sigue en
español como título canónico y respaldo; una plantilla desconocida o un período ilegible muestran ese título.

- **Detalle:** `/explore/collections/<slug>-<id>`, con el slug del título del idioma activo y sin la cuenta curadora en la
  URL. Resuelve por id, canonicaliza con 308 y responde 404 si la lista no es una colección generada pública y visible.
  Muestra a la plataforma como dueño ("Exploración" / "Explore") sin enlace a un perfil; guardar y seguir funcionan igual.
- **Ruta antigua:** `/users/exploracion/lists/<slug>-<id>` responde 308 a la nueva cuando la lista es una colección
  generada. Las demás listas no cambian.
- **Dónde se aplica:** tarjetas del rail y de la página de colecciones, archivo, consola (paneles de destacadas y de
  generadas), listas guardadas y en seguimiento. La pestaña de listas del perfil de `@exploracion` deja de listar las
  generadas.
- **Selección editorial:** conserva el título con que se escribió y su ruta de lista. Traducirla (título y descripción por
  idioma) es un cambio aparte.

### Colecciones del día 0 (cambio `add-day-zero-collections`, ADR 0035)

- **Carátulas garantizadas.** Cada plantilla propone candidatos con holgura (`CANDIDATE_POOL`); el generador los
  recorre en orden, resuelve las carátulas pendientes contra Cover Art Archive (sin la cola de MusicBrainz, 4 en
  paralelo, presupuesto `COVER_RESOLVE_BUDGET` por corrida) y se queda con los que la tienen, hasta
  `COLLECTION_SIZE`. Lo resuelto queda guardado: una corrida que agota el presupuesto deja trabajo hecho.
- **Señal de calidad** (`collections/signal.ts`) para ordenar cuando la comunidad aún no opina: promedio de
  valoraciones (con `MIN_RATINGS_PER_ALBUM`) → ganador antes que nominado a un premio → rango de popularidad del
  calendario → carátula resuelta → id. Con comunidad, esta domina y las colecciones mejoran solas.
- **Rank de las seis:** `new-releases` 1, `grammy-winners` 2, `genre-spotlight` 3, `anniversaries` 4,
  `upcoming` 5, `one-per-decade` 6. Una lista de período nuevo hereda peso y rank de la anterior de su plantilla.

#### Puesta en marcha (día 0)

Orden, contra la BD de producción (cada paso es idempotente):

1. `pnpm run db:migrate` (incluye `0069` y `0070`).
2. Taxonomía de géneros cargada (`genre-spotlight` la necesita).
3. `scripts/load-awards.ts` (`grammy-winners`).
4. `scripts/sync-release-calendar.ts` (`upcoming` y la popularidad de `new-releases`).
5. `scripts/seed-discovery.ts` (crea la cuenta `@exploracion`; también genera las colecciones).
6. **Comprobación previa, sin escribir:** `npx tsx --env-file=.env scripts/sync-explore-collections.ts --dry-run`.
   Imprime, por plantilla, período, título, candidatos, cuántos tienen carátula y, si no llega a 6, el motivo
   (sin premios cargados, calendario vacío, sin carátulas…). Las seis del día 0 deben salir con ✓.
7. `npx tsx --env-file=.env scripts/sync-explore-collections.ts` para generarlas; después, cada semana, `/explore`
   las refresca solo.

Verificado en scratch con datos reales: las seis del día 0 llegan al mínimo (la primera corrida tarda ~70 s por
las peticiones de carátulas; las siguientes, menos, porque lo resuelto ya está guardado). `top-rated-quarter` y
`most-reviewed-month` no llegan sin comunidad, como se espera.

### Administración editorial

La superficie `/[locale]/admin` (permiso `editorial.author` para entrar) opera **solo** sobre las listas de
`@exploracion`: lista las colecciones de la cuenta curadora y permite publicarlas como contenido
oficial (`is_official`) o retirarlas (`official_withdrawn_at`). Las listas de otros usuarios no
aparecen en esa consola y rechazan la publicación oficial. La "destacada" del riel editorial
(`user_list_featured`) es independiente de la marca oficial: una lista oficial no se destaca sola.

Desde el cambio `manage-explore-featured-console` ([ADR 0034](../02-architecture/adr/0034-consola-editorial-de-destacadas.md))
la consola tiene tres pestañas:

- **Listas:** el flujo borrador → propuesta → publicada → retirada de siempre.
- **Destacadas en Explorar:** todas las filas de `user_list_featured` (curadas y generadas), con su origen,
  vigencia y estado frente al riel (`En el riel`, `Fuera del tope`, `Programada`, `Vencida`, `Fuera del riel:
  lista retirada / oculta / no pública`). Quien tiene `editorial.publish` puede **destacar** una lista oficial
  publicada, **reordenar** (botones subir/bajar; el orden completo se envía de una vez), **programar** la
  vigencia (`desde`/`hasta`) y **quitar**. Quien solo tiene `editorial.author` la ve en lectura.
- **Generadas automáticamente:** por plantilla, estado (activa/pausada), última corrida y su error, cuándo
  vuelve a regenerarse y su colección vigente. Si no la hay, el panel dice por qué: pausada, aún sin generar, o "Solo N álbumes
cumplen la regla (mínimo 6)" cuando la plantilla no alcanza el mínimo (habitual con poca actividad de la comunidad). `editorial.publish` permite **pausar** (la colección sale del
  riel y no se regenera), **reanudar** (vuelve la de su período vigente) y **regenerar ahora** (en segundo plano).

Reglas que impone el servicio, no la UI: solo se destaca una lista de `@exploracion`, de álbumes, pública,
visible, oficial y no retirada (`FEATURE_NOT_ELIGIBLE` / `FEATURE_NOT_PUBLISHED`). Una curada cuya lista se
retira, se oculta o deja de ser pública sale del riel sin perder su fila (vuelve al republicarla). Quitar una
**curada** borra su fila; quitar una **generada** la vence (para que no vuelva, se pausa la plantilla). Al
rotar el período, la lista nueva de una plantilla **hereda el peso y el rank** de la anterior, así el orden
editorial sobrevive. Cada destacar / quitar / reordenar / reprogramar queda en `editorial_action`.

## No incluido en Fase 1

Feed de reseñas, personalización/afinidad, pestañas no-álbum, UI de administración de
curaduría, combinación de cortes (década + familia a la vez), "seguir artista".
