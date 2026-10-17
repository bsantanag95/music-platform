## MODIFIED Requirements

### Requirement: Página de ceremonia

`/{locale}/awards/{premio}/{año}` SHALL mostrar una ceremonia cerrada, en este orden: la miga de pan (Inicio / nombre del premio /
año, con el premio enlazado a `/awards/{premio}`), el título (nombre del premio y año) con el número de edición y la fecha, una fila
rotulada **Año** con las ceremonias cubiertas del mismo premio (de la más reciente a la más antigua, la actual marcada), una
navegación **En esta página** y las categorías en tres niveles, en este orden: campo general, por álbum y por género, cada uno con su
título. La navegación interna SHALL tener un enlace por cada nivel con categorías que no sea el de género y uno por cada campo del
nivel por género, cada uno hacia su ancla, y SHALL omitirse con menos de 4 enlaces. Dentro del nivel por género, las categorías SHALL
agruparse por campo, con un encabezado por campo (con ancla) y sin rótulo en mayúsculas ni color de acento, en el orden curado.
Ninguna página de premios SHALL mostrar un rótulo de tipo de página sobre el título.

Las cuatro primeras categorías del campo general (en el orden curado) SHALL mostrarse como **categorías destacadas**: el ganador
primero y grande (carátula, foto o silueta de al menos 96 px) y todos los nominados visibles. El resto del campo general y los niveles
por álbum y por género SHALL mostrarse como **filas compactas**: el nombre de la categoría con su enlace a la historia, el ganador con
su carátula y los nominados plegados bajo un control "Nominados (N)" cerrado por defecto y que funciona sin JavaScript. Una categoría de
la que solo se registró al ganador SHALL NOT tener control de nominados y SHALL mostrar la nota de cobertura. Los nombres de categoría y
de campo SHALL mostrarse traducidos al locale activo y los títulos y nombres de artistas sin traducir. Un nivel sin categorías en esa
ceremonia SHALL omitirse. Un año o premio sin ceremonia cargada SHALL responder como página no encontrada. La página SHALL NOT hacer
requests externos al renderizar.

Un nominado con el sujeto resuelto en el catálogo (álbum o grabación) SHALL mostrar el título y el artista en dos líneas y enlazar al
sujeto; sin resolver SHALL mostrar el texto curado y su crédito, sin enlace.

#### Scenario: Ceremonia cubierta

- **WHEN** una persona abre `/es/awards/grammy/2025`
- **THEN** ve "Premios Grammy 2025", la edición y la fecha, "Álbum del año" con "Cowboy Carter" destacado como
  ganador y los demás nominados después

#### Scenario: Tres niveles en orden

- **WHEN** una persona abre `/es/awards/grammy/2026`
- **THEN** ve "Campo general" (con Álbum, Grabación y Canción del año, Mejor artista nuevo, Productor del año y
  Compositor del año), después "Por álbum" y por último "Por género" con encabezados por campo (Pop, Dance y
  electrónica, Rock y alternativa, R&B, Rap, Country)

#### Scenario: Ceremonia inexistente

- **WHEN** una persona abre `/es/awards/grammy/1850`
- **THEN** ve la página de no encontrado

#### Scenario: Nombre traducido

- **WHEN** la misma ceremonia se abre en `/en/awards/grammy/2025`
- **THEN** la categoría se llama "Album of the Year", el nivel "By album" y el título del álbum no cambia

#### Scenario: Ceremonia sin interpretaciones por género

- **WHEN** una ceremonia cargada solo tiene categorías generales y de álbum
- **THEN** la página no muestra el nivel "Por género" ni sus campos en la navegación

#### Scenario: Años de la ceremonia

- **WHEN** una persona abre `/es/awards/grammy/2024`
- **THEN** ve una fila "Año" con 2026, 2025, 2024, 2023, 2022 y 2021, con 2024 marcado, y cada año lleva a su ceremonia

#### Scenario: Categorías destacadas

- **WHEN** una persona abre `/es/awards/grammy/2026`
- **THEN** Álbum del año, Grabación del año, Canción del año y Mejor artista nuevo muestran al ganador con una imagen grande y todos sus
  nominados a la vista, mientras Productor del año y Compositor del año aparecen como filas compactas

#### Scenario: Nominados plegados

- **WHEN** una persona baja a "Mejor álbum de rock" en `/es/awards/grammy/2026`
- **THEN** ve el nombre de la categoría, el ganador con su carátula y un control "Nominados (N)" cerrado; al abrirlo ve los demás
  nominados

#### Scenario: Navegación por campo

- **WHEN** activa "Rap" en la navegación "En esta página"
- **THEN** la página se desplaza al campo Rap del nivel por género sin que el encabezado global tape su título

#### Scenario: Navegación omitida

- **WHEN** una ceremonia tiene menos de 4 destinos internos
- **THEN** no se muestra la navegación "En esta página"

#### Scenario: Sin rótulos sobre los títulos

- **WHEN** una persona abre cualquier página de premios
- **THEN** el título va directamente bajo la miga de pan, sin un rótulo como "Ceremonia" o "Actualidad" encima, y los encabezados de campo no
  van en mayúsculas ni en color de acento

#### Scenario: Nominado resuelto en dos líneas

- **WHEN** el nominado a Álbum del año tiene su álbum resuelto en el catálogo
- **THEN** ve el título del álbum en una línea y el artista en otra, y el título enlaza a la página del álbum

#### Scenario: Categoría solo con ganador

- **WHEN** de una categoría solo se registró al ganador
- **THEN** su fila muestra al ganador y la nota de cobertura, sin control de nominados

### Requirement: Índice de premios

`/{locale}/awards` SHALL depender de cuántos premios hay cargados. Con **un solo premio** SHALL redirigir a su ceremonia más reciente
(`/{locale}/awards/{premio}/{año}`). Con **varios**, SHALL listar los premios, cada uno con su nombre y sus ceremonias como chips de año,
de la más reciente a la más antigua, cada uno enlazado a su página, sin rótulo ni texto de relleno sobre el título. Sin premios SHALL
mostrar un mensaje de que todavía no hay ceremonias cargadas.

#### Scenario: Índice

- **WHEN** hay cargados dos premios, uno con las ceremonias 2021 a 2025 y otro con 2023 y 2024
- **THEN** `/es/awards` muestra cada premio con sus años, de 2025 a 2021 y de 2024 a 2023, cada año enlazado a su ceremonia

#### Scenario: Un solo premio

- **WHEN** solo están cargados los Grammy, con ceremonias de 2021 a 2026
- **THEN** `/es/awards` redirige a `/es/awards/grammy/2026`

#### Scenario: Sin premios

- **WHEN** no hay ninguna ceremonia cargada
- **THEN** `/es/awards` muestra "Todavía no hay ceremonias cargadas."

## ADDED Requirements

### Requirement: Página de un premio

`/{locale}/awards/{premio}` SHALL redirigir a la ceremonia más reciente cargada de ese premio. Un premio inexistente o sin
ceremonias SHALL responder como página no encontrada. Las migas de pan de la ceremonia y de la historia de una categoría SHALL enlazar
a esta dirección con el nombre del premio.

#### Scenario: Premio con ceremonias

- **WHEN** una persona abre `/es/awards/grammy`
- **THEN** llega a `/es/awards/grammy/2026`, la ceremonia más reciente

#### Scenario: Premio inexistente

- **WHEN** una persona abre `/es/awards/inexistente`
- **THEN** ve la página de no encontrado

#### Scenario: Miga de pan

- **WHEN** una persona está en `/es/awards/grammy/2024`
- **THEN** la miga dice "Inicio / Premios Grammy / 2024" y "Premios Grammy" enlaza a `/es/awards/grammy`
