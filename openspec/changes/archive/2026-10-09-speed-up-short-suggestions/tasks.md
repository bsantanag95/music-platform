## 1. Línea base

- [x] 1.1 Guardar la medición actual de `suggest()` con 2 letras (`on`, `ma`, `th`, `mo`) para artistas, álbumes y canciones: tiempos y las 6 sugerencias

## 2. Esquema

- [x] 2.1 `drizzle/0067_search_text_columns.sql`: columnas generadas guardadas `search_text = search_key(...)` en `artist`, `release_group` y `recording`, e índices GIN `gin_trgm_ops`
- [x] 2.2 Espejo en `src/db/schema.ts` con `generatedAlwaysAs`; ajustar los fixtures de pruebas que construyen filas completas
- [x] 2.3 Aplicar la migración en scratch (`pnpm run db:migrate`) y comprobar que `search_text` coincide con `search_key` en todas las filas
- [x] 2.4 `docs/03-data/sql-model.md` y ADR 0031 (columna de búsqueda guardada)

## 3. Candidatos de 2 caracteres

- [x] 3.1 `local-match.ts`: `shortPrefixArtists`, `shortPrefixReleaseGroups` y `shortPrefixRecordings` (inicio de palabra sobre `search_text`, orden de D3, límite de candidatos); pruebas
- [x] 3.2 `suggest.ts` (artistas y álbumes) y `song-suggestions.ts` (canciones): usar las nuevas con exactamente 2 caracteres normalizados; pruebas de la elección según la longitud
- [x] 3.3 Comprobar con `EXPLAIN` sobre scratch que las tres consultas usan el índice nuevo

## 4. Documentación y verificación

- [x] 4.1 `docs/04-api/contracts.md`: comportamiento de `GET /api/search/suggest` con 2 caracteres
- [x] 4.2 Repetir la medición de 1.1: mediana ≤ 40 ms en cada tipo y prefijo, y las sugerencias de 3+ caracteres sin cambios; anotar antes/después en el diseño
- [x] 4.3 `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build`
- [x] 4.4 Verificación en el navegador del buscador del Header con 2 letras en los tres tipos
- [x] 4.5 Recordatorio: la migración `0067` queda pendiente en la base real hasta el despliegue
