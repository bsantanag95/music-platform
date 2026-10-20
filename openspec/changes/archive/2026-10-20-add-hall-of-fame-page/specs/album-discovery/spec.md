## MODIFIED Requirements

### Requirement: Sección Salón de la Fama de Explorar

La sección Salón de la Fama de `/explore` (ancla `salon-de-la-fama`) SHALL mostrar, bajo un encabezado y con el mismo aspecto que Premios,
**una tarjeta por salón de la fama** con al menos una clase cerrada, en la misma cuadrícula que las tarjetas de Premios. Cada tarjeta
SHALL mostrar el nombre del salón, el año de su última clase y cuatro carátulas de las incorporaciones de esa clase (primero las que
tienen disco en el catálogo; las canciones, con la carátula de su disco ancla), con el fondo teñido por la primera carátula, y SHALL
abrir la clase más reciente del salón en `/hall-of-fame`. La sección SHALL ofrecer un enlace "Ver todos" al índice `/hall-of-fame` y SHALL
omitirse por completo sin clases cerradas. El encabezado SHALL decir "Salón de la Fama" con un solo salón y "Salones de la Fama" con más
de uno, igual que la entrada de la navegación rápida. SHALL NOT mostrar descripciones del sitio de la organización ni su logo, ni listar
las incorporaciones de la clase (eso es de la página de la clase).

#### Scenario: Última clase

- **WHEN** el Grammy Hall of Fame tiene cargadas sus cinco clases (2020, 2021, 2024, 2025 y 2026)
- **THEN** su tarjeta muestra "2026" y cuatro carátulas de las incorporaciones de esa clase, y abre `/es/hall-of-fame/grammy-hall-of-fame/2026`

#### Scenario: Incorporación sin ficha

- **WHEN** una incorporación de la clase no se pudo enlazar al catálogo y hay otras con disco
- **THEN** la tarjeta usa las carátulas de las que sí tienen disco, y la incorporación sin ficha se ve como texto, sin enlace, en la página de la clase

#### Scenario: Una tarjeta por salón

- **WHEN** el Grammy Hall of Fame (clase 2026) y el National Recording Registry (clase 2026) tienen clases cerradas
- **THEN** la sección, inmediatamente después de Premios, muestra el encabezado "Salones de la Fama" y dos tarjetas con la misma
  anchura que las de Premios, cada una con su nombre, "2026" y cuatro carátulas

#### Scenario: Un solo salón

- **WHEN** solo el Grammy Hall of Fame tiene clases cerradas
- **THEN** el encabezado y la entrada de la navegación rápida dicen "Salón de la Fama" y la sección muestra una tarjeta

#### Scenario: Abrir la clase

- **WHEN** una persona abre la tarjeta del Registry
- **THEN** llega a `/es/hall-of-fame/national-recording-registry/2026`, con todas las incorporaciones de la clase

#### Scenario: Canción de la clase

- **WHEN** una de las carátulas es de una canción cuyo disco ancla está en el catálogo
- **THEN** la tarjeta muestra la carátula de ese disco

#### Scenario: Ver todos

- **WHEN** una persona abre "Ver todos" de la sección
- **THEN** llega al índice `/es/hall-of-fame`, donde cada salón aparece con su última clase y todas sus clases

#### Scenario: Sin clases

- **WHEN** ningún salón de la fama tiene una clase cerrada cargada
- **THEN** `/explore` no renderiza la sección ni un mensaje de vacío
