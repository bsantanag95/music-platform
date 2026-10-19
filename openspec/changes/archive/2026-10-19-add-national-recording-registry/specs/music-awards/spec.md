## ADDED Requirements

### Requirement: National Recording Registry

El sistema SHALL cubrir el National Recording Registry de la Biblioteca del Congreso de EE. UU. con las últimas cinco clases
cerradas: 2022, 2023, 2024, 2025 y 2026. Cada clase SHALL tener como fecha la de su anuncio (no tiene gala), SHALL citar el
comunicado de la Biblioteca como fuente y SHALL tener tres categorías: Álbumes, cuyo sujeto es el disco; Canciones, cuyo sujeto es la
grabación anclada en su disco o sencillo; y Otras grabaciones (discursos, emisiones de radio, entrevistas, pódcast y sonidos de
campo), que SHALL cargarse siempre como texto, sin enlace al catálogo. La clase SHALL publicarse entera (cobertura completa), también
las entradas que no se puedan enlazar. El salón SHALL declarar `voting = jury` y mostrarse como "Lo elige un comité de selección". SHALL
mostrarse el nombre "Registro Nacional de Grabaciones" (en inglés "National Recording Registry") de forma descriptiva y SHALL NOT
mostrarse logos ni imágenes de la Biblioteca ni copiarse sus descripciones. Cargar el salón SHALL NOT requerir cambios de esquema ni
de lectura: es un salón de la fama más, con las reglas del requisito "Salones de la fama".

#### Scenario: Cinco clases

- **WHEN** una persona abre `/es/awards/national-recording-registry`
- **THEN** llega a la clase de 2026 y ve las otras cuatro como años (2025, 2024, 2023 y 2022), de la más reciente a la más
  antigua, cada uno enlazado a su clase

#### Scenario: Clase con tres categorías

- **WHEN** abre la clase de 2026
- **THEN** ve las categorías Álbumes, Canciones y Otras grabaciones, en ese orden, cada incorporación rotulada "Ingresó", y la
  línea "Lo elige un comité de selección" con el enlace a la fuente

#### Scenario: Grabación histórica sin disco en MusicBrainz

- **WHEN** una canción de 1927 de la clase no se pudo enlazar al catálogo
- **THEN** se muestra su título y artista como texto, sin enlace, y la clase se publica igual

#### Scenario: Entrada que no es música

- **WHEN** la clase incluye un discurso o una emisión de radio
- **THEN** figura en "Otras grabaciones" como texto, con su responsable como crédito, y no se intenta resolver al catálogo

#### Scenario: No cuenta como premio ganado

- **WHEN** un álbum solo tiene una incorporación al Registry y ningún premio competitivo
- **THEN** no aparece en "Ganadores recientes" ni en "Los más premiados" y su puntaje de destacados no cambia

## MODIFIED Requirements

### Requirement: Salones de la fama en el hub

El hub de premios SHALL mostrar, bajo los premios, un bloque "Salones de la fama" con una tarjeta por salón, en la forma detallada de
las tarjetas de premios: su nombre, el año de su clase más reciente en grande, el rango de años de las clases cargadas, cuántas hay,
quién decide y la última con cuatro carátulas, enlazada a la página del salón, más las clases anteriores como enlaces directos a cada
una. La tarjeta SHALL ser la misma que la de la sección de Salón de la Fama de Explorar, que omite los datos de detalle. El bloque
SHALL omitirse sin salones. La presencia de un salón SHALL NOT cambiar la regla de cuántos premios competitivos hacen falta para que
`/awards` sea un hub.

#### Scenario: Bloque de salones

- **WHEN** hay cinco premios competitivos y dos salones de la fama
- **THEN** `/es/awards` muestra las cinco tarjetas de premios y, debajo, "Salones de la fama" con una tarjeta por salón

#### Scenario: Tarjeta detallada

- **WHEN** el Registry tiene las clases 2022 a 2026
- **THEN** su tarjeta del hub muestra "2026", "2022–2026 · 5 clases · Lo elige un comité de selección" y los años 2025, 2024, 2023
  y 2022 como enlaces a su clase

#### Scenario: Sin salones

- **WHEN** no hay ningún salón cargado
- **THEN** `/es/awards` no muestra el bloque "Salones de la fama"
