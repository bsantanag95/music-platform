## ADDED Requirements

### Requirement: Propiedades sobre lógica pura
El proyecto SHALL verificar con `fast-check`, dentro de la suite vitest, propiedades de la lógica pura de: ranking de edición
representativa, normalización de `search_text`, agrupación de runs del feed, fechas parciales y zona horaria, e idempotencia de
las transformaciones usadas por los backfills. Solo SHALL aplicarse a funciones sin efectos secundarios.

#### Scenario: Idempotencia de normalización
- **WHEN** se normaliza dos veces cualquier cadena generada
- **THEN** el resultado de la segunda normalización es igual al de la primera

#### Scenario: Ranking estable
- **WHEN** se rankean ediciones generadas en distinto orden de entrada
- **THEN** la edición representativa elegida es la misma

### Requirement: Equivalencia con una versión ingenua
Cuando exista una implementación optimizada y otra simple y evidentemente correcta, una propiedad SHALL comprobar que ambas
devuelven el mismo resultado para entradas generadas.

#### Scenario: Agrupación de runs
- **WHEN** se agrupan eventos de feed generados con la función real y con una referencia ingenua
- **THEN** ambos agrupamientos son iguales

### Requirement: Reproducibilidad
Las propiedades SHALL ejecutarse con una semilla fija en CI y con un número de corridas acotado, y SHALL imprimir la semilla y el
contraejemplo mínimo al fallar.

#### Scenario: Fallo reproducible
- **WHEN** una propiedad falla en CI
- **THEN** la salida incluye la semilla y el contraejemplo reducido para reproducirlo localmente

### Requirement: Dependencia solo de desarrollo
`fast-check` SHALL declararse únicamente en `devDependencies` y SHALL NOT importarse desde código de `src/` que no sea de test.

#### Scenario: Build de producción
- **WHEN** se ejecuta `pnpm run build`
- **THEN** el resultado no incluye `fast-check`
