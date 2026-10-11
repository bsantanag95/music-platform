## ADDED Requirements

### Requirement: Premios curados con cobertura explícita

El sistema SHALL modelar premios, ceremonias (por año de ceremonia y número de edición), categorías con una clave
estable por premio y nominaciones. Cada categoría SHALL declarar su nivel (`general` o `genre`), el tipo de sujeto
que premia (álbum, grabación o artista) y su nombre en español e inglés. Una categoría renombrada, fusionada o
dividida SHALL ser una categoría distinta enlazada a su predecesora. Cada categoría en una ceremonia SHALL declarar
su cobertura: `complete` (todos los nominados) o `winner_only` (solo el ganador). Una nominación SHALL tener siempre
un texto visible y, como mucho, un sujeto del catálogo; una nominación sin sujeto SHALL mostrarse como texto, sin
enlace. Una categoría con cobertura `winner_only` SHALL NOT tener nominaciones no ganadoras.

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

### Requirement: Curaduría en archivos versionados

Los premios SHALL curarse en archivos JSON versionados en `data/awards/<premio>/`, validados con un esquema que
también corre en las pruebas de CI. La carga SHALL ser idempotente, SHALL abortar sin escribir si algún archivo no
valida (incluidas la coherencia del tipo de sujeto con la categoría, la regla de `winner_only` y la presencia del
disco ancla en categorías de grabación) y SHALL NOT consultar MusicBrainz: los stubs de catálogo que falten se crean
desde la semilla guardada en el archivo. La resolución de MBID SHALL hacerse por un script aparte que solo use el
cliente de MusicBrainz, que resuelva las grabaciones dentro de su disco ancla y que marque como ambiguo cualquier
caso con más de un candidato válido, sin elegir por su cuenta.

#### Scenario: Carga idempotente

- **WHEN** se corre la carga dos veces seguidas sin cambiar los archivos
- **THEN** la segunda corrida no cambia ninguna fila

#### Scenario: Archivo inválido

- **WHEN** un archivo de ceremonia declara un ganador en una categoría de otro tipo de sujeto, o un nominado no
  ganador en una categoría `winner_only`
- **THEN** la carga falla con un mensaje que indica el archivo y la categoría, y no escribe nada

#### Scenario: Grabación con varias versiones

- **WHEN** la búsqueda de una grabación dentro de su disco ancla devuelve dos grabaciones distintas
- **THEN** el nominado queda como ambiguo, con sus candidatos en el reporte, hasta que el curador elige

#### Scenario: Nominado fuera del catálogo

- **WHEN** se carga un nominado resuelto cuyo álbum no existe en la base
- **THEN** se crea su stub de release-group desde la semilla, sin requests a MusicBrainz

### Requirement: Página de ceremonia

`/{locale}/awards/{premio}/{año}` SHALL mostrar una ceremonia cerrada: nombre del premio, año, número de edición y
fecha; enlaces a las demás ceremonias cubiertas del mismo premio; y sus categorías, primero las del campo general y
luego las de género, en el orden curado. En cada categoría el ganador SHALL aparecer primero y destacado, seguido de
los nominados en el orden curado. Los nombres de categoría SHALL mostrarse traducidos al locale activo y los títulos
y nombres de artistas sin traducir. Cada categoría SHALL enlazar a su historia. Un año o premio sin ceremonia
cargada SHALL responder como página no encontrada. La página SHALL NOT hacer requests externos al renderizar.

#### Scenario: Ceremonia cubierta

- **WHEN** una persona abre `/es/awards/grammy/2025`
- **THEN** ve "Premios Grammy 2025", la edición y la fecha, "Álbum del año" con "Cowboy Carter" destacado como
  ganador y los demás nominados después

#### Scenario: Ceremonia inexistente

- **WHEN** una persona abre `/es/awards/grammy/1850`
- **THEN** ve la página de no encontrado

#### Scenario: Nombre traducido

- **WHEN** la misma ceremonia se abre en `/en/awards/grammy/2025`
- **THEN** la categoría se llama "Album of the Year" y el título del álbum no cambia

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

`/{locale}/awards` SHALL listar los premios cubiertos con sus ceremonias cargadas, de la más reciente a la más
antigua, cada una enlazada a su página.

#### Scenario: Índice

- **WHEN** hay cargadas las ceremonias 2021 a 2025 de los Grammy
- **THEN** `/es/awards` muestra "Premios Grammy" con cinco enlaces, de 2025 a 2021

### Requirement: Uso descriptivo de la marca

Las páginas de premios SHALL usar el nombre del premio solo de forma descriptiva y SHALL NOT mostrar logos,
imágenes de trofeos ni lenguaje que sugiera afiliación con la organización que lo entrega.

#### Scenario: Sin logos

- **WHEN** una persona abre cualquier página de premios
- **THEN** las únicas imágenes son carátulas y fotos de artistas del catálogo
