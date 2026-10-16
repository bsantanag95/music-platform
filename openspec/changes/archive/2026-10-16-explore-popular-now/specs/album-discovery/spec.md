## MODIFIED Requirements

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

## ADDED Requirements

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
