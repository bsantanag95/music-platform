# Verificación de cambios

Cómo se verifica un cambio en este proyecto, más allá de `typecheck → lint → test → build` del CI. Decisión de fondo y
alternativas: ADR 0062 (`docs/02-architecture/adr/`). Change de origen: `strengthen-verification-loop` (OpenSpec).

> Estado: **Fase 1** (skill `verify`, hook `Stop`, `REVIEW.md`, sello y gate en observe). Las fases siguientes (E2E, smoke tests en
> CI, propiedades) se documentan aquí a medida que se implementan.

## Piezas

| Pieza | Dónde | Qué hace |
|---|---|---|
| Skill `verify` | `.claude/skills/verify/SKILL.md` | Receta de verificación de extremo a extremo (precondiciones, checks, smoke tests, navegador, informe). |
| `pnpm run verify` | `scripts/verify/run.ts` | `review → typecheck → lint → test:related` (`test:related` = solo los tests que importan los archivos del diff; `-- --full` los reemplaza por la suite completa y suma `build`; `-- --smoke a,b` suma smoke tests). Falla rápido. |
| Precondiciones | `scripts/verify/preflight.ts` | Confirma el worktree, copia `.env` si falta y decide si la BD es de scratch. |
| Hook `Stop` | `.claude/settings.json` → `scripts/verify/stop-hook.ts` | `typecheck` + `lint` al terminar si hay cambios de código. |
| `REVIEW.md` | raíz → `scripts/verify/review-triggers.ts` | Ítems con disparador sobre el diff, leídos desde `main`. |
| Sello + gate | `.githooks/commit-msg` → `scripts/verify/seal.ts` | Trailer `Verified:` y registro de commits sin verificar. |

La lógica pura (sin I/O) vive en `scripts/verify/lib/` con sus tests (`*.test.ts`).

## Smoke tests: cuándo se habilitan

`verify` solo corre smoke tests si el **nombre** de la BD de `DATABASE_URL` indica que es desechable (`scratch`, `test`, `ci`,
`tmp` como palabra: p. ej. `music_platform_scratch`) o si se autorizó expresamente con `VERIFY_ALLOWED_DB=<nombre>`. Si no se
puede determinar, no corre ninguno y lo informa como omitido. Es la misma regla de `AGENTS.md` (los smoke tests escriben
fixtures), aplicada por código. `ALLOW_SMOKE_ON_REAL_DB=1` lo pone el propio `verify` solo cuando la BD pasó esa prueba.

## Hook `Stop`

- Vive en `.claude/settings.json` (versionado). Los hooks personales (p. ej. el detector de diseño) siguen en `settings.local.json`.
- Solo corre si hay cambios de código (no `docs/`, `openspec/`, `.claude/`) y no repite si el árbol es el mismo que ya pasó.
- Fallo en las rondas 1 y 2: bloquea el fin del turno (exit 2) y devuelve los errores resumidos al agente.
- Ronda 3: deja terminar y emite un mensaje que pide ayuda humana con el comando que falla. Un éxito reinicia el contador.
- Estado por sesión en `<tmp>/music-platform-verify/<session>.json`. Un fallo del propio hook se omite para no atascar.
- No corre `test` ni `build` (pesados): son `pnpm run verify` y el CI.

## `REVIEW.md`

Cada ítem: **Rutas** (globs), opcional **Cambio** (A/M/D/R), **Patrón** (regex sobre líneas añadidas), **Requiere** (otros archivos
que deben estar en el diff; `@A` = archivo nuevo), **Resultado**, **Check** y **Origen** (el incidente o regla). Se aplican solo los
ítems que el diff dispara; `FALLA` = falta algo verificable o la regla se rompió; `REVISAR` = disparado y lo verificable se cumple.

- Se lee con `git show main:REVIEW.md`, no del árbol de trabajo: un cambio no puede relajar su propio check. Mientras `main`
  no tiene el archivo (el cambio que lo introduce), usa la copia local y avisa.
- Agregar un ítem: debe citar su incidente y tener un caso en `scripts/verify/lib/review.test.ts`. Un ítem que ya no evita nada se
  elimina (poda periódica: las reglas que solo crecen terminan en ruido).

## Sello y gate de commit

- Trailer en el mensaje: `Verified: review,typecheck,lint,test[,build][,smoke:<nombre>]`, `Verified: none` o
  `Verified: none: <motivo>`. `node --import tsx scripts/verify/seal.ts --suggest` lo propone a partir de la última corrida de
  `verify` **sobre el mismo árbol** (si el árbol cambió después, propone `none`).
- Activación: `pnpm run verify:hooks` (`git config core.hooksPath .githooks`). No es automática.
- `VERIFY_GATE=off|observe|enforce`, por defecto `observe`: registra en `.verify/log.jsonl` lo que habría bloqueado sin bloquear.
  En `enforce` bloquea un commit sin sello, pero el tercero tras dos bloqueos seguidos pasa (válvula de escape), y `none: <motivo>`
  cuenta como explicado. Merges, reverts y fixups no se evalúan.
- Consulta: `node --import tsx scripts/verify/seal.ts --report [rango]` lista los commits sin sello o con `none`.
- El sello declara lo que se corrió; no demuestra que pasó por sí solo. El gate en `observe` sirve para medir antes de decidir `enforce`.

## Política de tests

Un test inestable no se reintenta, no se le pone `sleep` ni se salta: se arregla la causa raíz o se elimina documentando el motivo.
Los tests lentos o pesados (build, E2E, smoke) van antes del commit, no en cada iteración.
