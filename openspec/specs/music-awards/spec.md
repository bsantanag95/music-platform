# music-awards Specification

## Purpose
Premios musicales curados (ADR 0032): modelo de premios, ceremonias, categorías y nominaciones con cobertura
explícita, curaduría en archivos versionados con resolución asistida y carga idempotente, y las páginas de ceremonia,
historia de categoría e índice de premios.
## Requirements
### Requirement: Premios curados con cobertura explícita

El sistema SHALL modelar premios, ceremonias (por año de ceremonia y número de edición), categorías con una clave
estable por premio y nominaciones. Cada categoría SHALL declarar su nivel (`general`, `album` o `genre`, en ese orden
de presentación), el tipo de sujeto que premia (álbum, grabación o artista) y su nombre en español e inglés. Una
categoría de nivel `genre` SHALL declarar además su campo (pop, dance/electrónica, rock y alternativa, R&B, rap o
country); las de otros niveles SHALL NOT necesitarlo. Una categoría renombrada, fusionada o dividida SHALL ser una
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

### Requirement: Curaduría en archivos versionados

Los premios SHALL curarse en archivos JSON versionados en `data/awards/<premio>/`, validados con un esquema que
también corre en las pruebas de CI. La carga SHALL ser idempotente, SHALL abortar sin escribir si algún archivo no
valida (incluidas la coherencia del tipo de sujeto con la categoría, la regla de `winner_only`, la presencia del
disco ancla en categorías de grabación y que una categoría `complete` tenga al menos tres nominados) y SHALL NOT
consultar MusicBrainz: los stubs de catálogo que falten se crean desde la semilla guardada en el archivo. La
resolución de MBID SHALL hacerse por un script aparte que solo use el cliente de MusicBrainz, que resuelva las
grabaciones dentro de su disco ancla y que marque como ambiguo cualquier caso con más de un candidato válido, sin
elegir por su cuenta. Cada campo de una categoría de nivel `genre` SHALL tener nombre en español e inglés en los
textos de interfaz; una prueba SHALL fallar si falta alguno.

#### Scenario: Carga idempotente

- **WHEN** se corre la carga dos veces seguidas sin cambiar los archivos
- **THEN** la segunda corrida no cambia ninguna fila

#### Scenario: Archivo inválido

- **WHEN** un archivo de ceremonia declara un ganador en una categoría de otro tipo de sujeto, o un nominado no
  ganador en una categoría `winner_only`
- **THEN** la carga falla con un mensaje que indica el archivo y la categoría, y no escribe nada

#### Scenario: Categoría completa con un solo nominado

- **WHEN** una categoría `complete` trae uno o dos nominados
- **THEN** la validación falla con el archivo y la categoría, y la carga no escribe nada

#### Scenario: Grabación con varias versiones

- **WHEN** la búsqueda de una grabación dentro de su disco ancla devuelve dos grabaciones distintas
- **THEN** el nominado queda como ambiguo, con sus candidatos en el reporte, hasta que el curador elige

#### Scenario: Nominado fuera del catálogo

- **WHEN** se carga un nominado resuelto cuyo álbum no existe en la base
- **THEN** se crea su stub de release-group desde la semilla, sin requests a MusicBrainz

#### Scenario: Campo sin traducción

- **WHEN** `categories.json` usa un campo que no tiene nombre en `es` o en `en`
- **THEN** la prueba de validación falla nombrando el campo

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

### Requirement: Historia de una categoría

`/{locale}/awards/{premio}/categories/{clave}` SHALL listar, de la ceremonia más reciente a la más antigua, el
ganador de la categoría en cada ceremonia cubierta y, cuando la cobertura es completa, sus nominados. SHALL enlazar
a la categoría predecesora y a la sucesora cuando existan. Una clave inexistente SHALL responder como página no
encontrada.

#### Scenario: Historia de Álbum del año

- **WHEN** una persona abre `/es/awards/grammy/categories/album-of-the-year`
- **THEN** ve por año, de 2025 a 2021, el ganador y los nominados de cada ceremonia

#### Scenario: Categoría renombrada

- **WHEN** una categoría tiene una predecesora con otro nombre
- **THEN** la página muestra "Antes llamada …" con un enlace a la historia de la predecesora

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

### Requirement: Uso descriptivo de la marca

Las páginas de premios SHALL usar el nombre del premio solo de forma descriptiva y SHALL NOT mostrar logos,
imágenes de trofeos ni lenguaje que sugiera afiliación con la organización que lo entrega.

#### Scenario: Sin logos

- **WHEN** una persona abre cualquier página de premios
- **THEN** las únicas imágenes son carátulas y fotos de artistas del catálogo

### Requirement: Categorías de persona

Una categoría cuyo sujeto es un artista del catálogo (Mejor artista nuevo, Productor del año, Compositor del año)
SHALL mostrar a cada nominado con su nombre y SHALL enlazar al perfil del artista cuando el nominado está resuelto. Una nominación de persona sin resolver SHALL
mostrarse como texto, sin enlace. Productor y Compositor del año SHALL pertenecer al nivel general. Una categoría
que no existía en una ceremonia (Compositor del año antes de 2023) SHALL estar ausente de esa ceremonia, sin
entrada vacía.

#### Scenario: Productor resuelto

- **WHEN** la nominación de "Cirkut" a Productor del año tiene su artista resuelto
- **THEN** la página de la ceremonia muestra su foto o silueta y enlaza a su perfil de artista

#### Scenario: Productor con nombre ambiguo

- **WHEN** el nombre de un nominado coincide con más de un artista de MusicBrainz y la persona curadora no lo fijó
- **THEN** se muestra su nombre como texto, sin enlace, y la ceremonia se publica igual

#### Scenario: Categoría posterior

- **WHEN** se abre la ceremonia de 2022
- **THEN** no aparece Compositor del año, porque la ceremonia no lo otorgó, y sí aparece Productor del año

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

