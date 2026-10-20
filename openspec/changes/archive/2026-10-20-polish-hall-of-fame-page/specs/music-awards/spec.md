## MODIFIED Requirements

### Requirement: Página propia de los salones de la fama

Los salones de la fama SHALL tener su propio índice en `/hall-of-fame` y sus clases en `/hall-of-fame/<salón>/<año>`, separados de las
páginas de premios. `/hall-of-fame/<salón>` SHALL redirigir a la clase más reciente. La página de una clase SHALL llevar la miga "Inicio
/ Salón de la Fama / <salón> / Clase de <año>", donde "Salón de la Fama" enlaza al índice y el salón, a su página, y SHALL ofrecer las
demás clases como años enlazados a la ruta nueva. Las rutas `/awards/<salón>` y `/awards/<salón>/<año>` SHALL redirigir de forma
permanente a las equivalentes de `/hall-of-fame`; `/hall-of-fame/<premio>` de un premio competitivo SHALL ser una página no encontrada.
El índice SHALL mostrar un encabezado y un bloque por salón con su nombre, el rango de años de sus clases, cuántas hay, quién decide,
todas sus clases como enlaces (la más reciente marcada), un enlace a todas sus clases y las incorporaciones de su última clase; SHALL NOT
repetir esa clase en una tarjeta aparte. Sin salones SHALL mostrar un mensaje de vacío. El modelo de datos no cambia: un salón sigue
siendo un premio de tipo `hall_of_fame`.

#### Scenario: Índice de salones

- **WHEN** hay dos salones cargados y una persona abre `/es/hall-of-fame`
- **THEN** ve el encabezado "Salones de la fama" y un bloque por salón con "2022–2026 · 5 clases · Lo elige un comité de selección",
  los años 2026 a 2022 enlazados, las incorporaciones de la clase 2026 y "Ver todas las clases", sin tarjetas de salón aparte

#### Scenario: Clase en la ruta nueva

- **WHEN** abre `/es/hall-of-fame/national-recording-registry/2026`
- **THEN** ve "Clase de 2026" con la miga "Inicio / Salón de la Fama / Registro Nacional de Grabaciones / Clase de 2026" y los años 2025
  a 2022 enlazados a `/hall-of-fame/national-recording-registry/<año>`

#### Scenario: Salón sin año

- **WHEN** abre `/es/hall-of-fame/grammy-hall-of-fame`
- **THEN** llega a `/es/hall-of-fame/grammy-hall-of-fame/2026`

#### Scenario: URL antigua

- **WHEN** abre `/es/awards/grammy-hall-of-fame/2024`
- **THEN** una redirección permanente lo lleva a `/es/hall-of-fame/grammy-hall-of-fame/2024`

#### Scenario: Premio competitivo en la ruta de salones

- **WHEN** abre `/es/hall-of-fame/grammy/2025`
- **THEN** ve la página de no encontrado

#### Scenario: Sin salones

- **WHEN** no hay ningún salón cargado y abre `/es/hall-of-fame`
- **THEN** ve un mensaje de que todavía no hay salones, sin redirigir

## ADDED Requirements

### Requirement: Nominados e incorporaciones sin carátula o sin ficha

Un nominado o una incorporación sin ficha en el catálogo SHALL mostrarse con su texto curado partido en título y artista en el primer
" — " (sin ese separador, el texto entero es el título). En los rieles de incorporaciones y en la tarjeta de un salón, una incorporación
sin carátula (sin ficha, sin disco, o con un disco que no tiene carátula) SHALL mostrar una portada tipográfica con la inicial de su
título sobre un tono estable para ese título, en lugar de la silueta del disco.

#### Scenario: Texto curado partido

- **WHEN** una incorporación sin ficha se curó como "Rumor Has It — Reba McEntire"
- **THEN** se muestra con el título "Rumor Has It" y el artista "Reba McEntire"

#### Scenario: Portada tipográfica

- **WHEN** una incorporación del riel no tiene carátula
- **THEN** su tarjeta muestra la inicial de su título en grande sobre un fondo de color, siempre el mismo para ese título
