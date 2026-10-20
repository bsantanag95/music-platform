## MODIFIED Requirements

### Requirement: Salones de la fama

El sistema SHALL admitir un segundo tipo de premio, el **salón de la fama** (`award.kind = hall_of_fame`), distinto del premio
competitivo (`competition`, el tipo de todos los premios anteriores). Un salón incorpora cada año una **clase** de grabaciones o
artistas, no entrega ganadores entre nominados. Cada clase SHALL ser una ceremonia del salón, identificada por su año de ingreso y
la fecha de su gala (o, si la fuente no la da, la de su anuncio, que SHALL ser del año de la clase o del anterior);
SHALL NOT tener número de edición, porque las organizaciones no
numeran sus clases. Las incorporaciones SHALL cargarse como nominaciones ganadoras; los nominados que no entraron, si el salón los
publica, SHALL poder cargarse como no ganadores. La carga SHALL exigir número de edición en un premio competitivo y SHALL NOT
exigirlo en un salón, y SHALL NOT aplicar a un salón el mínimo de nominados de las listas completas. La página de la ceremonia de un
salón SHALL presentarse como "Clase de {año}" con el nombre del salón como línea normal (sin rótulo sobre el título), SHALL mostrar las
incorporaciones de cada categoría como muro de carátulas (sin carátula, la portada tipográfica) sin rotular cada una, porque en la clase
ingresaron todas, SHALL mostrar el disco de una canción solo si se llama distinto de ella, SHALL ofrecer en la cabecera la cantidad de
incorporaciones de cada categoría enlazada a su sección, SHALL NOT mostrar el bloque de nominados si no hay nominados que no entraron, y
SHALL NOT ofrecer la historia de la categoría. Solo SHALL cubrirse una
clase cerrada, es decir, con su gala ya celebrada.

#### Scenario: Clase de un salón

- **WHEN** una persona abre `/es/hall-of-fame/grammy-hall-of-fame/2026`
- **THEN** ve "Clase de 2026", el nombre del salón, la fecha de la clase y las incorporaciones como carátulas sin rótulo "Ingresó", y no
  ve número de edición, bloque de nominados ni enlace a la historia de la categoría

#### Scenario: Disco con el mismo nombre que la canción

- **WHEN** una canción incorporada aparece en un disco que se llama como ella
- **THEN** su tarjeta no muestra "del disco …"; si el disco se llama distinto, sí

#### Scenario: Desglose por categoría

- **WHEN** la clase 2026 del Registry tiene 10 álbumes, 14 canciones y 1 otra grabación
- **THEN** la cabecera ofrece "Álbumes 10", "Canciones 14" y "Otras grabaciones 1", cada uno enlazado a su sección

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
