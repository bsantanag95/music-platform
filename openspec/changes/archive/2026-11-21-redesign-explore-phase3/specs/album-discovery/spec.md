## MODIFIED Requirements

### Requirement: Superficie de descubrimiento de álbumes

El sistema SHALL exponer una vista pública en `/{locale}/explore` para los locales
soportados, accesible con y sin sesión, que presenta el descubrimiento de álbumes. La vista
SHALL componer, en este orden, las secciones que tengan contenido:

1. Colecciones
2. Popular ahora
3. Mejor valorados de la comunidad
4. Exploración por género
5. Exploración por década
6. Lanzamientos (Novedades y Próximos lanzamientos)
7. Premios
8. Salón de la Fama

Colecciones SHALL ser **una sola sección**, con un único orden, un único tope y un único enlace "Ver todas" a la
página de colecciones: la vista SHALL NOT separar las colecciones curadas de las generadas por plantilla, porque la
forma en que se mantiene una colección no es información para quien mira. Exploración por década y Exploración por género SHALL ser
**secciones independientes**, cada una con su propia lógica de navegación (abren listados filtrados con parámetros
distintos). Novedades y Próximos lanzamientos SHALL ser **las dos partes de una sola sección Lanzamientos** (ancla
`lanzamientos`), cada parte con su propio listado completo. Las dos secciones de la comunidad (Popular ahora y Mejor valorados)
SHALL ir juntas, una detrás de otra. Premios SHALL mostrar una entrada por premio competitivo, con su ceremonia más reciente y su
ganador destacado **como texto**, enlazada a su página de ceremonia, y un enlace al hub de premios (capacidad `music-awards`). Salón de la Fama SHALL mostrar la última clase cerrada de cada salón de la fama, sin mezclarse con Premios. El descubrimiento SHALL ser editorial y por reglas: SHALL
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
- **THEN** `/explore` muestra, después de Lanzamientos, una fila con una entrada por cada premio, con su ceremonia más reciente y su
  ganador destacado como texto, sin carátula, y un enlace a `/awards`; sin ceremonias, la sección se omite

#### Scenario: Premios de varios premios

- **WHEN** hay cargadas ceremonias de cinco premios, tres de ellas de febrero
- **THEN** la sección muestra cinco entradas, una por premio, de la ceremonia más reciente a la más antigua, y ningún premio queda fuera por haber otros con ceremonias más recientes

#### Scenario: Sección Salón de la Fama

- **WHEN** hay una clase cerrada de un salón de la fama cargada
- **THEN** `/explore` muestra, inmediatamente después de Premios y como última sección, la sección Salón de la Fama con la última
  clase de cada salón y un enlace a todas las clases; sin clases cerradas, la sección se omite

#### Scenario: Premios sin salones de la fama

- **WHEN** hay cargados premios competitivos y un salón de la fama
- **THEN** la sección Premios muestra una entrada por cada premio competitivo y ninguna del salón

#### Scenario: La comunidad antes que la década

- **WHEN** `/explore` muestra Popular ahora, Mejor valorados, Exploración por década y Salón de la Fama
- **THEN** el riel de mejor valorados aparece justo después de Popular ahora y antes de la exploración por década, y Salón de la
  Fama cierra la página

#### Scenario: Lanzamientos en una sola sección

- **WHEN** hay novedades y próximos lanzamientos
- **THEN** `/explore` muestra una sola sección Lanzamientos, después de la exploración por década, con Novedades y Próximos
  lanzamientos como sus dos partes

#### Scenario: Colecciones abre la página

- **WHEN** `/explore` renderiza la sección Colecciones
- **THEN** es la primera sección de la página y encabeza el recorrido, antes de Popular ahora y de la exploración por género

#### Scenario: Popular ahora después de Colecciones

- **WHEN** `/explore` renderiza Colecciones y Popular ahora
- **THEN** Popular ahora es la segunda sección, antes de la exploración por género

### Requirement: Novedades

La vista `/explore` SHALL incluir, como primera parte de la sección **Lanzamientos**, la parte **Novedades** con los release-groups de categoría
`studio` o `single_ep` cuya `first_release_date` (fecha completa, con precisión diaria) caiga
entre hoy menos `NEW_RELEASE_WINDOW_DAYS` días (90) y hoy, inclusive, ordenados por
`first_release_date` descendente y, ante empate, por `id`, acotado a `RAIL_SIZE` álbumes. La parte
SHALL excluir los álbumes sin `first_release_date` (solo año o mes conocidos), los de fecha
posterior a hoy y los sin carátula. La parte SHALL omitirse por completo cuando haya menos de
`MIN_ALBUMS_FOR_SECTION` álbumes elegibles. La sección Lanzamientos SHALL tener la forma del **horario** de Inicio: cada
parte es una lista de filas con columnas fijas —la fecha de lanzamiento (día y mes), la carátula pequeña, el título con su
artista y un estado—, con las primeras 6 filas visibles y el resto detrás de un "Ver N más" nativo que funciona sin JavaScript.
El estado de una novedad SHALL ser "Publicado". Cada parte SHALL ofrecer "Ver todo →" hacia su listado completo. Desde `lg`
las dos partes SHALL ir en dos columnas, Novedades a la izquierda; por debajo, una sobre otra. Cada parte SHALL llevar el
ancla de su nombre (`novedades`, `proximos`) para que los enlaces existentes sigan llegando. El riel de Novedades de la
página de género NO SHALL verse afectado por este requisito.

#### Scenario: Riel de novedades

- **WHEN** hay al menos `MIN_ALBUMS_FOR_SECTION` álbumes de estudio o single/EP con carátula lanzados en los
  últimos 90 días
- **THEN** `/explore` muestra la parte Novedades con los más recientes primero por fecha de lanzamiento, con
  la fecha en cada fila y un enlace "Ver todo →" a `/explore?novedades=1`

#### Scenario: Fuera de la ventana

- **WHEN** un álbum se lanzó hace 120 días
- **THEN** no aparece en la parte Novedades

#### Scenario: Lanzamiento futuro

- **WHEN** un álbum tiene `first_release_date` posterior a hoy
- **THEN** no aparece en la parte Novedades

#### Scenario: Fecha parcial

- **WHEN** un álbum solo tiene `first_release_year` (sin `first_release_date`)
- **THEN** no aparece en la parte Novedades

#### Scenario: Sin carátula

- **WHEN** un álbum reciente no tiene `cover_thumb_url`
- **THEN** no aparece en la parte Novedades

#### Scenario: Pocas novedades

- **WHEN** hay menos de `MIN_ALBUMS_FOR_SECTION` álbumes elegibles en la ventana
- **THEN** `/explore` no renderiza la parte Novedades ni un mensaje de vacío

#### Scenario: Orden dentro del mismo año

- **WHEN** dos álbumes de 2026 se lanzaron el 3 de mayo y el 20 de septiembre
- **THEN** el de septiembre aparece antes, sin importar cuál entró primero al catálogo

### Requirement: Próximos lanzamientos

La vista `/explore` SHALL incluir, como segunda parte de la sección **Lanzamientos** (junto a Novedades), la parte
**Próximos lanzamientos** con los release-groups de categoría `studio` o `single_ep` cuya `first_release_date` (fecha
completa) sea posterior a hoy y no pase de hoy más `UPCOMING_WINDOW_DAYS` días (180), ordenados por
`first_release_date` ascendente y, ante empate, por `id`, acotado a `RAIL_SIZE` álbumes. La parte SHALL excluir
los álbumes sin `first_release_date`, los de fecha igual o anterior a hoy y los sin carátula, SHALL NOT ordenar
por popularidad ni limitar por artista o familia de géneros, y SHALL omitirse por completo cuando haya menos de
`MIN_ALBUMS_FOR_SECTION` álbumes elegibles. Cada fila SHALL mostrar la fecha de lanzamiento (día y mes) y, como
estado, la **cuenta regresiva** ("Hoy", "Mañana", "En 5 días"), resaltada. La parte SHALL ser igual para todas las personas
y SHALL ofrecer "Ver todo →" hacia el listado completo. Sin novedades, Próximos lanzamientos SHALL ocupar sola la sección;
sin ninguna de las dos partes, la sección Lanzamientos SHALL omitirse.

#### Scenario: Riel de próximos lanzamientos

- **WHEN** hay al menos `MIN_ALBUMS_FOR_SECTION` álbumes de estudio o single/EP con carátula que salen en los
  próximos 180 días
- **THEN** `/explore` muestra, junto a Novedades, la parte Próximos lanzamientos con los más cercanos primero, la fecha y la cuenta regresiva en cada fila

#### Scenario: Lo de hoy no es un próximo lanzamiento

- **WHEN** un álbum tiene `first_release_date` igual a hoy
- **THEN** aparece en Novedades y no en Próximos lanzamientos

#### Scenario: Fuera de la ventana

- **WHEN** un álbum sale dentro de 200 días
- **THEN** no aparece en la parte Próximos lanzamientos

#### Scenario: Fecha parcial o sin carátula

- **WHEN** un álbum futuro solo tiene `first_release_year`, o no tiene `cover_thumb_url`
- **THEN** no aparece en la parte Próximos lanzamientos

#### Scenario: Pocos próximos lanzamientos

- **WHEN** hay menos de `MIN_ALBUMS_FOR_SECTION` álbumes elegibles
- **THEN** `/explore` no renderiza esa parte ni un mensaje de vacío

#### Scenario: Sin recorte por artista

- **WHEN** un artista tiene dos lanzamientos futuros dentro de la ventana
- **THEN** ambos pueden aparecer en la parte

#### Scenario: Horario de dos columnas

- **WHEN** hay 12 novedades y 9 próximos lanzamientos y se abre `/explore` a 1440 px
- **THEN** la sección Lanzamientos muestra Novedades a la izquierda y Próximos a la derecha, seis filas en cada una, y "Ver 6 más"
  y "Ver 3 más" despliegan el resto en la misma página, también sin JavaScript

#### Scenario: Cuenta regresiva

- **WHEN** un próximo lanzamiento sale mañana
- **THEN** su fila muestra la fecha y el estado "Mañana"

#### Scenario: Solo próximos

- **WHEN** no hay novedades suficientes y sí próximos lanzamientos
- **THEN** la sección Lanzamientos muestra solo la parte Próximos lanzamientos, a todo el ancho

### Requirement: Navegación rápida de Explorar

La vista `/explore` SHALL mostrar, bajo el título, una fila de enlaces ("En esta página") con un enlace por cada
sección que se renderiza, en el mismo orden de la página, cada uno hacia el ancla de su sección: `colecciones`,
`popular`, `mejor-valorados`, `generos`, `decadas`, `lanzamientos`, `premios` y `salon-de-la-fama`. La fila SHALL NOT
enlazar a una sección omitida y SHALL omitirse por completo cuando se rendericen menos de 4 secciones. La fila SHALL
quedar fija bajo la cabecera global mientras se recorre la portada, sin tapar el título de la sección a la que se salta, y SHALL
marcar como actual (`aria-current`) el enlace de la sección que está a la vista. Sin JavaScript, la fila SHALL seguir funcionando como
enlaces a las anclas, sin sección marcada. En pantallas angostas la fila SHALL desplazarse en horizontal y SHALL mantener visible el
enlace marcado. Las etiquetas SHALL ser cortas y estar en el locale activo.

#### Scenario: Fila con todas las secciones

- **WHEN** `/es/explore` renderiza las 8 secciones
- **THEN** la fila muestra "Colecciones, Popular, Mejor valorados, Géneros, Décadas, Lanzamientos, Premios, Salón de la Fama",
  cada una enlazada a su ancla

#### Scenario: Sección omitida

- **WHEN** Novedades y Próximos lanzamientos no tienen contenido
- **THEN** la sección Lanzamientos no se renderiza, la fila no la incluye y ninguno de sus enlaces apunta a un ancla inexistente

#### Scenario: Lanzamientos con una sola parte

- **WHEN** solo hay próximos lanzamientos
- **THEN** la fila incluye "Lanzamientos" y su enlace lleva a la sección, que muestra solo esa parte

#### Scenario: Pocas secciones

- **WHEN** `/explore` renderiza solo 3 secciones
- **THEN** la fila de navegación rápida no aparece

#### Scenario: Salto a una sección

- **WHEN** una persona activa "Premios" en la fila
- **THEN** la página se desplaza a la sección Premios sin que el encabezado global ni la fila fija tapen su título

#### Scenario: La fila acompaña al bajar

- **WHEN** una persona baja hasta la sección Décadas
- **THEN** la fila sigue visible bajo la cabecera global y el enlace "Décadas" está marcado como actual

#### Scenario: Sin JavaScript

- **WHEN** la portada de Explorar se carga sin JavaScript
- **THEN** la fila muestra los enlaces a las anclas y ninguno aparece marcado

### Requirement: Sección Salón de la Fama de Explorar

La sección Salón de la Fama de `/explore` (ancla `salon-de-la-fama`) SHALL mostrar, bajo un encabezado,
**una tarjeta compacta por salón de la fama** con al menos una clase cerrada: tarjetas horizontales lado a lado (dos columnas desde
`md`, una sobre otra por debajo), cada una con una tira de cuatro carátulas de las incorporaciones de su última clase (primero las que
tienen disco en el catálogo; las canciones, con la carátula de su disco ancla) y, al lado, el nombre del salón y el año de esa clase,
con el fondo teñido por la primera carátula. Cada tarjeta SHALL abrir la clase más reciente del salón en `/hall-of-fame`. La sección SHALL ofrecer un enlace "Ver todos" al índice `/hall-of-fame` y SHALL
omitirse por completo sin clases cerradas. El encabezado SHALL decir "Salón de la Fama" con un solo salón y "Salones de la Fama" con más
de uno, igual que la entrada de la navegación rápida. SHALL NOT mostrar descripciones del sitio de la organización ni su logo, ni listar
las incorporaciones de la clase (eso es de la página de la clase).

#### Scenario: Última clase

- **WHEN** el Grammy Hall of Fame tiene cargadas sus cinco clases (2020, 2021, 2024, 2025 y 2026)
- **THEN** su tarjeta muestra "2026" y cuatro carátulas de las incorporaciones de esa clase, y abre `/es/hall-of-fame/grammy-hall-of-fame/2026`

#### Scenario: Incorporación sin ficha

- **WHEN** una incorporación de la clase no se pudo enlazar al catálogo y hay otras con disco
- **THEN** la tarjeta usa las carátulas de las que sí tienen disco, y la incorporación sin ficha se ve como texto, sin enlace, en la página de la clase

#### Scenario: Una tarjeta por salón

- **WHEN** el Grammy Hall of Fame (clase 2026) y el National Recording Registry (clase 2026) tienen clases cerradas
- **THEN** la sección, inmediatamente después de Premios, muestra el encabezado "Salones de la Fama" y dos tarjetas compactas lado a
  lado, cada una con su nombre, "2026" y una tira de cuatro carátulas

#### Scenario: Un solo salón

- **WHEN** solo el Grammy Hall of Fame tiene clases cerradas
- **THEN** el encabezado y la entrada de la navegación rápida dicen "Salón de la Fama" y la sección muestra una tarjeta

#### Scenario: Abrir la clase

- **WHEN** una persona abre la tarjeta del Registry
- **THEN** llega a `/es/hall-of-fame/national-recording-registry/2026`, con todas las incorporaciones de la clase

#### Scenario: Canción de la clase

- **WHEN** una de las carátulas es de una canción cuyo disco ancla está en el catálogo
- **THEN** la tarjeta muestra la carátula de ese disco

#### Scenario: Ver todos

- **WHEN** una persona abre "Ver todos" de la sección
- **THEN** llega al índice `/es/hall-of-fame`, donde cada salón aparece con su última clase y todas sus clases

#### Scenario: Sin clases

- **WHEN** ningún salón de la fama tiene una clase cerrada cargada
- **THEN** `/explore` no renderiza la sección ni un mensaje de vacío
