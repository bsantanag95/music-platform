# ci-integration-checks Specification

## Purpose
Smoke tests en el CI contra un Postgres efímero, aparte del job de build, y reglas comunes de los smoke tests: limpieza de fixtures en un `finally`, código de salida fiel, declaración de BD virgen y poda de los obsoletos.
## Requirements
### Requirement: Job de integración con Postgres efímero
El CI SHALL incluir un job separado del de `build` que levante un servicio Postgres efímero, aplique las migraciones con
`pnpm run db:migrate` y ejecute `smoke-test-ingestion` (BD virgen) y después `smoke-test-routes`. El job SHALL usar solo fixtures
mockeados y SHALL NOT salir a internet real.

#### Scenario: Corrida exitosa
- **WHEN** el job corre sobre una BD virgen con migraciones aplicadas
- **THEN** `smoke-test-ingestion` y `smoke-test-routes` pasan en ese orden

#### Scenario: Fallo de un smoke test
- **WHEN** un smoke test falla
- **THEN** el job falla y publica la salida del script fallido

### Requirement: La BD del job es desechable
El job SHALL apuntar `DATABASE_URL` únicamente al servicio efímero y SHALL habilitar `ALLOW_SMOKE_ON_REAL_DB=1` solo dentro de él.
El job SHALL NOT recibir credenciales de ninguna BD real.

#### Scenario: Variables del job
- **WHEN** se revisa la configuración del job
- **THEN** `DATABASE_URL` apunta al servicio Postgres del propio job y no existen secretos de BD real

### Requirement: El job principal no cambia
El job `build` existente (`typecheck`, `lint`, `test`, `build`) SHALL conservar sus pasos y su orden; la integración se añade como
job aparte para no alargar el camino crítico.

#### Scenario: Orden de pasos
- **WHEN** se revisa el workflow
- **THEN** el job `build` ejecuta `typecheck`, `lint`, `test` y `build` en ese orden sin pasos nuevos

### Requirement: Limpieza garantizada de fixtures de smoke tests
Los smoke tests SHALL crear sus fixtures con un prefijo propio y SHALL borrarlos en un bloque `finally` común, también si fallan.
Cada smoke test SHALL declarar si exige una BD virgen, y `docs/06-operations/smoke-tests.md` SHALL reflejarlo.

#### Scenario: Smoke test que falla a mitad
- **WHEN** un smoke test lanza un error después de crear fixtures
- **THEN** los fixtures con su prefijo se borran antes de terminar el proceso

#### Scenario: BD no virgen
- **WHEN** un smoke test que exige BD virgen detecta datos previos
- **THEN** aborta con un mensaje que explica el motivo, sin escribir nada

### Requirement: Poda de smoke tests obsoletos
Los smoke tests que cubran código ya reescrito o eliminado SHALL identificarse en una auditoría y SHALL eliminarse o actualizarse
en el mismo cambio, con su entrada en `smoke-tests.md`.

#### Scenario: Smoke obsoleto detectado
- **WHEN** la auditoría encuentra un smoke test cuya funcionalidad ya no existe
- **THEN** se elimina el script y su entrada de documentación en el mismo cambio

