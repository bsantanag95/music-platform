# release-date-precision

Ingesta tolerante a fechas parciales de MusicBrainz, preservando la semántica de precisión disponible en `release_date`.

## Requirements

### Requirement: Ingesta tolerante a precisión de fechas

La ingesta SHALL aceptar fechas de MusicBrainz con precisión anual, mensual o diaria sin abortar
la persistencia de la edición. SHALL guardar en `release_date` únicamente una fecha completa
`YYYY-MM-DD`; para fechas parciales o ausentes SHALL guardar `null`.

#### Scenario: Fecha completa

- **WHEN** MusicBrainz devuelve una fecha válida con formato `YYYY-MM-DD`
- **THEN** la edición se guarda con ese mismo valor en `release_date`

#### Scenario: Fecha anual

- **WHEN** MusicBrainz devuelve una fecha con formato `YYYY`, como `1985`
- **THEN** la edición se ingiere sin error y `release_date` queda en `null`

#### Scenario: Fecha mensual

- **WHEN** MusicBrainz devuelve una fecha con formato `YYYY-MM`
- **THEN** la edición se ingiere sin error y `release_date` queda en `null`

#### Scenario: Fecha ausente o inválida

- **WHEN** MusicBrainz no devuelve fecha o devuelve un formato no soportado
- **THEN** la edición se ingiere sin error y `release_date` queda en `null`

### Requirement: Preservación futura del año

El modelo de datos SHALL reservar una evolución explícita mediante `release_year` para conservar
el año conocido de fechas parciales y la interfaz SHALL mostrar al menos ese año cuando no exista
una fecha exacta. Esta evolución no requiere implementarse en la corrección actual, pero SHALL
quedar documentada como trabajo pendiente antes de cerrar el modelo de fechas.

#### Scenario: Fecha parcial con año conocido

- **WHEN** una edición tiene `1985` y todavía no existe `release_date` exacto
- **THEN** la documentación del modelo indica que `release_year = 1985` debe permitir mostrar
  `1985` sin inventar mes ni día
