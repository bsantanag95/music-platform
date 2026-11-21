## MODIFIED Requirements

### Requirement: Índice de premios

`/{locale}/awards` SHALL depender de cuántos premios hay cargados. Con **un solo premio** SHALL redirigir a su ceremonia más reciente
(`/{locale}/awards/{premio}/{año}`). Con **varios**, SHALL ser el hub de premios: bajo el título, la cantidad de premios y de
ceremonias cargadas; una tarjeta por premio, de la ceremonia más reciente primero, con el nombre del premio, el año y la edición de su
ceremonia más reciente y su ganador destacado con su carátula, cada una enlazada a la ceremonia, sin
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
