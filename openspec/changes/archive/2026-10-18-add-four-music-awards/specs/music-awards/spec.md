## MODIFIED Requirements

### Requirement: Premios curados con cobertura explícita

El sistema SHALL modelar premios, ceremonias (por año de ceremonia y número de edición), categorías con una clave
estable por premio y nominaciones. Cada categoría SHALL declarar su nivel (`general`, `album` o `genre`, en ese orden
de presentación), el tipo de sujeto que premia (álbum, grabación o artista) y su nombre en español e inglés. Una
categoría de nivel `genre` SHALL declarar además su campo (pop, dance/electrónica, rock y alternativa, R&B, rap, country, urbano,
tropical, regional mexicano o cantautor, entre los que tienen nombre en español e inglés); las de otros niveles SHALL NOT necesitarlo. Una categoría renombrada, fusionada o dividida SHALL ser una
categoría distinta enlazada a su predecesora. Cada categoría en una ceremonia SHALL declarar su cobertura: `complete`
(todos los nominados) o `winner_only` (solo el ganador). Una nominación SHALL tener siempre un texto visible y, como
mucho, un sujeto del catálogo; una nominación sin sujeto SHALL mostrarse como texto, sin enlace. Una categoría con
cobertura `winner_only` SHALL NOT tener nominaciones no ganadoras.

#### Scenario: Nominado enlazado al catálogo

- **WHEN** la nominación de "Midnights — Taylor Swift" tiene su release-group resuelto
- **THEN** la página de la ceremonia muestra su carátula y enlaza a la ficha del álbum

#### Scenario: Nominado sin resolver

- **WHEN** una nominación no tiene sujeto del catálogo
- **THEN** se muestra con su texto, sin enlace ni carátula, y la ceremonia se publica igual

#### Scenario: Borrar un disco del catálogo

- **WHEN** se borra un release-group al que apuntaba una nominación
- **THEN** la nominación se conserva y vuelve a mostrarse como texto

#### Scenario: Cobertura solo del ganador

- **WHEN** una categoría tiene cobertura `winner_only` en una ceremonia
- **THEN** la página muestra solo el ganador y una nota que dice que de esa categoría solo se registra el ganador

#### Scenario: Nivel de género sin campo

- **WHEN** una categoría de nivel `genre` no declara su campo
- **THEN** la base la rechaza y la carga falla con el archivo y la categoría

#### Scenario: Categoría de álbum por género

- **WHEN** se carga "Mejor álbum de rock"
- **THEN** su nivel es `album` y no necesita campo

#### Scenario: Campo de género latino

- **WHEN** se carga "Mejor canción tropical" del Latin Grammy con el campo `tropical`
- **THEN** la página de la ceremonia la agrupa bajo el encabezado "Tropical", y una prueba falla si falta el nombre del campo en español o en inglés

### Requirement: Página de ceremonia

`/{locale}/awards/{premio}/{año}` SHALL mostrar una ceremonia cerrada, en este orden: la miga de pan (Inicio / Premios / nombre del premio /
año, con "Premios" enlazado a `/awards` y el premio enlazado a `/awards/{premio}`), el título (nombre del premio y año) con el número de edición y la fecha, una fila
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

#### Scenario: Miga de pan con el hub

- **WHEN** una persona abre `/es/awards/lo-nuestro/2025`
- **THEN** la miga dice "Inicio / Premios / Premio Lo Nuestro / 2025", "Premios" enlaza a `/es/awards` y "Premio Lo Nuestro" a `/es/awards/lo-nuestro`

#### Scenario: Ceremonia de un premio de una sola categoría

- **WHEN** una persona abre `/es/awards/mercury-prize/2024`
- **THEN** ve el título, la edición y la fecha, la fila "Año" y una sola categoría destacada (Álbum del año) con el ganador grande y los demás álbumes de la lista, sin navegación "En esta página"

### Requirement: Índice de premios

`/{locale}/awards` SHALL depender de cuántos premios hay cargados. Con **un solo premio** SHALL redirigir a su ceremonia más reciente
(`/{locale}/awards/{premio}/{año}`). Con **varios**, SHALL ser el hub de premios: una tarjeta por premio, de la ceremonia más
reciente primero, con el nombre del premio, el año y la edición de su ceremonia más reciente y su ganador destacado (la tarjeta de la
sección "Premios" de Explorar), cada una enlazada a `/{locale}/awards/{premio}`, sin rótulo ni texto de relleno sobre el título. Sin
premios SHALL mostrar un mensaje de que todavía no hay ceremonias cargadas.

#### Scenario: Índice

- **WHEN** hay cargados cinco premios
- **THEN** `/es/awards` muestra cinco tarjetas, una por premio, cada una con su ceremonia más reciente y su ganador de Álbum del año, ordenadas de la ceremonia más reciente a la más antigua

#### Scenario: Un solo premio

- **WHEN** solo están cargados los Grammy, con ceremonias de 2021 a 2026
- **THEN** `/es/awards` redirige a `/es/awards/grammy/2026`

#### Scenario: Sin premios

- **WHEN** no hay ninguna ceremonia cargada
- **THEN** `/es/awards` muestra "Todavía no hay ceremonias cargadas."

## ADDED Requirements

### Requirement: Premios cubiertos

El sistema SHALL cubrir, con ceremonias ya cerradas, los premios y años siguientes: Grammy (2021–2026), Latin Grammy (2021–2025), Premio
Lo Nuestro (2021–2026), Brit Awards (2021–2026) y Mercury Prize (2021–2025). Las ediciones de 2026 del Latin Grammy y del Mercury Prize
SHALL agregarse cuando se celebren. De cada premio SHALL cubrirse toda categoría con nominados cuyo sujeto sea un álbum, una grabación o un
artista; SHALL NOT cubrirse los reconocimientos honoríficos sin nominados ni las categorías de video, técnicas, de empaque o de otros
sujetos. Cada premio SHALL tener un nombre traducido (español e inglés) para mostrarlo; las categorías y los campos, también.

#### Scenario: Cada premio abre su ceremonia

- **WHEN** una persona abre `/es/awards/latin-grammy/2024`, `/es/awards/lo-nuestro/2026`, `/es/awards/brit-awards/2023` y `/es/awards/mercury-prize/2021`
- **THEN** cada una muestra el nombre del premio, el año, la edición y la fecha de su ceremonia

#### Scenario: Ceremonia que aún no se celebra

- **WHEN** una persona abre `/es/awards/latin-grammy/2026` antes del 12 de noviembre de 2026
- **THEN** ve la página de no encontrado, porque la ceremonia no está cargada

#### Scenario: Reconocimiento honorífico

- **WHEN** un premio entrega un reconocimiento honorífico sin nominados (como un premio a la trayectoria)
- **THEN** no aparece como categoría de la ceremonia

#### Scenario: Premio con una sola categoría

- **WHEN** se carga el Mercury Prize, cuya única categoría es Álbum del año
- **THEN** la ceremonia tiene ese único nivel general y no muestra los niveles por álbum ni por género


### Requirement: Fuente y tipo de votación de la ceremonia

Cada premio SHALL declarar en sus archivos de curaduría cómo se decide (`voting`: la academia, un jurado, el público o un comité y el público
a la vez) y cada ceremonia SHALL guardar la URL de su fuente. La página de la ceremonia SHALL mostrar, bajo el título, una línea con el tipo
de votación del premio y un enlace a la fuente de la ceremonia, que se abre con `rel="noopener noreferrer"` y muestra el sitio de la URL. El
tipo de votación SHALL ser por premio, no por categoría. Si el premio no tiene el dato guardado o la ceremonia no tiene fuente, SHALL omitirse
esa parte de la línea. La carga SHALL escribir ambos datos de forma idempotente y rechazar un `voting` fuera de los cuatro valores.

#### Scenario: Premio decidido por un jurado

- **WHEN** una persona abre `/es/awards/mercury-prize/2024`
- **THEN** bajo el título ve "Lo decide un jurado" y "Fuente: en.wikipedia.org" enlazado a la fuente de esa ceremonia

#### Scenario: Premio con votación mixta

- **WHEN** una persona abre `/es/awards/lo-nuestro/2025`
- **THEN** ve "Votan el público y un comité"

#### Scenario: Datos todavía no cargados

- **WHEN** un premio ya cargado antes de la migración no tiene tipo de votación ni fuente guardados
- **THEN** la cabecera no muestra esa línea y el resto de la página no cambia

#### Scenario: Votación inválida

- **WHEN** un `categories.json` declara `"voting": "fans"`
- **THEN** la validación de los archivos falla y la carga aborta sin escribir
