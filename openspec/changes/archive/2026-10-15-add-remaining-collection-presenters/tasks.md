## 1. Apoyo compartido

- [x] 1.1 `presenters/relative.ts`: cartela relativa de pasado y de futuro (`Hoy`/`Ayer`/`Hace N días`/`Hace N semanas` y
      `Sale hoy`/`Sale mañana`/`Sale en N días`/`Sale en N semanas`); `new-releases.ts` la reutiliza sin cambiar su resultado
- [x] 1.2 `presenters/period.ts`: interpretar `AAAA-MM`, `AAAA-Qn` y `AAAA-Www-<familia>` y devolver límites `[inicio, fin)`
      en UTC; `null` ante un período ilegible; pruebas, incluido el cambio de año
- [x] 1.3 `presenters/ranking-stats.ts`: `ratingStats(ids, límites)` y `reviewCounts(ids, límites)` en una consulta por lote
      cada una, con los mismos filtros que la plantilla (reseñas visibles; valoraciones del período)
- [x] 1.4 Claves nuevas en `CONTEXT_MESSAGE_KEYS` y sus textos en `catalog.explore.collectionContext` (es/en, con plurales)

## 2. Presentadores de fechas y reglas

- [x] 2.1 `upcoming`: resumen con el rango real, cartela de cuenta regresiva y grupos por mes del más cercano al más lejano;
      una fecha ya pasada usa la cartela de pasado
- [x] 2.2 `anniversaries`: resumen con el mes y el rango de años, edad calculada contra el año del período; se abstiene con
      período ilegible
- [x] 2.3 `genre-spotlight`: resumen con la regla (`ERA_YEARS`) y el género en el idioma activo, cartela con la era y el año;
      se abstiene con una familia desconocida
- [x] 2.4 `one-per-decade`: resumen con la regla y cartela con la década y el año
- [x] 2.5 Pruebas puras de los cuatro con la fecha de hoy inyectada, incluidos los casos límite (sin fecha completa, un solo
      disco, período ilegible, familia desconocida)

## 3. Presentadores de rankings

- [x] 3.1 `top-rated-quarter`: resumen con el trimestre y el mínimo de valoraciones, cartela "★ promedio · N valoraciones" del
      trimestre, numerado; se abstiene con período ilegible
- [x] 3.2 `most-reviewed-month`: resumen con el mes, cartela "N reseñas" del mes, numerado; se abstiene con período ilegible
- [x] 3.3 Pruebas con las consultas simuladas: cifras del período, singular y plural, disco sin cifra, un solo lote por dato

## 4. Registro, documentación y verificación

- [x] 4.1 Registrar las seis plantillas en `TEMPLATE_PRESENTERS`; la prueba del registro exige un presentador por cada
      plantilla de `COLLECTION_TEMPLATES`
- [x] 4.2 `docs/05-features/explore.md` y una nota de seguimiento en el ADR 0039 (sin reescribirlo)
- [x] 4.3 Ampliar `scripts/smoke-test-explore-collections.ts`: los presentadores reales contra la base de scratch (cifras de
      ranking que coinciden con el orden del ranking, aniversario según el período, era y década) y `AGENTS.md`
- [x] 4.4 Comprobar en el navegador, en español e inglés, las colecciones reales de la base de desarrollo
- [x] 4.5 `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build`
