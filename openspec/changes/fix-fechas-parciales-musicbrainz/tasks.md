## 1. Normalización de fechas

- [ ] 1.1 Crear un helper puro para normalizar fechas de MusicBrainz antes de persistirlas.
- [ ] 1.2 Aceptar `YYYY-MM-DD` como fecha exacta y devolver `null` para `YYYY`, `YYYY-MM`, ausentes o formatos inválidos.
- [ ] 1.3 Aplicar el helper al `insert` y al `onConflictDoUpdate` de `release`.

## 2. Tests de regresión

- [ ] 2.1 Añadir tests unitarios para fechas completas, anuales, mensuales, ausentes e inválidas.
- [ ] 2.2 Añadir un test de ingesta/upsert que confirme que una edición con fecha `1985` no lanza `PostgresError`.
- [ ] 2.3 Verificar que el endpoint de detalle continúa exponiendo el shape actual y no convierte `null` en una fecha inventada.

## 3. Documentación de precisión futura

- [ ] 3.1 Actualizar `docs/03-data/sql-model.md` para documentar la normalización actual de `release_date`.
- [ ] 3.2 Registrar en ese documento la futura columna nullable `release_year` y que la página debe mostrar al menos el año cuando no exista fecha exacta.
- [ ] 3.3 Actualizar `docs/02-architecture/code-walkthrough.md` si el flujo de ingesta documentado requiere la nueva regla.

## 4. Validación

- [ ] 4.1 Ejecutar `pnpm run typecheck`.
- [ ] 4.2 Ejecutar `pnpm run lint`.
- [ ] 4.3 Ejecutar `pnpm run test`.
- [ ] 4.4 Ejecutar `pnpm run build`.
- [ ] 4.5 Ejecutar el smoke test de ingesta contra Postgres real con un álbum que tenga fecha anual, verificando el caso de Icon si está disponible.
