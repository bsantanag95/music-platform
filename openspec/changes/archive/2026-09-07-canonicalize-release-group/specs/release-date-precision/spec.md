## MODIFIED Requirements

### Requirement: Preservación futura del año

El modelo de datos SHALL conservar el año de lanzamiento canónico de cada `release_group`
en `release_group.first_release_year` (SMALLINT, nullable) y su fecha completa, cuando
MusicBrainz la aporta con precisión diaria, en `release_group.first_release_date` (DATE,
nullable). Ambas columnas SHALL poblarse desde el campo `first-release-date` de
MusicBrainz aplicando la misma tolerancia a precisión parcial que la ingesta de ediciones:
`YYYY-MM-DD` puebla fecha y año; `YYYY` o `YYYY-MM` pueblan solo el año; ausente o inválido
deja ambas en `null`. La interfaz SHALL mostrar al menos el año cuando exista aunque no
haya fecha exacta, sin inventar mes ni día.

#### Scenario: Fecha canónica completa

- **WHEN** MusicBrainz reporta `first-release-date` `1994-09-13` para un `release_group`
- **THEN** `first_release_date` queda en `1994-09-13` y `first_release_year` en `1994`

#### Scenario: Fecha canónica parcial con año conocido

- **WHEN** MusicBrainz reporta `first-release-date` `1985` para un `release_group`
- **THEN** `first_release_date` queda en `null`, `first_release_year` en `1985`, y la
  interfaz muestra `1985` sin inventar mes ni día

#### Scenario: Fecha parcial con año conocido

- **WHEN** un `release_group` tiene año `1985` conocido y todavía no existe una fecha
  canónica exacta
- **THEN** `first_release_year = 1985` permite mostrar `1985` sin inventar mes ni día,
  cumpliendo la evolución que esta capacidad dejaba documentada como pendiente

#### Scenario: Sin fecha canónica

- **WHEN** MusicBrainz no reporta `first-release-date` para el `release_group`
- **THEN** `first_release_date` y `first_release_year` quedan en `null` y la interfaz omite
  la fecha
