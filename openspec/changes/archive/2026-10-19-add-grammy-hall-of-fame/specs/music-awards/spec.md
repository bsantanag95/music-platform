## MODIFIED Requirements

### Requirement: Premios cubiertos

El sistema SHALL cubrir, con ceremonias ya cerradas, los premios y años siguientes: Grammy (2021–2026), Latin Grammy (2021–2025), Premio
Lo Nuestro (2021–2026), Brit Awards (2021–2026) y Mercury Prize (2021–2025). Las ediciones de 2026 del Latin Grammy y del Mercury Prize
SHALL agregarse cuando se celebren. De cada premio SHALL cubrirse toda categoría con nominados cuyo sujeto sea un álbum, una grabación o un
artista; SHALL NOT cubrirse, dentro de un premio competitivo, los reconocimientos honoríficos sin nominados ni las categorías de video, técnicas, de empaque o de otros
sujetos. Los salones de la fama SHALL cubrirse como otro tipo de premio, según el requisito "Salones de la fama". Cada premio SHALL tener un nombre traducido (español e inglés) para mostrarlo; las categorías y los campos, también.

#### Scenario: Cada premio abre su ceremonia

- **WHEN** una persona abre `/es/awards/latin-grammy/2024`, `/es/awards/lo-nuestro/2026`, `/es/awards/brit-awards/2023` y `/es/awards/mercury-prize/2021`
- **THEN** cada una muestra el nombre del premio, el año, la edición y la fecha de su ceremonia

#### Scenario: Ceremonia que aún no se celebra

- **WHEN** una persona abre `/es/awards/latin-grammy/2026` antes del 12 de noviembre de 2026
- **THEN** ve la página de no encontrado, porque la ceremonia no está cargada

#### Scenario: Reconocimiento honorífico

- **WHEN** un premio competitivo entrega un reconocimiento honorífico sin nominados (como un premio a la trayectoria)
- **THEN** no aparece como categoría de la ceremonia

#### Scenario: Premio con una sola categoría

- **WHEN** se carga el Mercury Prize, cuya única categoría es Álbum del año
- **THEN** la ceremonia tiene ese único nivel general y no muestra los niveles por álbum ni por género

## ADDED Requirements

### Requirement: Salones de la fama

El sistema SHALL admitir un segundo tipo de premio, el **salón de la fama** (`award.kind = hall_of_fame`), distinto del premio
competitivo (`competition`, el tipo de todos los premios anteriores). Un salón incorpora cada año una **clase** de grabaciones o
artistas, no entrega ganadores entre nominados. Cada clase SHALL ser una ceremonia del salón, identificada por su año de ingreso y
la fecha de su gala (o, si la fuente no la da, la de su anuncio, que SHALL ser del año de la clase o del anterior);
SHALL NOT tener número de edición, porque las organizaciones no
numeran sus clases. Las incorporaciones SHALL cargarse como nominaciones ganadoras; los nominados que no entraron, si el salón los
publica, SHALL poder cargarse como no ganadores. La carga SHALL exigir número de edición en un premio competitivo y SHALL NOT
exigirlo en un salón, y SHALL NOT aplicar a un salón el mínimo de nominados de las listas completas. La página de la ceremonia de un
salón SHALL presentarse como "Clase de {año}", SHALL rotular "Ingresó" a cada incorporación en vez de "Ganador", SHALL NOT mostrar el
bloque de nominados si no hay nominados que no entraron, y SHALL NOT ofrecer la historia de la categoría. Solo SHALL cubrirse una
clase cerrada, es decir, con su gala ya celebrada.

#### Scenario: Clase de un salón

- **WHEN** una persona abre `/es/awards/grammy-hall-of-fame/2026`
- **THEN** ve "Clase de 2026", la fecha de la clase, las incorporaciones rotuladas "Ingresó", y no ve número de edición, bloque de
  nominados ni enlace a la historia de la categoría

#### Scenario: Sin número de edición

- **WHEN** se carga una clase de un salón sin número de edición
- **THEN** la carga la acepta; si el mismo archivo fuera de un premio competitivo, la carga fallaría indicando que falta la edición

#### Scenario: Clase corta

- **WHEN** una clase trae solo dos canciones en su categoría de canciones
- **THEN** la carga la acepta: el mínimo de nominados de las listas completas no aplica a un salón

#### Scenario: Clase anunciada el año anterior

- **WHEN** la clase de 2021 trae como fecha el 21 de diciembre de 2020
- **THEN** la carga la acepta porque la fecha es del año anterior; con una fecha de 2019 la rechazaría

#### Scenario: Clase aún no celebrada

- **WHEN** la gala de una clase es posterior a hoy
- **THEN** no está cargada y su página responde como no encontrada

### Requirement: Grammy Hall of Fame

El sistema SHALL cubrir el Grammy Hall of Fame con las últimas cinco clases cerradas: 2020, 2021, 2024, 2025 y 2026 (el
salón no tuvo clases en 2022 ni en 2023). Cada clase SHALL tener dos
categorías: Álbumes, cuyo sujeto es el disco, y Canciones, cuyo sujeto es la grabación anclada en su disco; las incorporaciones
SHALL tomarse de los comunicados oficiales de la Recording Academy y contrastarse con una segunda fuente, y cada clase SHALL citar
su fuente. SHALL mostrarse el nombre "Grammy Hall of Fame" de forma descriptiva y SHALL NOT mostrarse logos ni imágenes de la
organización ni copiarse sus descripciones. Un salón SHALL declarar quién decide (`voting`) y SHALL mostrarse como "Lo elige un
comité de la academia".

#### Scenario: Cinco clases

- **WHEN** una persona abre `/es/awards/grammy-hall-of-fame`
- **THEN** llega a la clase de 2026 y ve las otras cuatro como años (2025, 2024, 2021 y 2020), de la más reciente a la más
  antigua, cada uno enlazado a su clase

#### Scenario: Álbumes y canciones

- **WHEN** abre la clase de 2026
- **THEN** ve la categoría Álbumes antes que Canciones, con 11 álbumes y 3 canciones

#### Scenario: Incorporación sin ficha

- **WHEN** una canción no se pudo enlazar al catálogo
- **THEN** se muestra su texto curado sin enlace y la clase se publica igual

### Requirement: Los salones de la fama no cuentan como premios ganados

Una incorporación a un salón de la fama SHALL NOT contarse como premio ganado: SHALL NOT aparecer en las tarjetas de la sección
Premios de Explorar ni en las del hub de premios, en "Ganadores recientes", en "Los más premiados" ni en "Tu relación con los
ganadores recientes", y SHALL NOT sumar a los puntajes que ordenan el catálogo ("Destacados" y la popularidad). Las categorías de
un salón SHALL poder consultarse por su propia página.

#### Scenario: Ranking de más premiados

- **WHEN** una artista ganó un Grammy y tiene dos álbumes en el Grammy Hall of Fame
- **THEN** figura con un premio en "Los más premiados" o no figura si no llega al mínimo; las incorporaciones no suman

#### Scenario: Ganadores recientes

- **WHEN** el Grammy Hall of Fame tiene una clase cargada
- **THEN** "Ganadores recientes" no muestra ninguna carátula de esa clase

#### Scenario: Colección de ganadores

- **WHEN** la clase del Grammy Hall of Fame es la ceremonia cargada más reciente de todas
- **THEN** la colección "Ganadores" sigue armándose con la ceremonia competitiva más reciente y no con la clase del salón

#### Scenario: Orden del catálogo

- **WHEN** un álbum solo tiene incorporaciones a un salón de la fama y ningún premio competitivo
- **THEN** su puntaje de destacados es el mismo que sin ellas

### Requirement: Salones de la fama en el hub

El hub de premios SHALL mostrar, bajo los premios, un bloque "Salones de la fama" con una tarjeta por salón: su nombre, cuántas
clases hay cargadas y la última con cuatro carátulas, enlazada a la página del salón. El bloque SHALL omitirse sin salones. La
presencia de un salón SHALL NOT cambiar la regla de cuántos premios competitivos hacen falta para que `/awards` sea un hub.

#### Scenario: Bloque de salones

- **WHEN** hay cinco premios competitivos y el Grammy Hall of Fame
- **THEN** `/es/awards` muestra las cinco tarjetas de premios y, debajo, "Salones de la fama" con una tarjeta del Grammy Hall of Fame

#### Scenario: Sin salones

- **WHEN** no hay ningún salón cargado
- **THEN** `/es/awards` no muestra el bloque "Salones de la fama"
