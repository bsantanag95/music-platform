## 1. Interfaz de plantilla y generador

- [x] 1.1 Cambiar `CollectionTemplate` a `plan(now): Promise<{ periodKey, title, candidates } | null>` más `rank` y `weight`; adaptar `new-releases`, `top-rated-quarter`, `one-per-decade` y `most-reviewed-month` sin cambiar su comportamiento
- [x] 1.2 `collections/signal.ts`: fragmentos SQL de la señal de calidad (valoración con umbral → premio → rango de calendario → carátula → id)
- [x] 1.3 `collections/covers.ts`: resolver carátulas en orden de candidatos con `findOrResolveCover`, concurrencia 4, presupuesto `COVER_RESOLVE_BUDGET`, descarte de las no confirmadas
- [x] 1.4 `generate.ts` usa `plan` + `covers`; el peso inicial sale de la plantilla si no hay período anterior que heredar
- [x] 1.5 `featured.ts`: `resumeTemplate` revive la fila más reciente de la plantilla (sin `periodKey` síncrono)
- [x] 1.6 Constantes: `CANDIDATE_POOL`, `COVER_RESOLVE_BUDGET`; pruebas de `covers.ts` y de la señal

## 2. Plantillas del día 0

- [x] 2.1 `grammy-winners`: última ceremonia cargada, ganadores con álbum (directo o ancla), generales primero; período `<premio>-<año>`
- [x] 2.2 `anniversaries`: aniversarios múltiplos de 5 (≥ 10) del mes, con ampliación a cualquier aniversario ≥ 10; período `AAAA-MM`
- [x] 2.3 `genre-spotlight`: familia por semana ISO entre las elegibles, un álbum por era de 5 años en orden cronológico, siguiente familia si no llega; período `AAAA-Www-<familia>`
- [x] 2.4 `upcoming`: próximos del calendario por rango, completados con los del catálogo
- [x] 2.5 Reordenar `new-releases` y `one-per-decade` con la señal; ranks 1–6 y peso 10 para las de comunidad
- [x] 2.6 Pruebas unitarias de período/título de cada plantilla nueva (semana ISO, mes, año de ceremonia, ampliación)

## 3. Verificación previa y operación

- [x] 3.1 `sync-explore-collections.ts --dry-run`: informe por plantilla (período, título, candidatos, con carátula, motivo) sin escribir
- [x] 3.2 Mensajes `messages/{es,en}` con los nombres de las plantillas nuevas en el panel "Generadas automáticamente"
- [x] 3.3 Ampliar `smoke-test-explore-collections.ts`: cada plantilla nueva sobre datos sintéticos (premio, calendario, aniversarios, familia), resolución de carátulas simulada y vista previa sin escritura

## 4. Documentación y cierre

- [x] 4.1 ADR 0035 y `explore.md`: las seis del día 0, señal de calidad y guía de puesta en marcha (géneros → premios → calendario → dry-run → generación)
- [x] 4.2 `AGENTS.md`: entrada del smoke test ampliada
- [x] 4.3 Medir en scratch una corrida completa y el dry-run con datos reales; anotar qué plantillas no llegan y por qué
- [x] 4.4 `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build`; smoke contra BD de scratch
