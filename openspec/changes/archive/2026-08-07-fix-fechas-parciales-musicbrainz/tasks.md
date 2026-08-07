## 1. Normalización de fechas

- [x] 1.1 Crear un helper puro para normalizar fechas de MusicBrainz antes de persistirlas.
- [x] 1.2 Aceptar `YYYY-MM-DD` como fecha exacta y devolver `null` para `YYYY`, `YYYY-MM`, ausentes o formatos inválidos.
- [x] 1.3 Aplicar el helper al `insert` y al `onConflictDoUpdate` de `release`.

## 2. Tests de regresión

- [x] 2.1 Añadir tests unitarios para fechas completas, anuales, mensuales, ausentes e inválidas.
- [x] 2.2 Añadir un test de ingesta/upsert que verifique que una edición con fecha `1985` se normaliza a `releaseDate: null` antes de persistir (la ausencia de `PostgresError` contra Postgres real se validó manualmente con Icon y en el smoke test).
- [x] 2.3 Verificar que el endpoint de detalle continúa exponiendo el shape actual y no convierte `null` en una fecha inventada.

## 3. Documentación de precisión futura

- [x] 3.1 Actualizar `docs/03-data/sql-model.md` para documentar la normalización actual de `release_date`.
- [x] 3.2 Registrar en ese documento la futura columna nullable `release_year` y que la página debe mostrar al menos el año cuando no exista fecha exacta.
- [x] 3.3 Actualizar `docs/02-architecture/code-walkthrough.md` si el flujo de ingesta documentado requiere la nueva regla.

## 4. Validación

- [x] 4.1 Ejecutar `pnpm run typecheck`.
- [x] 4.2 Ejecutar `pnpm run lint`.
- [x] 4.3 Ejecutar `pnpm run test`.
- [x] 4.4 Ejecutar `pnpm run build`.
- [x] 4.5 Ejecutar el smoke test de ingesta contra Postgres real con un álbum que tenga fecha anual, verificando el caso de Icon si está disponible.
