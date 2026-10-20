## ADDED Requirements

### Requirement: Página propia de los salones de la fama

Los salones de la fama SHALL tener su propio índice en `/hall-of-fame` y sus clases en `/hall-of-fame/<salón>/<año>`, separados de las
páginas de premios. `/hall-of-fame/<salón>` SHALL redirigir a la clase más reciente. La página de una clase SHALL llevar la miga "Inicio
/ Salón de la Fama / <salón> / Clase de <año>", donde "Salón de la Fama" enlaza al índice y el salón, a su página, y SHALL ofrecer las
demás clases como años enlazados a la ruta nueva. Las rutas `/awards/<salón>` y `/awards/<salón>/<año>` SHALL redirigir de forma
permanente a las equivalentes de `/hall-of-fame`; `/hall-of-fame/<premio>` de un premio competitivo SHALL ser una página no encontrada.
El índice SHALL mostrar un encabezado, una tarjeta detallada por salón y, por salón, las incorporaciones de su última clase con un enlace a
todas sus clases; sin salones SHALL mostrar un mensaje de vacío. El modelo de datos no cambia: un salón sigue siendo un premio de tipo
`hall_of_fame`.

#### Scenario: Índice de salones

- **WHEN** hay dos salones cargados y una persona abre `/es/hall-of-fame`
- **THEN** ve el encabezado "Salones de la fama", una tarjeta por salón con su clase más reciente y, bajo cada una, las incorporaciones
  de esa clase con "Ver todas las clases"

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

## REMOVED Requirements

### Requirement: Salones de la fama en el hub

**Reason**: los salones dejan de mostrarse dentro del hub `/awards`; su índice y su tarjeta detallada viven ahora en `/hall-of-fame`
(requisito "Página propia de los salones de la fama"). El hub de premios solo conserva un enlace corto a esa página cuando hay salones.

**Migration**: la tarjeta (nombre, año y cantidad de grabaciones, rango de clases, quién decide, carátulas con ancho según cuántos
salones hay y clases anteriores como enlaces) se conserva tal cual en el índice de salones.
