# Verificación de cambios

Cómo se verifica un cambio en este proyecto, más allá de `typecheck → lint → test → build` del CI. Decisión de fondo y
alternativas: ADR 0062 (`docs/02-architecture/adr/`). Change de origen: `strengthen-verification-loop` (OpenSpec).

> Estado: **Fases 1 a 4** (skill `verify`, hook `Stop`, `REVIEW.md`, sello y gate en observe; feature map y E2E; smoke tests en CI; tests de propiedades).

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

## E2E (Playwright)

- `pnpm run test:e2e` (`playwright.config.ts`, `e2e/*.e2e.ts`; vitest no los recoge). Los flujos están en `docs/05-features/feature-map.md`, que es su rúbrica.
- **BD:** exige una BD de scratch (misma regla que `verify`) y aborta al cargar la config, antes de levantar el servidor. El setup global siembra
  (en un proceso aparte con `tsx`: `e2e/lib/seed-cli.ts`) un artista, un álbum de 3 canciones, una lista y dos usuarios `e2e_*` con MBID
  `e2e00000-…`; el teardown lo borra, también si los tests fallan. La sesión del usuario de prueba se guarda en `e2e/.auth/` (ignorado por git).
- **Red:** el servidor se levanta sin `MUSICBRAINZ_USER_AGENT`, `WIKIMEDIA_USER_AGENT` ni `LISTENBRAINZ_USER_AGENT`: esos clientes fallan cerrados y
  nada sale a internet (las páginas muestran "MusicBrainz no respondió").
- **Servidor:** por defecto un **build de producción** (`next build && next start`, puerto `E2E_PORT`, 3417). `E2E_SKIP_BUILD=1` reutiliza el `.next`
  (solo si el código no cambió). `E2E_SERVER=dev` usa `next dev`, pero es inestable: compila cada ruta al primer acceso y un chunk a medio compilar deja
  la página sin hidratar (en una corrida el formulario de login se envió como GET nativo, con la contraseña en la URL).
- **Navegador:** `E2E_CHANNEL=msedge` (o `chrome`) usa el instalado; sin él, el Chromium de Playwright (`pnpm exec playwright install chromium`).
- **Sin reintentos** (`retries: 0`) y **un solo worker** (los flujos comparten usuario y BD). Antes de interactuar con un control de cliente, el test espera
  su hidratación (`e2e/lib/hydration.ts`), no un `sleep`.
- **Evidencia:** un fallo deja traza y captura en `e2e/.results/` (con su `error-context.md`) y un informe HTML en `e2e/.report/`.
- **Estabilidad:** 5 corridas seguidas con 9 de 9 tests en verde (2026-11-18, ~50 s cada una con el build ya hecho). Un test que falle de forma intermitente
  se arregla en su causa o se elimina con su motivo.

## Tests de propiedades (`fast-check`)

Un test de propiedades afirma algo que no puede fallar y `fast-check` genera cientos de entradas para intentar refutarlo; encuentra los casos límite que
nadie imaginó al escribir el código. Viven junto al código como `*.property.test.ts` y corren con `pnpm test` (y con `verify`, por ser tests relacionados).

| Archivo | Qué afirma |
|---|---|
| `src/services/catalog/search/normalize.property.test.ts` | La normalización de búsqueda (contraparte TS de `search_key`) es idempotente, no deja mayúsculas ni diacríticos ni espacios sobrantes; `tokenize`, `matchTier` y `isExactMatch` son coherentes; `baseSongTitle` es idempotente. |
| `src/services/catalog/representative-release.property.test.ts` | La edición representativa **no depende del orden** de las ediciones (ni de invertirlas), siempre es una de las dadas, es oficial si hay alguna oficial y no muta la entrada. Incluye fechas parciales (`YYYY`, `YYYY-MM`). |
| `src/components/feed/feed-grouping.property.test.ts` | `groupFeedRuns` no inventa filas, es pura, no repite ids, cada grupo es un tramo contiguo de una persona y un tipo, y conserva el orden. |
| `src/services/musicbrainz/mappers.property.test.ts` | `normalizeReleaseDate` acepta toda fecha de calendario real tal cual y rechaza parciales e imposibles (31 de abril, 29 de febrero sin bisiesto); `yearFromMbDate` concuerda; la categoría del álbum no depende del orden de los tipos. |
| `src/lib/time-zone.property.test.ts` | `parseTimeZone` nunca lanza, es idempotente, acepta toda zona IANA y rechaza los desplazamientos sueltos. |
| `src/services/catalog/release-group-category.property.test.ts` | El backfill de categorías es **idempotente** (aplicar el plan y volver a planear no cambia nada), solo toca lo que cambia y no depende del orden. |
| `src/lib/slug.property.test.ts` | `slugify` es idempotente, `truncateSlug` respeta el tope y el id de catálogo hace ida y vuelta. |

- **Reproducibles:** semilla fija (`20261118`) y 200 corridas por propiedad (`src/test/property.ts`): una corrida no cambia de un día para otro. Si una propiedad falla,
  `fast-check` imprime la semilla y el contraejemplo ya reducido; se reproduce con `FC_SEED=<semilla> pnpm exec vitest run <archivo>`.
- **Explorar:** `FC_RUNS=5000 FC_SEED=<otra> pnpm exec vitest run <archivo>` busca más a fondo sin tocar el código (ver en la tabla de abajo lo que se encontró).
- **Solo sobre funciones puras**, sin red, BD ni UI. La normalización SQL (`search_key`) y los backfills que escriben en la BD se cubren con los smoke tests.
- **Solo de desarrollo:** `fast-check` está en `devDependencies` y `src/test/property.meta.test.ts` falla si algún archivo que no sea un test lo importa; `next build` no lo incluye.
- **Cómo se sabe que las propiedades detectan algo:** se rompió a propósito cada una de cuatro funciones y la propiedad correspondiente falló (2026-11-18): quitar `toLowerCase`
  de `normalizeSearchText`, quitar el desempate por mbid de `pickRepresentativeRelease`, agrupar personas distintas en `groupFeedRuns` y proponer cambios innecesarios en
  `planCategoryUpdates`. Una propiedad nueva debería pasar por la misma prueba antes de fiarse de ella.
- **Exploración (2026-11-18):** 3 semillas distintas × 3000–5000 corridas por propiedad sin ningún contraejemplo: las funciones cubiertas se comportan como se esperaba.

## Contador de consultas por petición

`src/db/query-counter.ts` cuenta las consultas a Postgres de cada petición y detecta los N+1: la misma sentencia repetida
muchas veces en una sola petición, en vez de una consulta por lote. Va enganchado como `logger` del cliente de Drizzle
(`src/db/index.ts`), que avisa cada consulta en el contexto asíncrono de quien la hace.

- **Modo** (`DB_QUERY_COUNTER`): `warn` por defecto fuera de producción, `off` en producción (sin logger: no cuesta nada),
  `all` para una línea por petición. Un valor desconocido falla al arrancar.
- **Aviso** (`console.warn`, al terminar la petición vía `after`): si una sentencia se repite **5** veces o más, o si la
  petición pasa de **50** consultas. Ejemplo: `[db] /[locale]/search — 33 consultas; posible N+1:` y debajo
  `12× select "release_group"."id", … from "credit" …`. Dos sentencias son "la misma" si solo cambian sus parámetros; un `IN ($1, …)` o un
  `VALUES` de cualquier tamaño cuentan como una sola forma.
- **Qué es una petición**: el store de trabajo que Next abre por petición (`workAsyncStorage`; páginas, layouts, metadata,
  route handlers y server actions), y la ruta del informe es su patrón (`/[locale]/artist/[id]`). Es una API interna
  de Next (`next/dist/server/app-render/work-async-storage.external`): si una versión nueva la cambia, el test
  `query-counter.test.ts` no lo detecta (la mockea), pero `typecheck` sí, porque la importa con su tipo.
- **Fuera de Next** (scripts, smoke tests contra una BD de scratch): `countQueries(fn)` devuelve `{ result, summary }` con el
  total y las sentencias repetidas, para medir o fijar en un smoke test cuántas consultas hace un flujo. Cuenta con el
  contador encendido (`NODE_ENV` distinto de `production` o `DB_QUERY_COUNTER` puesto).
- Los tests unitarios mockean `@/db`, así que no pasan por el contador: lo que mide es la app real (`next dev`) o un
  script con `countQueries`.
- Una sentencia repetida no siempre es un error: un bucle con tope y en segundo plano (sincronizaciones, `after`) puede ser
  deliberado. El aviso pide mirarlo, no lo bloquea.

## CI

`.github/workflows/ci.yml` tiene tres jobs independientes:

- `build` (sin cambios): `typecheck → lint → test → build`, sin BD.
- `integration`: Postgres 18 efímero, migraciones y `pnpm run smoke:ci` (33 smoke tests con `fetch` mockeado; lista y criterios en
  `docs/06-operations/smoke-tests.md`). Bloquea.
- `e2e`: el mismo servicio, Chromium de Playwright y `pnpm run test:e2e`. **No bloquea** (`continue-on-error`) mientras se mide su estabilidad en CI; sube
  el informe y las trazas como artefacto si falla. Pasar a bloqueante es una decisión posterior.

Ningún job recibe credenciales de una BD real: `DATABASE_URL` apunta siempre al servicio del propio job.

## Política de tests

Un test inestable no se reintenta, no se le pone `sleep` ni se salta: se arregla la causa raíz o se elimina documentando el motivo.
Los tests lentos o pesados (build, E2E, smoke) van antes del commit, no en cada iteración.
