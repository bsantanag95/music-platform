## 1. Fase 1 — Skill `verify`

- [x] 1.1 Crear `scripts/verify/preflight.ts` (Node, sin bash): comprueba que el cwd es el worktree, copia `.env` desde la raíz si falta y compara `DATABASE_URL` con la BD real; sale con código distinto de cero si no puede determinarlo
- [x] 1.2 Crear `.claude/skills/verify/SKILL.md` con el procedimiento (precondiciones, `typecheck`/`lint`/`test`, smoke relevantes, `next dev -p <puerto libre>` desde el worktree, recorrido del feature map, informe con evidencia)
- [x] 1.3 Incluir en el skill el mapa "archivo tocado → smoke test relevante" (catálogo, social, diario, listas, notificaciones…) y la regla de abortar si la BD es la real
- [x] 1.4 Añadir `pnpm run verify` (preflight + typecheck + lint + test) a `package.json`
- [x] 1.5 Probar el skill en este worktree: ejecución completa con BD de scratch y caso "BD real" (debe omitir los smoke tests)

## 2. Fase 1 — Hook `Stop` del proyecto

- [x] 2.1 Crear `scripts/verify/stop-hook.ts`: lee `session_id` del stdin, omite si no hay cambios de código, corre `typecheck` y `lint`, resume la salida
- [x] 2.2 Implementar el contador de rondas fallidas por sesión (archivo temporal): rondas 1–2 bloquean con la salida, la ronda 3 deja pasar y pide intervención humana con el comando fallido; el éxito reinicia el contador
- [x] 2.3 Registrar el hook en `.claude/settings.json` (nuevo, versionado) sin tocar `settings.local.json`
- [x] 2.4 Tests vitest del contador y del resumen de salida (funciones puras separadas del I/O)
- [x] 2.5 Verificar a mano los tres casos: fallo, tercera ronda y sin cambios

## 3. Fase 1 — `REVIEW.md` y sello de verificación

- [x] 3.1 Redactar `REVIEW.md` con los ítems iniciales (disparador → check → incidente) y la regla de leerlo desde `main`
- [x] 3.2 Crear `scripts/verify/review-triggers.ts` que, dado un diff, devuelve los ítems cuyo disparador coincide (leyendo `git show main:REVIEW.md`), más tests con diffs de ejemplo
- [x] 3.3 Crear el hook `commit-msg` en `.githooks/` y `scripts/verify/seal.ts`: lee el trailer `Verified:`, registra en `.verify/log` los commits sin sello o con `none`; modo por `VERIFY_GATE` (`off|observe|enforce`, por defecto `observe`)
- [x] 3.4 Implementar la válvula de escape de `enforce` (el tercer commit pasa tras dos bloqueos) y probarla con tests
- [x] 3.5 Script de activación `core.hooksPath` (documentado, no automático) y añadir `.verify/` a `.gitignore`
- [x] 3.6 Documentar en `AGENTS.md` el sello y que los trailers de atribución se mantienen según las reglas existentes

## 4. Fase 2 — Feature map y E2E

- [x] 4.1 Redactar `docs/05-features/feature-map.md` con los 5 flujos críticos (login, buscar y abrir álbum, valorar, añadir a lista, perfil): ruta, pasos, selectores accesibles, resultado esperado
- [x] 4.2 Añadir `@playwright/test` como devDependency (justificada en `design.md`), `playwright.config.ts` sin reintentos, con traza y captura ante fallo, y `pnpm run test:e2e` (servidor de producción por defecto; `next dev` queda opcional por su inestabilidad)
- [x] 4.3 Crear la siembra de BD de scratch para E2E (usuario de prueba + datos mínimos con prefijo propio) y la guardia que aborta si `DATABASE_URL` es la real
- [x] 4.4 Cortar las llamadas externas en los E2E: el servidor arranca sin los user agents de MusicBrainz, Wikimedia y ListenBrainz (fallan cerrados, nada sale a internet)
- [x] 4.5 Implementar los 5 E2E; añadir solo los `data-testid` imprescindibles cuando no haya locator accesible
- [x] 4.6 Ejecutar la suite 5 veces seguidas para comprobar estabilidad y documentar el resultado
- [x] 4.7 Referenciar el feature map desde el skill `verify`

## 5. Fase 3 — Integración en CI e higiene de smoke tests

- [ ] 5.1 Crear `scripts/smoke-lib/` con `withFixtureCleanup(prefix, fn)` y la declaración `requiresPristineDb`; tests del helper
- [ ] 5.2 Migrar a ese helper los smoke tests que ya crean fixtures con prefijo, empezando por `smoke-test-ingestion` y `smoke-test-routes`
- [ ] 5.3 Auditar los ~50 smoke tests: marcar los que exigen BD virgen y listar los candidatos a poda (solo con evidencia de que cubren código reescrito); decidir con el usuario antes de borrar
- [ ] 5.4 Añadir el job `integration` a `.github/workflows/ci.yml` (Postgres efímero, `db:migrate`, `smoke-test-ingestion` luego `smoke-test-routes`) sin tocar el job `build`
- [ ] 5.5 Comprobar que ambos smoke tests corren sin red real en el job (sin salida a internet) y con `ALLOW_SMOKE_ON_REAL_DB=1` solo dentro del job
- [ ] 5.6 Añadir un job `e2e` opcional y no bloqueante
- [ ] 5.7 Actualizar `docs/06-operations/smoke-tests.md` (marcas de BD virgen, limpieza común, poda)

## 6. Fase 4 — Property-based tests

- [ ] 6.1 Añadir `fast-check` como devDependency (justificada en `design.md`) y un helper con semilla fija y `numRuns` acotado
- [ ] 6.2 Propiedades de normalización de `search_text` (idempotencia, insensibilidad a mayúsculas y acentos según la regla vigente)
- [ ] 6.3 Propiedades del ranking de edición representativa (independencia del orden de entrada, estabilidad)
- [ ] 6.4 Propiedades de la agrupación de runs del feed (equivalencia con una referencia ingenua)
- [ ] 6.5 Propiedades de fechas parciales y zona horaria (round-trip, orden coherente)
- [ ] 6.6 Propiedades de idempotencia de las transformaciones de los backfills
- [ ] 6.7 Comprobar que `fast-check` no entra al build de producción

## 7. Documentación y cierre

- [x] 7.1 Crear el ADR `docs/02-architecture/adr/0062-estrategia-de-verificacion.md` (decisión, alternativas, consecuencias)
- [ ] 7.2 Crear `docs/06-operations/verification.md` (skill, hook, sello, REVIEW.md, E2E, CI, política de tests inestables y poda periódica)
- [ ] 7.3 Actualizar `AGENTS.md`: comandos (`verify`, `test:e2e`), "antes de dar un cambio por terminado", política de tests inestables
- [ ] 7.4 Actualizar `docs/06-operations/README`/índices y `docs/README.md` si listan operaciones
- [ ] 7.5 Confirmar que no cambió ningún contrato de API, esquema ni texto de páginas informativas/legales
- [ ] 7.6 `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build` pasan; `openspec validate strengthen-verification-loop` pasa
