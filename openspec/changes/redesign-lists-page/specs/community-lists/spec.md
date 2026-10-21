## MODIFIED Requirements

### Requirement: Superficie pública de listas de la comunidad

El sistema SHALL exponer una vista pública en `/{locale}/lists` para los locales soportados,
accesible **con y sin sesión**, que presenta el descubrimiento de listas de la comunidad. La vista
SHALL tener dos estados de presentación derivados de la URL:

1. **Vitrina** (sin `q`, `type` ni `sort`): SHALL componer, en este orden, las secciones que tengan
   contenido: Destacadas, De usuarios seguidos (solo con sesión), Populares y Recientes, junto a un riel de contexto
   (ver "Riel de contexto"). Cada lista SHALL aparecer una sola vez: una lista que ya se muestra en una sección de más
   arriba SHALL omitirse en las de más abajo.
2. **Explorar** (con al menos uno de `q`, `type` o `sort`): SHALL renderizar una única grilla
   paginada de resultados en lugar de la composición por secciones, encabezada por un rótulo con el número de
   resultados, el orden aplicado y la acción de limpiar filtros. En este estado SHALL NOT mostrarse el riel.

Una sección sin contenido SHALL omitirse: la vista se compone solo con las que tienen contenido,
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
- **THEN** ve las secciones de descubrimiento de listas con contenido, con las etiquetas de
  interfaz en el locale activo

#### Scenario: Sección sin contenido se omite

- **WHEN** una sección de la vista no tiene listas que mostrar
- **THEN** esa sección no se renderiza y la vista se compone solo con las demás

#### Scenario: Sin recomendación personalizada

- **WHEN** dos personas distintas con sesión abren `/lists` sin parámetros de filtro
- **THEN** las secciones Destacadas, Populares y Recientes muestran la misma composición
  para ambas; solo "De usuarios seguidos" y el módulo "Tus listas" del riel difieren según cada una

#### Scenario: Superficie completamente vacía

- **WHEN** una persona abre `/lists` en una instancia sin ninguna lista pública
- **THEN** ve un estado vacío localizado con una acción para crear la primera lista (o iniciar sesión para crearla), y
  no un error ni una redirección

#### Scenario: Estado explorar reemplaza la composición

- **WHEN** una persona abre `/lists` con al menos uno de `q`, `type` o `sort`
- **THEN** ve una única grilla de resultados con su rótulo ("12 listas · Más guardadas") y no las secciones Destacadas,
  Populares, De usuarios seguidos ni Recientes, ni el riel

#### Scenario: Limpiar filtros vuelve a la vitrina

- **WHEN** una persona en estado explorar activa "Limpiar filtros"
- **THEN** navega a `/lists` sin parámetros y recupera la composición editorial por secciones

#### Scenario: Una lista en una sola sección

- **WHEN** una lista de alguien que el lector sigue es también popular y reciente
- **THEN** aparece solo en "De usuarios seguidos" y no se repite en "Populares" ni en "Recientes"

#### Scenario: Orden con sesión

- **WHEN** una persona con sesión que sigue a otras abre `/lists`
- **THEN** ve "De usuarios seguidos" antes que "Populares"

### Requirement: Sección "Recientes"

La vista `/lists` SHALL mostrar como última sección el descubrimiento cronológico de listas
públicas definido en la capacidad `list-discovery`, accesible con y sin sesión, y SHALL
poder paginarse. SHALL NOT incluir las colecciones generadas por plantilla de la plataforma: son contenido de
Explorar, no lo último que publicó la comunidad. En el modo explorar, una búsqueda por texto (`q`) SHALL seguir
encontrándolas; un cambio de orden o de tipo sin texto SHALL NOT incluirlas.

#### Scenario: Recientes con y sin sesión

- **WHEN** una persona con o sin sesión abre `/lists`
- **THEN** la sección "Recientes" muestra listas públicas de la comunidad en orden
  cronológico descendente

#### Scenario: Colecciones generadas fuera de Recientes

- **WHEN** la plataforma generó la colección "Ganadores del Grammy 2025"
- **THEN** no aparece en "Recientes", en "Populares", con `?sort=popular` ni con `?type=release-group`, y sí al buscar
  "Grammy" en `/lists`

### Requirement: Toolbar de exploración de listas

La vista `/lists` SHALL mostrar un toolbar de exploración, siempre visible, con búsqueda por texto,
filtro por tipo de entidad (`artist`, `release-group`, `recording`) presentado como chips (Todas · Álbumes · Artistas ·
Canciones) y orden (`popular` o `recent`). El orden `popular` SHALL etiquetarse "Más guardadas" ("Most saved"), para no
confundirlo con la sección "Populares", que exige un mínimo de guardados. En la vitrina, el control de orden SHALL NOT
mostrar un valor elegido. El estado de los filtros SHALL vivir en la URL (`?q=&type=&sort=`) para ser enlazable y
sobrevivir a la recarga. La búsqueda por texto SHALL coincidir con el título y la descripción de la lista. La vista
SHALL ofrecer una acción para limpiar los filtros. Con filtros activos, la vista SHALL
mostrar el número de resultados y SHALL aplicar los filtros y el orden en el servidor sobre el
conjunto completo, no solo sobre la página ya cargada. Sin filtros, el toolbar SHALL existir pero
SHALL NOT modificar la composición por secciones. Un conjunto de resultados vacío SHALL mostrar un
estado "sin resultados" localizado, distinto del estado vacío global de la vitrina.

#### Scenario: Filtrar por texto y tipo

- **WHEN** una persona escribe texto y elige el chip de un tipo de entidad
- **THEN** la URL refleja `q` y `type`, el chip queda marcado y la grilla muestra solo las listas públicas que coinciden

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

### Requirement: Imágenes y tamaño de las tarjetas de listas

El mosaico de una tarjeta de lista SHALL usar tantas imágenes como tenga la lista, hasta cuatro, sin rellenar huecos con
siluetas de disco ni recortar una imagen fuera del cuadrado: una sola imagen SHALL ocupar la caja, dos SHALL dividirla en
mitades y tres SHALL ocupar tres celdas de una grilla de 2×2, con la cuarta como una celda neutra que muestra los ítems
restantes ("+N") o, si no hay más, el tipo de la lista. Sin ninguna, SHALL mostrarse una única silueta de disco. Las
imágenes SHALL ser la carátula del álbum, la de un álbum representativo de una canción y, en una lista de artistas, la foto
del artista si no fue retirada, recortada en círculo dentro de su celda. Cuando "Destacadas" tiene una sola lista, su
tarjeta SHALL ocupar la fila como portada ancha (ver "Destacada única como portada").

#### Scenario: Lista con dos imágenes

- **WHEN** una lista tiene dos álbumes con carátula
- **THEN** su mosaico muestra las dos carátulas en mitades, sin discos vacíos

#### Scenario: Lista de artistas

- **WHEN** una lista de artistas tiene artistas con foto
- **THEN** su mosaico muestra esas fotos, en círculo

#### Scenario: Una sola destacada

- **WHEN** "Destacadas" tiene una sola lista
- **THEN** su tarjeta ocupa todo el ancho como portada, con un mosaico mayor

#### Scenario: Lista con tres imágenes

- **WHEN** una lista de cinco álbumes tiene carátula solo en tres
- **THEN** su mosaico muestra las tres carátulas cuadradas y una cuarta celda con "+2", sin recortar ninguna

## ADDED Requirements

### Requirement: Enlace y título de las colecciones generadas

Una tarjeta de `/lists` que representa una colección generada por plantilla SHALL enlazar directamente a su página en
Explorar (`/explore/collections/…`), sin pasar por la ruta de usuario, y SHALL mostrar el título en el idioma activo. Para
eso, los resúmenes de `GET /api/lists/discover`, `GET /api/lists/popular` y `GET /api/lists/from-following` SHALL
incluir `generated` (plantilla y período, o `null`), como ya lo hacen las listas guardadas.

#### Scenario: Colección encontrada por búsqueda

- **WHEN** una persona busca "Grammy" en `/en/lists` y activa la tarjeta de la colección generada
- **THEN** la tarjeta muestra el título en inglés y lleva directo a `/en/explore/collections/…`, sin redirección

### Requirement: Tarjetas en estantería

Las secciones De usuarios seguidos, Populares y Recientes, y la grilla del modo explorar, SHALL presentar cada lista como
una tarjeta de estantería: el mosaico cuadrado arriba, a todo el ancho de la tarjeta, y debajo el título (hasta dos
líneas), el tipo y el conteo, y el dueño como "por <nombre>". La grilla SHALL tener 2 columnas en móvil y crecer hasta 5
en escritorio. La acción Guardar/Seguir SHALL tener un área táctil de al menos 44×44px.

#### Scenario: Carátulas reconocibles

- **WHEN** una persona abre `/lists` en un viewport de 375px
- **THEN** cada tarjeta muestra su mosaico a todo el ancho de su columna, con cada carátula de al menos 60px de lado

#### Scenario: Guardar en táctil

- **WHEN** una persona con sesión toca Guardar en una tarjeta en móvil
- **THEN** el área táctil del botón mide al menos 44×44px

### Requirement: Destacada única como portada

Cuando "Destacadas" tiene una sola lista, la tarjeta SHALL presentarse como portada ancha: mosaico mayor, título, tipo,
conteo, dueño, una línea con los primeros nombres de la lista (hasta cinco) y la descripción (hasta dos líneas), con la
acción Guardar visible. La insignia de contenido oficial SHALL ir en su propia línea, encima del título, y el
título SHALL NOT truncarse por ella en ningún ancho.

#### Scenario: Destacada en móvil

- **WHEN** la única destacada es una lista oficial de título largo y se ve en 375px
- **THEN** la insignia "Oficial" aparece sobre el título y el título se lee completo (en hasta dos líneas)

### Requirement: Riel de contexto

En la vitrina, `/lists` SHALL mostrar un riel de contexto: desde 1024px a la derecha de las secciones y por debajo de ese
ancho, después de ellas. El riel SHALL contener:

- **"Tus listas"** (solo con sesión): la lista propia con actividad más reciente (mismo criterio que "Retoma una lista" de
  Inicio), con enlace a ella, y accesos a las listas propias y a las guardadas. Sin listas propias, SHALL invitar a crear
  la primera.
- **"Para completar"**: hasta 4 de las listas que muestra `/caminos`, en el mismo orden, con la cantidad de personas que
  las están completando y un enlace "Ver todas" hacia `/caminos`. Sin ninguna lista con trackeo activo, el módulo SHALL NOT
  mostrarse.
- Sin sesión, una invitación a crear una cuenta, en lugar de "Tus listas".

#### Scenario: Retomar una lista propia

- **WHEN** una persona con sesión que editó una lista hace dos días abre `/lists`
- **THEN** el riel muestra esa lista en "Tus listas", con su mosaico y un enlace para abrirla

#### Scenario: Sin listas propias

- **WHEN** una persona con sesión sin listas propias abre `/lists`
- **THEN** "Tus listas" invita a crear la primera y enlaza al formulario de nueva lista

#### Scenario: Visitante sin sesión

- **WHEN** una persona sin sesión abre `/lists`
- **THEN** el riel muestra "Para completar" (si tiene contenido) y una invitación a crear una cuenta, y no "Tus listas"
