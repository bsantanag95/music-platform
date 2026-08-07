## Why

MusicBrainz devuelve fechas con distintas precisiones (`YYYY`, `YYYY-MM` o `YYYY-MM-DD`), pero
la ingesta actual intenta guardar todos esos valores directamente en una columna PostgreSQL
`DATE`. Álbumes con fecha anual, como algunos de Icon, provocan un error de PostgreSQL y hacen
fallar la navegación al detalle del álbum.

## Goals

- Evitar que una fecha parcial de MusicBrainz rompa la ingesta de una edición.
- Conservar como `DATE` únicamente fechas con precisión completa `YYYY-MM-DD`.
- Representar fechas parciales sin inventar día o mes mediante `null` en la fecha exacta.
- Dejar documentado que el producto debe conservar y mostrar al menos el año mediante un futuro
  campo `release_year` cuando no exista precisión exacta.
- Cubrir la normalización con tests unitarios y smoke tests de ingesta.

## Non-Goals

- No añadir `release_year` en esta corrección; requerirá una migración SQL y un change separado.
- No convertir `1985` en `1985-01-01` ni `1985-06` en `1985-06-01`.
- No cambiar el contrato REST actual de la vista de álbum.
- No modificar la selección de ediciones ni la lógica general de MusicBrainz.

## What Changes

- Crear un normalizador de fechas de MusicBrainz para distinguir precisión anual, mensual y diaria.
- Usar el normalizador tanto en el `insert` como en el `onConflictDoUpdate` de `release`.
- Añadir escenarios para fechas completas, parciales, ausentes e inválidas.
- Añadir una prueba de regresión para una edición cuya fecha sea `1985`.
- Documentar en el modelo de datos la futura columna `release_year` y la obligación de mostrar el
  año aunque `release_date` sea nulo por falta de precisión.

## Capabilities

### New Capabilities

- `release-date-precision`: ingesta tolerante a fechas parciales de MusicBrainz sin perder la
  semántica de precisión disponible.

### Modified Capabilities

- Ninguna. La vista de álbum no cambia su contrato en esta corrección; la persistencia del año
  completo queda registrada como evolución futura.

## Impact

- Servicios: `src/services/catalog/ingest-release.ts` y un helper de normalización.
- Datos: no requiere migración SQL en este change; `release_date` seguirá siendo `DATE` nullable.
- Tests: unitarios del normalizador, route/ingesta y smoke test con año parcial.
- Documentación: `docs/03-data/sql-model.md` y walkthrough técnico si corresponde.
- Dependencias: ninguna nueva.
