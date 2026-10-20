## MODIFIED Requirements

### Requirement: Salones de la fama en el hub

El hub de premios SHALL mostrar, bajo los premios, un bloque "Salones de la fama" con una tarjeta por salón, en la forma detallada de
las tarjetas de premios: su nombre, el año de su clase más reciente en grande junto a cuántas grabaciones ingresaron en ella, el rango
de años de las clases cargadas, cuántas hay, quién decide y carátulas de la última clase, enlazada a la página del salón, más las
clases anteriores como enlaces directos a cada una. La tarjeta SHALL ser la misma que la de la sección de Salón de la Fama de Explorar,
que omite los datos de detalle. Las carátulas SHALL elegirse primero entre las incorporaciones con carátula, luego entre las que
tienen disco en el catálogo y al final el resto, cada grupo en el orden curado. Con hasta dos salones, las tarjetas SHALL ser anchas
(dos por fila) con ocho carátulas en pantallas grandes y cuatro en las demás; con tres o más, SHALL usar la grilla de las tarjetas de
premios con cuatro carátulas. El bloque SHALL omitirse sin salones. La presencia de un salón SHALL NOT cambiar la regla de cuántos
premios competitivos hacen falta para que `/awards` sea un hub.

#### Scenario: Bloque de salones

- **WHEN** hay cinco premios competitivos y dos salones de la fama
- **THEN** `/es/awards` muestra las cinco tarjetas de premios y, debajo, "Salones de la fama" con una tarjeta por salón

#### Scenario: Tarjeta detallada

- **WHEN** el Registry tiene las clases 2022 a 2026
- **THEN** su tarjeta del hub muestra "2026", "2022–2026 · 5 clases · Lo elige un comité de selección" y los años 2025, 2024, 2023
  y 2022 como enlaces a su clase

#### Scenario: Tarjetas anchas con dos salones

- **WHEN** hay dos salones y la clase 2026 del Registry tiene 25 grabaciones
- **THEN** las dos tarjetas ocupan la fila, la del Registry dice "25 grabaciones" junto a "2026" y muestra ocho carátulas en pantalla grande

#### Scenario: Carátulas reales primero

- **WHEN** las primeras incorporaciones de la clase tienen disco en el catálogo pero sin carátula y otras más abajo sí la tienen
- **THEN** la tarjeta muestra primero las que tienen carátula

#### Scenario: Sin salones

- **WHEN** no hay ningún salón cargado
- **THEN** `/es/awards` no muestra el bloque "Salones de la fama"
