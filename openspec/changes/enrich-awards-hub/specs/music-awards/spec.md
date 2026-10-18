## MODIFIED Requirements

### Requirement: Índice de premios

`/{locale}/awards` SHALL depender de cuántos premios hay cargados. Con **un solo premio** SHALL redirigir a su ceremonia más reciente
(`/{locale}/awards/{premio}/{año}`). Con **varios**, SHALL ser el hub de premios: bajo el título, la cantidad de premios y de
ceremonias cargadas; una tarjeta por premio, de la ceremonia más reciente primero, con el nombre del premio, el año y la edición de su
ceremonia más reciente y su ganador destacado (la tarjeta de la sección "Premios" de Explorar), cada una enlazada a la ceremonia, sin
rótulo ni texto de relleno sobre el título. En el hub, cada tarjeta SHALL sumar el rango de años cargados del premio, la cantidad de
ceremonias, quién vota (si se conoce) y hasta cinco ediciones anteriores como enlaces a sus ceremonias. Las tarjetas SHALL ir en una
sola grilla; la agrupación por tipo de premio (generales, música latina, crítica y jurado, otros) MAY activarse cuando crezca el número
de premios. Sin premios SHALL mostrar un mensaje de que todavía no hay ceremonias cargadas.

#### Scenario: Índice

- **WHEN** hay cargados cinco premios
- **THEN** `/es/awards` muestra cinco tarjetas, una por premio, cada una con su ceremonia más reciente y su ganador de Álbum del año, ordenadas de la ceremonia más reciente a la más antigua

#### Scenario: Tarjeta detallada del hub

- **WHEN** los Brit Awards tienen cargadas las ceremonias de 2021 a 2026
- **THEN** su tarjeta en `/es/awards` dice "2021–2026 · 6 ceremonias · Vota la academia" y enlaza 2025, 2024, 2023, 2022 y 2021 a sus ceremonias

#### Scenario: Un solo premio

- **WHEN** solo están cargados los Grammy, con ceremonias de 2021 a 2026
- **THEN** `/es/awards` redirige a `/es/awards/grammy/2026`

#### Scenario: Sin premios

- **WHEN** no hay ninguna ceremonia cargada
- **THEN** `/es/awards` muestra "Todavía no hay ceremonias cargadas."

## ADDED Requirements

### Requirement: Ganadores recientes en el hub

El hub de premios SHALL mostrar "Ganadores recientes": el ganador destacado (el de la categoría general de álbum con menor orden
curado) de las últimas tres ceremonias de cada premio, de la ceremonia más reciente a la más antigua, como muro de carátulas con
título, artista y premio y año. Cada carátula SHALL enlazar al álbum si está en el catálogo y, si no, a la ceremonia. Una ceremonia sin
ganador destacado SHALL NOT aportar ninguna carátula; sin ninguna, la sección SHALL NOT mostrarse.

#### Scenario: Muro de ganadores

- **WHEN** hay cinco premios con al menos tres ceremonias cada uno
- **THEN** "Ganadores recientes" muestra quince carátulas, empezando por la ceremonia celebrada más recientemente

### Requirement: Los más premiados

El hub de premios SHALL mostrar "Los más premiados": hasta diez artistas con más premios ganados, sumando todos los premios y
ceremonias cargados, con la cantidad de premios y los nombres de los premios en que ganaron. SHALL contar una nominación ganadora en
una categoría que premia al intérprete; SHALL NOT contar las categorías de compositores. El premio SHALL atribuirse al artista nominado
o, si el nominado es un álbum o una grabación, a cada uno de sus artistas principales; un nominado que solo es texto, sin sujeto del
catálogo, SHALL NOT contar. SHALL entrar solo quien tenga al menos dos premios ganados. El orden SHALL ser por premios ganados, luego
por ceremonias distintas, luego por el premio más reciente y luego por nombre. Con menos de tres artistas, la sección SHALL NOT
mostrarse.

#### Scenario: Ranking que cruza premios

- **WHEN** una artista ganó dos premios en los Grammy y uno en los Latin Grammy
- **THEN** figura con "3 premios" y "Premios Grammy · Premios Latin Grammy"

#### Scenario: Categoría de compositores

- **WHEN** una canción gana Canción del año, que premia a sus autores
- **THEN** ese premio no suma al artista de la grabación

#### Scenario: Dúo

- **WHEN** gana un álbum con dos artistas principales
- **THEN** el premio suma a los dos
