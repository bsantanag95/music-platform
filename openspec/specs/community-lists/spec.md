# community-lists Specification

## Purpose

Superficie pública `/[locale]/lists` para descubrir listas de la comunidad (cambio
`add-community-lists-surface`), accesible con y sin sesión y enlazada desde la barra general
del Header. Compone cuatro secciones —Destacadas (listas editoriales oficiales publicadas; las
colecciones de Explorar se recorren en `/explore/collections`, ADR 0038), Populares (por
conteo agregado de guardados), De usuarios seguidos
(solo con sesión) y Recientes (descubrimiento cronológico de `list-discovery`)— omitiendo
las vacías, sin recomendación algorítmica ni personalización por afinidad. Las listas se presentan en estantería (una
destacada única, como portada), con un riel de contexto ("Tus listas" y "Para completar") en la vitrina (cambio
`redesign-lists-page`).
## Requirements
### Requirement: Superficie pública de listas de la comunidad

El sistema SHALL exponer una vista pública en `/{locale}/lists` para los locales soportados,
accesible **con y sin sesión**, que presenta el descubrimiento de listas de la comunidad. La vista
SHALL tener dos estados de presentación derivados de la URL:

1. **Vitrina** (sin `q`, `type` ni `sort`): SHALL componer, en este orden, Destacadas (si tiene contenido), **Para
   completar** (ver "Sección Para completar") y el **lector** (ver "Lector de listas"), con las pestañas que tengan contenido:
   De usuarios seguidos (solo con sesión), Populares y Recientes. Sin sesión, una banda con la invitación a crear una cuenta SHALL seguir al lector
   (ver "Tus listas y la invitación a crear cuenta"). Una lista que ya se muestra en Destacadas SHALL omitirse en las
   pestañas; entre pestañas una lista SHALL poder repetirse, porque solo se ve una pestaña a la vez.
2. **Explorar** (con al menos uno de `q`, `type` o `sort`): SHALL renderizar el lector con una única lista
   paginada de resultados, sin pestañas, en lugar de la composición de la vitrina, encabezada por un rótulo con el número
   de resultados, el orden aplicado y la acción de limpiar filtros. En este estado SHALL NOT mostrarse Destacadas ni la
   banda; "Para completar" SHALL mostrarse encima del lector según los filtros (ver "Sección Para completar").

Una sección o una pestaña sin contenido SHALL omitirse: la vista se compone solo con las que tienen contenido,
sin huecos ni mensajes de "vacío" por sección. El descubrimiento SHALL ser editorial y por reglas:
SHALL NOT usar recomendación algorítmica ni personalización por afinidad; ninguna sección SHALL
depender de la actividad del lector salvo "De usuarios seguidos", que depende solo de a quién sigue.

Cuando ninguna sección tiene contenido, la vista SHALL mostrar un estado vacío localizado con una acción (crear la primera
lista con sesión; iniciar sesión para crearla sin ella) y SHALL NOT devolver un error ni redirigir.

Las etiquetas de interfaz SHALL respetar el locale activo; los títulos de listas, nombres de
usuarios y datos de catálogo SHALL conservarse sin traducir, salvo los títulos de las colecciones generadas, que SHALL
mostrarse en el idioma activo.

#### Scenario: Visita pública

- **WHEN** una persona con o sin sesión abre `/es/lists` o `/en/lists` sin parámetros de filtro
- **THEN** ve Destacadas y el lector con las pestañas que tienen contenido, con las etiquetas de
  interfaz en el locale activo

#### Scenario: Sección sin contenido se omite

- **WHEN** una sección o una pestaña del lector no tiene listas que mostrar
- **THEN** no se renderiza y la vista se compone solo con las demás

#### Scenario: Sin recomendación personalizada

- **WHEN** dos personas distintas con sesión abren `/lists` sin parámetros de filtro
- **THEN** Destacadas y las pestañas Populares, Recientes y Para completar muestran la misma composición
  para ambas; solo la pestaña "De usuarios seguidos" y la línea "Tus listas" difieren según cada una

#### Scenario: Superficie completamente vacía

- **WHEN** una persona abre `/lists` en una instancia sin ninguna lista pública
- **THEN** ve un estado vacío localizado con una acción para crear la primera lista (o iniciar sesión para crearla), y
  no un error ni una redirección

#### Scenario: Estado explorar reemplaza la composición

- **WHEN** una persona abre `/lists` con al menos uno de `q`, `type` o `sort`
- **THEN** ve una única lista de resultados en el lector, con su rótulo ("12 listas · Más guardadas"), sin pestañas, sin
  Destacadas y sin la banda

#### Scenario: Limpiar filtros vuelve a la vitrina

- **WHEN** una persona en estado explorar activa "Limpiar filtros"
- **THEN** navega a `/lists` sin parámetros y recupera Destacadas y el lector con sus pestañas

#### Scenario: Una lista en una sola sección

- **WHEN** una lista destacada es también popular y reciente
- **THEN** aparece solo en Destacadas y no se repite en las pestañas "Populares" ni "Recientes"

#### Scenario: Orden con sesión

- **WHEN** una persona con sesión que sigue a otras abre `/lists`
- **THEN** la pestaña "De usuarios seguidos" va antes que "Populares" y es la que está abierta al cargar

### Requirement: Sección "Destacadas"

La vista `/lists` SHALL mostrar como primera sección las listas editoriales oficiales publicadas,
sin filtrar por tipo de entidad y sin duplicados. Las colecciones de Explorar SHALL NOT aparecer en esta sección,
ni las generadas por plantilla (`source='template'`) ni las curadas con fila en `user_list_featured`
(`source='curated'`): una colección es contenido de la plataforma y se recorre en Explorar, no entre las listas de la
comunidad. La sección SHALL ofrecer en su lugar un enlace a la página de colecciones (`/explore/collections`).
Una lista editorial oficial SHALL ser una lista de la cuenta curadora de `/explore`
(`@exploracion`), de audiencia `public`, `moderation_status = visible` y no retirada
(`official_withdrawn_at IS NULL`), y las oficiales SHALL ordenarse de la más recientemente publicada a la más
antigua. Cada entrada SHALL presentar título, dueño (con enlace al
perfil), tipo de entidad, conteo de ítems y carátulas disponibles, y SHALL enlazar al detalle de esa
lista; las oficiales SHALL distinguirse con la insignia de contenido oficial. Una lista sin ítems
SHALL NOT aparecer en la sección (sigue visible en su perfil y por enlace directo). La
sección SHALL mostrarse siempre que exista al menos una lista oficial con ítems y SHALL
NOT paginar.

#### Scenario: Con listas destacadas

- **WHEN** existen listas editoriales oficiales publicadas con ítems
- **THEN** `/lists` las muestra como primera sección, de la más reciente a la más antigua, cada una
  enlazando a su detalle, junto al enlace a la página de colecciones

#### Scenario: Editorial oficial dentro de Destacadas

- **WHEN** existe una lista editorial oficial publicada
- **THEN** aparece en la sección "Destacadas" con la insignia de contenido oficial

#### Scenario: Sin listas destacadas ni oficiales

- **WHEN** no hay listas editoriales oficiales publicadas con ítems
- **THEN** la sección "Destacadas" no aparece en `/lists`

#### Scenario: Lista vacía no se destaca

- **WHEN** una lista editorial oficial no tiene ítems
- **THEN** no aparece en "Destacadas"; si ninguna tiene ítems, la sección no aparece

#### Scenario: Oficial retirada no se destaca

- **WHEN** una lista editorial oficial fue retirada por un administrador
- **THEN** no aparece en "Destacadas"

#### Scenario: Colecciones automáticas fuera

- **WHEN** existe una colección generada por plantilla con fila vigente en `user_list_featured`
- **THEN** no aparece en la sección "Destacadas" de `/lists` (sí en `/explore` y en `/explore/collections`)

#### Scenario: Colecciones curadas fuera

- **WHEN** una lista oficial está destacada en Explorar con `source='curated'`
- **THEN** su tarjeta no aparece en "Destacadas" por estar destacada; si está publicada como oficial aparece por eso,
  y el orden no depende de su `rank`

#### Scenario: Enlace a las colecciones

- **WHEN** se muestra la sección "Destacadas" de `/lists`
- **THEN** su encabezado ofrece un enlace a `/explore/collections` para recorrer las colecciones de la plataforma

### Requirement: Sección "Populares"

La vista `/lists` SHALL mostrar una pestaña "Populares" en el lector con listas de audiencia `public` de
perfiles `public`, ordenadas por conteo agregado de guardados descendente y, a igualdad de
conteo, por fecha de creación descendente. La pestaña SHALL listar solo listas con al menos
un guardado. Cada entrada SHALL mostrar el conteo de guardados junto a los demás datos de la
fila, sin número de posición ni distintivo de "top". La pestaña SHALL NOT incluir las colecciones generadas por plantilla de la plataforma (se recorren en
Explorar). La pestaña SHALL excluir bloqueos en
cualquier dirección y, con sesión, las listas del propio lector. La pestaña SHALL ser
accesible sin sesión y SHALL poder paginarse.

#### Scenario: Listas ordenadas por guardados

- **WHEN** una persona abre `/lists` y hay listas públicas con guardados
- **THEN** la pestaña "Populares" las muestra de más a menos guardadas, cada fila con su
  conteo de guardados

#### Scenario: Sin guardados en la comunidad

- **WHEN** ninguna lista pública tiene guardados
- **THEN** la pestaña "Populares" no aparece

#### Scenario: Exclusión por bloqueo en "Populares"

- **WHEN** existe un bloqueo en cualquier dirección entre el lector y el dueño de una lista
  popular
- **THEN** esa lista no aparece en "Populares"

### Requirement: Sección "De usuarios seguidos"

La vista `/lists` SHALL mostrar, **solo cuando hay sesión**, una pestaña del lector con listas visibles
para el lector cuyos dueños son usuarios que el lector sigue con relación aceptada, en orden
cronológico descendente por fecha de creación. La pestaña SHALL considerar visibles las
listas de audiencia `public` y `followers` de esos dueños, SHALL excluir bloqueos y perfiles
que dejaron de ser visibles, SHALL excluir las listas del propio lector y SHALL excluir las listas
sin ítems (aparecen cuando tienen el primero; el filtro va en la consulta, así la paginación no
devuelve páginas cortas). Para un lector
anónimo la pestaña SHALL NOT renderizarse, y su API SHALL responder `401` con código
`AUTH_REQUIRED`. La pestaña SHALL poder paginarse.

#### Scenario: Listas de gente que sigo

- **WHEN** un usuario con sesión que sigue a otras personas abre `/lists`
- **THEN** ve una pestaña con las listas recientes visibles de esas personas, de la más
  reciente a la más antigua

#### Scenario: Lista vacía de alguien que sigo

- **WHEN** una persona que sigo crea una lista y todavía no le agrega ítems
- **THEN** la lista no aparece en "De la gente que sigues" hasta que tenga su primer ítem

#### Scenario: Incluye audiencia followers de seguidos

- **WHEN** una persona que el lector sigue tiene una lista de audiencia `followers`
- **THEN** esa lista aparece en la pestaña "De usuarios seguidos" del lector

#### Scenario: Oculta para visitantes anónimos

- **WHEN** una persona sin sesión abre `/lists`
- **THEN** no ve la pestaña "De usuarios seguidos" y la petición directa a su API responde
  `401` con código `AUTH_REQUIRED`

#### Scenario: El lector no sigue a nadie

- **WHEN** un usuario con sesión que no sigue a nadie abre `/lists`
- **THEN** la pestaña "De usuarios seguidos" no aparece

### Requirement: Sección "Recientes"

La vista `/lists` SHALL mostrar como pestaña "Recientes" del lector el descubrimiento cronológico de listas
públicas definido en la capacidad `list-discovery`, accesible con y sin sesión, y SHALL
poder paginarse. SHALL NOT incluir las colecciones generadas por plantilla de la plataforma: son contenido de
Explorar, no lo último que publicó la comunidad. En el modo explorar, una búsqueda por texto (`q`) SHALL seguir
encontrándolas; un cambio de orden o de tipo sin texto SHALL NOT incluirlas.

#### Scenario: Recientes con y sin sesión

- **WHEN** una persona con o sin sesión abre `/lists`
- **THEN** la pestaña "Recientes" muestra listas públicas de la comunidad en orden
  cronológico descendente

#### Scenario: Colecciones generadas fuera de Recientes

- **WHEN** la plataforma generó la colección "Ganadores del Grammy 2025"
- **THEN** no aparece en "Recientes", en "Populares", con `?sort=popular` ni con `?type=release-group`, y sí al buscar
  "Grammy" en `/lists`

### Requirement: Acceso desde la navegación global

El sistema SHALL exponer un enlace a `/lists` en la barra general del Header, junto al
buscador y a Explorar, **con y sin sesión**. El enlace SHALL usar la etiqueta localizada de
"Listas" y SHALL apuntar a la superficie pública `/lists`, no a `/me/lists`. En el panel
móvil del Header el enlace SHALL vivir en el bloque de barra general.

#### Scenario: Enlace visible para cualquiera

- **WHEN** se renderiza el Header, con o sin sesión
- **THEN** la barra general muestra un enlace "Listas" hacia `/lists`

#### Scenario: El enlace no lleva a la gestión personal

- **WHEN** una persona activa el enlace "Listas" del Header
- **THEN** llega a `/lists` y no a `/me/lists`

### Requirement: Toolbar de exploración de listas

La vista `/lists` SHALL mostrar un toolbar de exploración, siempre visible, con búsqueda por texto,
filtro por tipo de entidad (`artist`, `release-group`, `recording`) presentado como un control segmentado (Todas · Álbumes ·
Artistas · Canciones), filtro por tema (un selector "Tema" / "Theme" con "Todos los temas" más los diez temas del vocabulario,
en su orden de presentación) y orden (`popular` o `recent`). Cada segmento, el campo de búsqueda, el selector de tema y el
control de orden SHALL medir al menos 44 px de alto. Desde `lg` los cuatro SHALL ir en una sola fila (búsqueda, segmentos,
tema y orden); por debajo, la búsqueda y el orden SHALL compartir la primera fila, los segmentos SHALL ocupar una fila propia a
todo el ancho, con los cuatro visibles sin desplazar, y el selector de tema SHALL ocupar una fila propia a todo el ancho debajo
de los segmentos. El orden `popular` SHALL etiquetarse "Más guardadas" ("Most saved"), para no
confundirlo con la sección "Populares", que exige un mínimo de guardados. En la vitrina, el control de orden SHALL NOT
mostrar un valor elegido. El estado de los filtros SHALL vivir en la URL (`?q=&type=&theme=&sort=`) para ser enlazable y
sobrevivir a la recarga; un `theme` fuera del vocabulario SHALL ignorarse. El filtro de tema SHALL devolver solo las listas
con ese tema: las listas sin tema SHALL aparecer únicamente sin filtro de tema. La búsqueda por texto SHALL coincidir con el
título y la descripción de la lista. La vista SHALL ofrecer una acción para limpiar los filtros. Con filtros activos, la vista
SHALL mostrar el número de resultados y SHALL aplicar los filtros y el orden en el servidor sobre el
conjunto completo, no solo sobre la página ya cargada. Sin filtros, el toolbar SHALL existir pero
SHALL NOT modificar la composición por secciones. Un conjunto de resultados vacío SHALL mostrar un
estado "sin resultados" localizado, distinto del estado vacío global de la vitrina.

#### Scenario: Filtrar por texto y tipo

- **WHEN** una persona escribe texto y elige el chip de un tipo de entidad
- **THEN** la URL refleja `q` y `type`, el segmento queda marcado y la grilla muestra solo las listas públicas que coinciden

#### Scenario: Filtrar por tema

- **WHEN** una persona elige el tema "Recomendaciones"
- **THEN** la URL refleja `theme=recommendations`, la vista pasa al modo filtrado y muestra solo las listas públicas con ese
  tema, con el número de resultados

#### Scenario: Tema desconocido en la URL

- **WHEN** alguien abre `/lists?theme=recs`
- **THEN** la vista ignora el parámetro y se comporta como sin filtro de tema

#### Scenario: Ordenar los resultados

- **WHEN** una persona elige el orden "Más guardadas"
- **THEN** la URL refleja `sort=popular` y la grilla ordena por conteo agregado de guardados
  descendente, dejando las listas sin guardados al final

#### Scenario: Sin resultados

- **WHEN** los filtros activos no coinciden con ninguna lista pública
- **THEN** la vista muestra un estado "sin resultados" localizado con la opción de limpiar filtros

#### Scenario: Filtros en el servidor

- **WHEN** hay filtros activos y la lista tiene más resultados que una página
- **THEN** paginar mantiene los filtros aplicados y trae resultados coherentes con el conjunto
  completo, no solo con la página ya cargada

#### Scenario: Tipos visibles en el teléfono

- **WHEN** se abre `/lists` a 390 px
- **THEN** los cuatro segmentos de tipo se ven completos en su propia fila, sin desplazamiento horizontal, cada uno de al menos
  44 px de alto, la búsqueda y el orden comparten la fila de arriba y el selector de tema ocupa la fila de abajo

### Requirement: Imágenes y tamaño de las tarjetas de listas

El mosaico de una tarjeta de lista SHALL usar tantas imágenes como tenga la lista, hasta cuatro, sin rellenar huecos con
siluetas de disco ni recortar una imagen fuera del cuadrado: una sola imagen SHALL ocupar la caja, dos SHALL dividirla en
mitades y tres SHALL ocupar tres celdas de una grilla de 2×2, con la cuarta como una celda neutra que muestra los ítems
restantes ("+N") o, si no hay más, el tipo de la lista. Sin ninguna, SHALL mostrarse una única silueta de disco. Las
imágenes SHALL ser la carátula del álbum, la de un álbum representativo de una canción y, en una lista de artistas, la foto
del artista si no fue retirada, recortada en círculo dentro de su celda. La primera de "Destacadas" SHALL
presentarse como exhibidor, con sus carátulas en abanico en lugar del mosaico (ver "Destacadas como exhibidor").

#### Scenario: Lista con dos imágenes

- **WHEN** una lista tiene dos álbumes con carátula
- **THEN** su mosaico muestra las dos carátulas en mitades, sin discos vacíos

#### Scenario: Lista de artistas

- **WHEN** una lista de artistas tiene artistas con foto
- **THEN** su mosaico muestra esas fotos, en círculo

#### Scenario: Una sola destacada

- **WHEN** "Destacadas" tiene una sola lista
- **THEN** se presenta como exhibidor a todo el ancho, con sus carátulas en abanico en lugar del mosaico

#### Scenario: Lista con tres imágenes

- **WHEN** una lista de cinco álbumes tiene carátula solo en tres
- **THEN** su mosaico muestra las tres carátulas cuadradas y una cuarta celda con "+2", sin recortar ninguna

### Requirement: Enlace y título de las colecciones generadas

Una tarjeta de `/lists` que representa una colección generada por plantilla SHALL enlazar directamente a su página en
Explorar (`/explore/collections/…`), sin pasar por la ruta de usuario, y SHALL mostrar el título en el idioma activo. Para
eso, los resúmenes de `GET /api/lists/discover`, `GET /api/lists/popular` y `GET /api/lists/from-following` SHALL
incluir `generated` (plantilla y período, o `null`), como ya lo hacen las listas guardadas.

#### Scenario: Colección encontrada por búsqueda

- **WHEN** una persona busca "Grammy" en `/en/lists` y activa la tarjeta de la colección generada
- **THEN** la tarjeta muestra el título en inglés y lleva directo a `/en/explore/collections/…`, sin redirección

### Requirement: Filas del lector

Las pestañas del lector y la lista del modo explorar SHALL presentar cada lista como una **fila**: el mosaico de la lista
(64 px; 56 px en el teléfono) a la izquierda y, al lado, el título en una línea, el dueño y cuándo se actualizó ("Fran ·
hace 3 meses") y una línea de datos con el tipo y el conteo de elementos ("4 álbumes") y, si tiene, el conteo de guardados
("12 guardadas"). Si la lista tiene tema, la fila SHALL mostrar encima del título el chip del tema y, si tiene "sobre", el
texto "sobre <nombre>" en la misma línea. El conteo de guardados SHALL mostrarse en todas las pestañas y en el modo explorar,
no solo en Populares, porque es lo que distingue dos listas con el mismo título. Con sesión, la fila SHALL ofrecer la acción
Guardar con un área táctil de al menos 44×44px. Las filas SHALL ir en una sola columna, separadas por un filete, y cada
pestaña SHALL ofrecer "Ver más" para cargar la siguiente página. Desde `lg`, activar una fila SHALL abrir esa lista en la
vista previa (ver "Vista previa de la lista elegida"), que SHALL mostrar también el chip del tema y el "sobre"; por debajo de
`lg`, y sin JavaScript en cualquier ancho, la fila SHALL ser un enlace a la lista.

#### Scenario: Carátulas reconocibles

- **WHEN** una persona abre `/lists` en un viewport de 375px
- **THEN** cada fila muestra su mosaico de 56 px junto al título, el dueño y la línea de datos, y tocarla abre la lista

#### Scenario: Tema y "sobre" en la fila

- **WHEN** el lector muestra "Pink Floyd, de a poco", con tema Por dónde empezar y "sobre" Pink Floyd
- **THEN** la fila muestra el chip "Por dónde empezar" y "sobre Pink Floyd" encima del título, y la vista previa repite ambos

#### Scenario: Guardar en táctil

- **WHEN** una persona con sesión toca Guardar en una fila en móvil
- **THEN** el área táctil del botón mide al menos 44×44px

#### Scenario: Dos listas con el mismo título

- **WHEN** Dario y Bea tienen cada uno una lista "Artistas que sigo de cerca"
- **THEN** sus filas se distinguen por el dueño, la fecha y el conteo de guardados, visibles sin abrirlas

#### Scenario: Ver más

- **WHEN** la pestaña "Recientes" tiene más listas que una página
- **THEN** "Ver más" agrega la siguiente página a la misma pestaña sin recargar

### Requirement: Lector de listas

En la vitrina, `/lists` SHALL mostrar el **lector**: una barra de pestañas y, debajo, las filas de la pestaña abierta (ver
"Filas del lector"); desde `lg`, a su derecha, la vista previa de la lista elegida (ver "Vista previa de la lista elegida").
Las pestañas SHALL ser, en este orden y solo las que tienen contenido: "De la gente que sigues" (solo con sesión),
"Populares" y "Recientes". Al cargar SHALL abrirse la primera con contenido. Cambiar de pestaña SHALL NOT
recargar la página y SHALL ser accesible por teclado (`tablist`, flechas). Sin JavaScript SHALL verse la primera pestaña y
los demás contenidos SHALL seguir siendo alcanzables por sus listados (`?sort=popular`, `?sort=recent`). "Para completar" SHALL NOT
ser una pestaña del lector: es una sección propia (ver "Sección Para completar").

#### Scenario: Pestañas sin sesión

- **WHEN** una persona sin sesión abre `/lists` y hay listas recientes, populares y con trackeo
- **THEN** ve las pestañas "Populares" y "Recientes", con "Populares" abierta, y no "De la gente que sigues"; "Para completar" va
  en su propia sección, encima del lector

#### Scenario: Sin guardados

- **WHEN** ninguna lista tiene guardados
- **THEN** no hay pestaña "Populares" y la primera abierta es "Recientes"

#### Scenario: Para completar

- **WHEN** dos listas tienen personas completándolas
- **THEN** no aparecen como pestaña del lector sino en la sección "Para completar", encima de él

#### Scenario: Cambio de pestaña con teclado

- **WHEN** una persona enfoca la pestaña abierta y pulsa la flecha derecha
- **THEN** se abre la siguiente pestaña sin recargar la página

### Requirement: Vista previa de la lista elegida

Desde `lg`, el lector SHALL mostrar a la derecha de las filas una **vista previa** fija al desplazar, con la lista elegida:
su mosaico, el tipo y el conteo de elementos, el título, el dueño ("por <nombre>") y cuándo se actualizó, la descripción
(si tiene), el conteo de guardados, la acción "Abrir la lista" y, con sesión y si la lista no es propia, Guardar; debajo,
los primeros 8 elementos numerados con su carátula, título y artista, y "Ver la lista completa". Al cargar, la vista previa
SHALL mostrar la primera lista de la pestaña abierta, resuelta en el servidor. Al elegir otra fila, sus elementos SHALL
pedirse a `GET /api/users/{username}/lists/{listId}`, la fila elegida SHALL quedar marcada (`aria-current`) y, mientras
llegan, la vista previa SHALL mostrar los datos de la fila y un estado de carga. Si la petición falla o la lista dejó de
estar visible, la vista previa SHALL decirlo y ofrecer abrir la lista. Al cambiar de pestaña, la vista previa SHALL pasar a
la primera lista de la nueva pestaña. Por
debajo de `lg` la vista previa SHALL NOT renderizarse.

#### Scenario: Primera lista resuelta

- **WHEN** una persona abre `/lists` a 1440 px
- **THEN** la vista previa ya muestra la primera lista de la pestaña abierta con sus primeros elementos, sin esperar a un clic

#### Scenario: Elegir otra lista

- **WHEN** una persona hace clic en la fila "Para escuchar completos"
- **THEN** la fila queda marcada, la vista previa muestra su título y su dueño de inmediato y, al llegar, sus primeros elementos
  numerados

#### Scenario: Lista que ya no está

- **WHEN** la lista elegida se volvió privada antes del clic
- **THEN** la vista previa dice que no se pudo cargar y ofrece abrir la lista, sin romper el resto del lector

#### Scenario: Teléfono

- **WHEN** se abre `/lists` a 390 px
- **THEN** no hay vista previa y tocar una fila abre la lista

### Requirement: Tus listas y la invitación a crear cuenta

Con sesión, `/lists` SHALL mostrar bajo la frase de entrada una línea "Tus listas" con la lista propia con actividad más
reciente (mismo criterio que "Retoma una lista" de Inicio), enlazada, y accesos a las listas propias y a las guardadas; sin
listas propias, SHALL invitar a crear la primera. Sin sesión, la vitrina SHALL mostrar después del lector una banda "Arma
tus propias listas" con la acción de crear una cuenta y la de iniciar sesión. Ni una ni otra SHALL ir en una columna lateral.

#### Scenario: Retomar una lista propia

- **WHEN** una persona con sesión que editó una lista hace dos días abre `/lists`
- **THEN** bajo la frase de entrada ve "Tus listas" con esa lista enlazada y accesos a "Mis listas" y "Guardadas"

#### Scenario: Sin listas propias

- **WHEN** una persona con sesión sin listas propias abre `/lists`
- **THEN** la línea "Tus listas" invita a crear la primera y enlaza al formulario de nueva lista

#### Scenario: Visitante sin sesión

- **WHEN** una persona sin sesión abre `/lists`
- **THEN** después del lector ve la banda "Arma tus propias listas" con "Crear cuenta" e "Iniciar sesión", y no "Tus listas"

### Requirement: Destacadas como exhibidor

La primera lista de "Destacadas" SHALL presentarse como **exhibidor** a todo el ancho: hasta cuatro carátulas de la lista
como fundas abiertas en abanico (las fotos de artistas, en círculo), la insignia de contenido oficial en su propia línea sobre
el título, el tipo, el título en grande (hasta dos líneas, sin truncar por la insignia en ningún ancho), el dueño, la
descripción (hasta dos líneas), los **primeros cuatro elementos** numerados con su título y, si tiene, su artista, y las
acciones "Abrir la lista" y, con sesión y si no es propia, Guardar, junto al conteo de elementos y de guardados. Los
elementos SHALL resolverse en el servidor; si no se pueden obtener, el exhibidor SHALL mostrarse sin ellos. Desde la segunda,
las destacadas SHALL presentarse como **exhibidores compactos** (abanico pequeño, título, tipo y conteo) en una fila de hasta
tres columnas desde `md`, una sobre otra por debajo. En el teléfono el abanico SHALL achicarse y mostrar tres elementos, no
cuatro. Sin carátulas, el abanico SHALL mostrar una sola silueta de disco.

#### Scenario: Destacada en móvil

- **WHEN** la única destacada es una lista oficial de título largo y se ve en 375px
- **THEN** la insignia "Oficial" aparece sobre el título y el título se lee completo (en hasta dos líneas)

#### Scenario: Exhibidor de la destacada

- **WHEN** la única destacada es "Playlist de fondo", con cuatro canciones con carátula
- **THEN** se ve a todo el ancho con las cuatro carátulas en abanico, la insignia "Oficial", su descripción, las cuatro
  canciones numeradas con su artista y "Abrir la lista"

#### Scenario: Varias destacadas

- **WHEN** hay tres listas oficiales destacadas
- **THEN** la primera es el exhibidor y las otras dos van debajo como exhibidores compactos, lado a lado desde `md`

#### Scenario: Elementos no disponibles

- **WHEN** no se pueden obtener los elementos de la destacada
- **THEN** el exhibidor se muestra con su abanico, título, descripción y acciones, sin la lista numerada y sin error

### Requirement: Sección Para completar

`/lists` SHALL mostrar "Para completar" como una **sección propia**, con encabezado de página, después de Destacadas y antes
del lector, porque completar una lista es una acción y no otra forma de descubrir listas. El encabezado SHALL explicar en una
frase qué es completar una lista y SHALL ofrecer "Ver todas" hacia `/caminos`. La sección SHALL mostrar hasta 4 de las listas
de `/caminos` con trackeo activo, en el mismo orden, como **tarjetas con acción**: una tira de hasta cuatro carátulas de la
lista, el título, el dueño, cuántas personas la están completando ("1 persona la está completando") y un botón "Completarla"
que lleva a su lectura en `/caminos`. Desde `lg` las tarjetas SHALL ir en una fila de hasta cuatro columnas; por debajo, en
dos columnas y, en el teléfono, en una fila con desplazamiento táctil. Sin ninguna lista con trackeo activo, la sección SHALL
omitirse.

Como estas listas son siempre de álbumes, con filtros activos la sección SHALL mostrarse solo cuando el tipo es "Todas" o
"Álbumes", y con una búsqueda por texto SHALL mostrar solo las que contienen ese texto en el título (sin distinguir mayúsculas);
con el tipo "Artistas" o "Canciones", o si ninguna coincide con la búsqueda, SHALL omitirse.

#### Scenario: Sección propia tras Destacadas

- **WHEN** una persona abre `/lists` sin filtros y hay dos listas con trackeo activo
- **THEN** después de Destacadas ve la sección "Para completar" con dos tarjetas, cada una con sus carátulas, "1 persona la está
  completando" y "Completarla", y el lector viene después

#### Scenario: Filtro de álbumes

- **WHEN** una persona filtra por "Álbumes"
- **THEN** la sección "Para completar" sigue visible encima de los resultados

#### Scenario: Filtro de artistas

- **WHEN** una persona filtra por "Artistas"
- **THEN** la sección "Para completar" no aparece, porque no hay listas de artistas para completar

#### Scenario: Búsqueda por texto

- **WHEN** una persona busca "sabrina" sin elegir tipo
- **THEN** la sección muestra solo las listas para completar cuyo título contiene "sabrina", y se omite si ninguna lo contiene

#### Scenario: Sin trackeo

- **WHEN** ninguna lista tiene trackeo activo
- **THEN** la sección "Para completar" no aparece

