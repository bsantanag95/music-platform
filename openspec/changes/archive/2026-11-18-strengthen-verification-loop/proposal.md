## Why

La verificación del proyecto descansa hoy en tres piezas: el CI (`typecheck → lint → test → build`), ~750 archivos de
test unitarios/de componente y ~50 smoke tests contra Postgres real. Lo que falta es lo que permite delegar más trabajo a
agentes sin leer cada diff (artículo "How the Claude Code team thinks about verification"):

- No hay forma estándar de **probar un cambio de extremo a extremo**: cada fase repite a mano levantar `next dev` desde el
  worktree, copiar `.env`, correr smoke tests y recorrer páginas en el navegador.
- Las reglas de "antes de dar por terminado" (`typecheck`, `lint`, `build`) viven solo en prosa en `AGENTS.md`; ningún hook
  las hace cumplir.
- No hay tests E2E de navegador, y los smoke tests (los únicos de integración con BD) **no corren en CI**.
- Los incidentes pasados (Pink Floyd congelado con datos falsos, `Date` en raw SQL, `CHECK` con `IN` nulable, firmas viejas de
  `params`) están en la memoria de sesiones y en `AGENTS.md`, pero no como checks que se disparen solos al tocar ese código.

Hacerlo ahora: el proyecto ya tiene decenas de cambios OpenSpec archivados, varios agentes en paralelo y worktrees; el costo de
verificar a mano crece con cada fase.

## What Changes

Se organiza en 4 fases de mayor a menor impacto; cada fase es entregable por separado.

**Fase 1 — Verificar y no olvidar (skill, hook, review, sello)**
- Skill `verify` en `.claude/skills/verify/`: levanta `next dev` desde el worktree (con `.env`), corre los smoke tests
  relevantes contra una BD de scratch y recorre el feature map con el navegador integrado; falla rápido y reporta evidencia.
- Hook `Stop` **del proyecto** (`.claude/settings.json`, versionado) que corre `typecheck` y `lint`; tras 3 rondas fallidas
  en la misma sesión deja de insistir y pide ayuda humana explicando qué falla.
- `REVIEW.md` con ítems disparados por patrones del diff (esquema, `messages/`, raw SQL con `Date`, cookies, `params`
  dinámicos…), cada uno con su check y el incidente que lo originó.
- Sello de verificación en el mensaje de commit (`Verified: …`, incluido `none`) y un gate en modo **observe**
  (registra, no bloquea).

**Fase 2 — E2E y feature map**
- `docs/05-features/feature-map.md`: flujos de usuario, rutas y resultados esperados; rúbrica de `verify` y de los E2E.
- Playwright con 4–5 flujos críticos (login, buscar y abrir un álbum, valorar, añadir a una lista, perfil) contra una BD de
  scratch sembrada; script `pnpm run test:e2e` aparte de `pnpm test`.

**Fase 3 — Integración en CI**
- Job de CI con servicio Postgres efímero que aplica migraciones y corre `smoke-test-ingestion` (BD virgen) y
  `smoke-test-routes`, usando fixtures mockeados (sin salir a internet).
- Higiene de smoke tests: limpieza común en `finally`, marca de los que exigen BD virgen, poda de los obsoletos.

**Fase 4 — Property-based tests**
- `fast-check` (dev dependency) en lógica pura delicada: ranking de edición representativa, normalización de
  `search_text`, agrupación de runs del feed, fechas parciales y zona horaria, idempotencia de backfills.

**Documentación**: `AGENTS.md` (comandos y "antes de dar por terminado"), `docs/06-operations/` (verificación, smoke tests,
CI) y un ADR nuevo con la decisión de arquitectura de verificación.

## Goals

- Que un agente pueda probar su propio cambio con un solo paso (`verify`) y dejar evidencia revisable.
- Que las reglas de "terminado" se cumplan por código (hook, CI, gate) y no solo por prosa.
- Que los incidentes conocidos se conviertan en checks que se disparan al tocar el código relevante.
- Que la verificación sea rápida y estable: los tests lentos o inestables no entran al bucle por defecto.

## Non-Goals

- No se cambia ningún contrato de API, regla de negocio, esquema de BD ni texto de las páginas informativas o legales.
- No se activa el gate de commit en modo `enforce` (solo `observe`); pasar a `enforce` es una decisión posterior.
- No se mide recall de revisores ni se montan evals formales de revisión (parte del artículo fuera de escala aquí).
- No se reemplazan vitest ni los smoke tests: se complementan.
- No se aplica a las pruebas visuales de diseño ni al detector `impeccable` (hooks locales del usuario).
- No se corre contra la BD real ni se sale a MusicBrainz/Wikimedia/ListenBrainz reales en CI.

## Capabilities

### New Capabilities
- `verify-workflow`: skill `verify`, hook `Stop` del proyecto con escalado a humano y sello de verificación en commits con
  gate en modo observe.
- `diff-review-rules`: `REVIEW.md` con disparadores sobre el diff, leído desde la rama base, con check e incidente por ítem.
- `e2e-flows`: feature map y suite Playwright de flujos críticos contra una BD de scratch.
- `ci-integration-checks`: job de CI con Postgres efímero para smoke tests y reglas de higiene de smoke tests.
- `property-tests`: propiedades verificadas con `fast-check` sobre la lógica pura listada.

### Modified Capabilities
<!-- Ninguna: no cambia el comportamiento de producto de ninguna capacidad existente. -->

## Impact

- **Nuevos archivos**: `.claude/skills/verify/`, `.claude/settings.json` (hooks del proyecto), `REVIEW.md`,
  `docs/05-features/feature-map.md`, `e2e/` + `playwright.config.ts`, `docs/02-architecture/adr/00NN-*.md`, scripts de apoyo
  en `scripts/` (hook, sello, limpieza común de smoke tests).
- **Modificados**: `.github/workflows/ci.yml`, `package.json` (scripts `test:e2e`, `verify`), `AGENTS.md`,
  `docs/06-operations/smoke-tests.md`, varios `scripts/smoke-test-*.ts` (higiene), `.gitignore`.
- **Dependencias nuevas** (a justificar en `design.md`): `@playwright/test` y `fast-check`, solo en `devDependencies`.
- **Sin impacto** en producción: no cambia `src/` salvo posibles `data-testid`/selectores accesibles para los E2E.
- **Riesgos**: tiempo extra de CI (mitigado con jobs separados y E2E fuera del job principal); falsos positivos del sello
  (mitigados con el modo observe); `.claude/settings.local.json` está versionado hoy y contiene hooks locales del usuario
  (los del proyecto van en `settings.json`, aparte).
