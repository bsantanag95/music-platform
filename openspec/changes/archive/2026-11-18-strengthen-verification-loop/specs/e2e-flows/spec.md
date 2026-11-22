## ADDED Requirements

### Requirement: Feature map como rúbrica
El proyecto SHALL mantener `docs/05-features/feature-map.md`, que liste los flujos críticos desde la perspectiva de la persona
usuaria (ruta de entrada, pasos, selectores accesibles y resultado esperado). Ese mapa SHALL ser la rúbrica que usan `verify` y la
suite E2E.

#### Scenario: Flujo documentado
- **WHEN** se consulta el feature map
- **THEN** cada flujo crítico tiene ruta, pasos y resultado esperado, y está cubierto por un E2E o marcado como "solo manual"

### Requirement: Suite E2E de flujos críticos
El proyecto SHALL incluir una suite Playwright que cubra, como mínimo, iniciar sesión, buscar y abrir un álbum, valorar, añadir a
una lista y abrir un perfil. La suite SHALL ejecutarse con un comando propio (`pnpm run test:e2e`) y SHALL NOT formar parte de
`pnpm test` ni del hook `Stop`.

#### Scenario: Flujo de valoración
- **WHEN** la suite inicia sesión con el usuario de prueba, abre un álbum y asigna una valoración
- **THEN** la página refleja la valoración guardada y el test pasa

#### Scenario: Ejecución separada
- **WHEN** se ejecuta `pnpm test`
- **THEN** los E2E no se ejecutan

### Requirement: Aislamiento de datos y de red
Los E2E SHALL correr contra una BD de scratch sembrada con un usuario de prueba y SHALL NOT salir a MusicBrainz, Wikimedia ni
ListenBrainz reales; esas llamadas se interceptan. La suite SHALL abortar si `DATABASE_URL` apunta a la BD real.

#### Scenario: BD real detectada
- **WHEN** `pnpm run test:e2e` se ejecuta con `DATABASE_URL` igual a la de la BD real
- **THEN** la suite aborta antes de crear datos y explica cómo usar una BD de scratch

### Requirement: Evidencia ante un fallo
Ante un fallo, el E2E SHALL conservar traza y captura de pantalla del paso fallido, y el reporte SHALL describir qué paso falló.

#### Scenario: Paso fallido
- **WHEN** un E2E falla al hacer clic en un control inexistente
- **THEN** quedan guardadas la traza y la captura, y el reporte nombra el paso fallido

### Requirement: Sin reintentos para ocultar inestabilidad
La configuración de la suite SHALL NOT reintentar automáticamente los tests fallidos. Un test inestable SHALL arreglarse en su causa o
eliminarse documentando el motivo.

#### Scenario: Test que falla una vez
- **WHEN** un E2E falla en su primera ejecución
- **THEN** se reporta como fallido sin reintento automático
