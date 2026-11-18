## Context

Verificación actual: CI (`typecheck → lint → test → build`, sin BD), ~750 archivos vitest, ~50 smoke tests en `scripts/`
(Postgres real, `global.fetch` mockeado, guardia `assert-smoke-allowed.ts` que exige `ALLOW_SMOKE_ON_REAL_DB=1`), y
verificación visual manual con el navegador integrado. Los worktrees no traen `.env` (`worktree-env`) y `preview_start` sirve la
raíz, no el worktree (`worktree-dev-server`), así que cada fase reinventa el arranque. `.claude/settings.local.json` está
versionado y contiene hooks **personales** (detector de diseño `impeccable`, con ruta absoluta del usuario): no sirve de lugar
para hooks del proyecto. Las reglas de negocio críticas viven en SQL (`CHECK`/índices únicos) y las convenciones en `AGENTS.md`.

Referencia conceptual: artículo "How the Claude Code team thinks about verification" (E2E primero, skill `verify`, checks
baratos antes de integrar, checklist con disparadores sobre el diff, gate con modo observe, checks que el cambio no puede editar).

## Goals / Non-Goals

**Goals:**
- Un solo punto de entrada para verificar un cambio (`verify`), reproducible en cualquier worktree.
- Reglas de "terminado" aplicadas por código (hook `Stop`, CI, sello) con salida a humano cuando el agente no converge.
- Incidentes conocidos convertidos en ítems de `REVIEW.md` con disparador, check e incidente de origen.
- Cobertura de integración en CI (Postgres efímero) y un E2E mínimo de flujos críticos.

**Non-Goals:**
- Gate en `enforce`, evals de recall de revisores, E2E exhaustivo, cambios de producto, esquema o contratos.
- Reemplazar vitest o los smoke tests.

## Decisions

### D1. Hooks del proyecto en `.claude/settings.json`, no en `settings.local.json`
El archivo local ya existe, está versionado y tiene hooks personales con rutas absolutas. Los hooks del proyecto van en
`.claude/settings.json` (compartido) y llaman a scripts del repo (`scripts/verify/*.ts`) con rutas relativas.
*Alternativa*: ampliar `settings.local.json` → mezcla política del proyecto con preferencias del usuario y rompe en otras máquinas.

### D2. Hook `Stop` corre `typecheck` + `lint`; `test` y `build` quedan en `verify`/CI
`typecheck` (tsc completo, único que detecta firmas viejas de `params`) y `lint` son los baratos que `AGENTS.md` ya exige.
`vitest run` (~750 archivos) y `next build` son pesados: según el artículo, van "antes del commit", no en cada iteración. El
hook lee `session_id` del stdin, lleva un contador de rondas fallidas en un archivo temporal por sesión y:
- rondas 1–2 con fallo → sale con código 2 y devuelve la salida resumida para que el agente corrija;
- ronda 3 → deja pasar y emite un mensaje que pide intervención humana con el comando que falla;
- éxito → reinicia el contador. Si no hay cambios en el árbol (`git status` limpio de código), no corre nada.
*Alternativa*: correr `test` también en el hook → ralentiza cada turno; se mantiene como opción de `verify --full`.

### D3. Skill `verify` = receta + scripts, no lógica nueva en `src/`
`.claude/skills/verify/SKILL.md` define el procedimiento; `scripts/verify/` aloja lo automatizable (TypeScript con `tsx`, como el resto de `scripts/`: la lógica pura se testea con vitest y el typecheck la cubre):
1. precondiciones (cwd es el worktree, `.env` presente o se copia desde la raíz, `DATABASE_URL` de scratch);
2. `typecheck`/`lint`/`test` rápidos;
3. smoke tests relevantes (mapa archivo→smoke en el propio skill) con `ALLOW_SMOKE_ON_REAL_DB=1` **solo** si el nombre de la BD de
   `DATABASE_URL` indica que es desechable (`scratch`/`test`/`ci`/`tmp`) o está autorizada con `VERIFY_ALLOWED_DB` (falla cerrada; el
   `.env` del desarrollador puede apuntar legítimamente a la scratch, así que comparar contra "la BD real" no sirve); si no, los omite;
4. `next dev -p <puerto libre>` desde el worktree y recorrido del feature map con el navegador integrado;
5. informe con evidencia (comandos, salidas, capturas) y sello.
No se agrega código de aplicación; el skill es la receta que hoy se repite a mano.

### D4. `REVIEW.md` en la raíz, leído desde la rama base
Lista de ítems `disparador → check → incidente`. El skill de revisión y el hook de sello lo leen con
`git show main:REVIEW.md` (no del working tree), de modo que un cambio no pueda relajar su propio check. Cambiar `REVIEW.md` es
un cambio normal que se revisa en su PR. Ítems iniciales: `schema.ts` ↔ `.sql` nuevo + `sql-model.md`; `messages/` en ambos
idiomas + fecha en `INFO_PAGES`; raw SQL con `Date` o `sql` de módulo; `CHECK` con `IN` nulable; ruta dinámica con `params`
sin `await`; cookie/`localStorage` nuevos ↔ tabla de `/cookies`; edición de un `.sql` ya aplicado; smoke test que escribe en BD real.

### D5. Sello de verificación como trailer de commit + gate `observe`
`Verified: typecheck,lint,test,build,smoke:<nombres>,e2e` (o `Verified: none`) como trailer del mensaje. Un hook `commit-msg`
local (en `.githooks/`, activado con `core.hooksPath` por script de setup) **registra** en `.verify/log` los commits sin sello
o con `none`, sin bloquear. Modo configurable por variable (`VERIFY_GATE=off|observe|enforce`, por defecto `observe`); `enforce`
queda implementado pero desactivado, con válvula de escape tras 2 bloqueos. El trailer se incluye junto a las líneas de
atribución que pida el entorno; no se inventan coautores.
*Alternativa*: bloquear desde el primer día → falsos positivos y fricción; el artículo recomienda observar primero.

### D6. Playwright para E2E, aparte del job principal
`@playwright/test` (devDependency): único con trazas, capturas y locators accesibles estables en Next 15; alternativa Cypress es
más pesada. Los E2E corren con `pnpm run test:e2e` contra `next start` de un build y una BD de scratch sembrada
(`seed-*` existentes + usuario de prueba); no entran en `pnpm test` ni en el hook `Stop`. Solo 4–5 flujos para evitar
inestabilidad: login, buscar y abrir álbum, valorar, añadir a lista, perfil. Se prefieren locators por rol/etiqueta; `data-testid`
solo si no hay alternativa accesible. Un test inestable no se reintenta: se arregla o se borra con nota (política del artículo).
Las llamadas externas se interceptan (sin MusicBrainz real).

### D7. CI: job `integration` separado con servicio Postgres
Nuevo job en `.github/workflows/ci.yml` (el job `build` queda como está): `services: postgres:16`, `pnpm run db:migrate`,
`smoke-test-ingestion` primero (exige BD virgen) y luego `smoke-test-routes` con `ALLOW_SMOKE_ON_REAL_DB=1` (la BD es efímera
y propia del job). Los smoke tests que dependan de la red real quedan fuera hasta ser mockeados. E2E en un tercer job opcional
(`e2e`), no bloqueante en esta etapa.
*Alternativa*: añadir todo al job `build` → alarga el camino crítico y mezcla fallos.

### D8. Higiene de smoke tests con un helper común
`scripts/smoke-lib/` con `withFixtureCleanup(prefix, fn)` que garantiza la limpieza en `finally` y declara `requiresPristineDb`.
Migración gradual: primero los que ya crean fixtures con prefijo (`smoke_*`, `smoke-*`). Poda: lista en `smoke-tests.md` de los
que cubren código ya reescrito, a decidir caso por caso en la tarea correspondiente (no se borra nada sin revisar).

### D9. `fast-check` solo en dev y solo sobre funciones puras
Se justifica porque las propiedades (round-trip de normalización, idempotencia, equivalencia de ranking con una versión ingenua)
no comparten el sesgo de quien escribió el código. No se testean funciones con efectos ni UI. Semilla fija en CI para
reproducibilidad y `numRuns` acotado para mantener el tiempo bajo.

### D10. Documentación y ADR
ADR `0062-estrategia-de-verificacion` (decisión: bucle de verificación local + CI + sello observe). `AGENTS.md` se actualiza
(comandos `verify`/`test:e2e`, "antes de dar por terminado", política de tests inestables) y `docs/06-operations/` gana
`verification.md`; `smoke-tests.md` y `catalog-scripts.md` reflejan la higiene.

## Risks / Trade-offs

- **La suite completa tarda ~19 min en esta máquina** (754 archivos, jsdom) → `verify` corre solo `vitest related` sobre el diff y la suite completa queda en `--full` y en el CI; los E2E y smoke siguen aparte.
- **El hook `Stop` alarga cada turno** → solo corre si hay cambios de código; `typecheck` incremental (`tsc --incremental`) si
  hace falta; la ronda 3 siempre deja pasar.
- **Falsos positivos del sello** → modo `observe` por defecto; revisión del log antes de plantear `enforce`.
- **E2E inestables** → solo 5 flujos, locators por rol, sin reintentos automáticos; no bloquean el CI al inicio.
- **Smoke en CI sobre la BD equivocada** → `DATABASE_URL` del job apunta al servicio efímero; `verify` local compara con la BD real
  antes de poner `ALLOW_SMOKE_ON_REAL_DB`.
- **`REVIEW.md` desactualizado** → cada ítem cita su incidente; revisión periódica (poda) documentada en `verification.md`.
- **Dependencias nuevas** (`@playwright/test`, `fast-check`) → solo `devDependencies`; justificadas arriba.
- **Windows**: los scripts son Node (`tsx`), no bash, para funcionar en PowerShell y Git Bash; el único shell es el wrapper `.githooks/commit-msg`.

## Migration Plan

Entrega por fases (cada una con su commit/PR y sus tareas verdes): 1) skill + hook + `REVIEW.md` + sello observe; 2) feature
map + E2E; 3) CI integración + higiene de smoke; 4) propiedades. Reversión: quitar el hook de `settings.json` y el job de CI;
ningún dato ni esquema cambia.

## Open Questions

- ¿Los E2E deben pasar a ser bloqueantes en CI tras N semanas estables? (decisión posterior a la fase 2).
- ¿Qué smoke tests están realmente obsoletos? Se decide con una auditoría en la fase 3, no antes.
- ¿`VERIFY_GATE=enforce` para agentes en paralelo? Pendiente de revisar el log de `observe`.
