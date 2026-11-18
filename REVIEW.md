# REVIEW.md

Checklist de revisión con **disparadores sobre el diff**. Cada ítem dice cuándo aplica (Rutas / Cambio / Patrón), qué debe
cumplirse (Check) y el incidente o regla de la que viene (Origen). Se aplican solo los ítems cuyo disparador coincide con el
diff: `pnpm exec tsx scripts/verify/review-triggers.ts` (o `pnpm run verify`, que lo incluye).

**Se lee desde `main`, no desde la rama que se revisa**: un cambio no puede relajar su propio check. Editar este archivo es un
cambio normal y se revisa en su PR. Cuando un ítem pide intervención humana, explica el porqué (campo Origen).

Formato (lo lee `scripts/verify/lib/review.ts`; no cambiar los nombres de campo):

- **Rutas:** globs entre acentos graves. **Cambio:** A añadido, M modificado, D borrado, R renombrado (opcional).
- **Patrón:** `/regex/flags` sobre las líneas añadidas (opcional). **Requiere:** globs que también deben estar en el diff;
  `@A` exige un archivo nuevo (opcional). **Resultado:** `falla` si basta con dispararse (opcional).

Poda: revisar este archivo cada cierto tiempo; un ítem que ya no evita nada se elimina (ver `docs/06-operations/verification.md`).

---

### R01 — Cambio de esquema sin migración nueva ni documentación
- **Rutas:** `src/db/schema.ts`
- **Requiere:** `drizzle/*.sql@A`, `docs/03-data/sql-model.md`
- **Check:** el cambio de esquema va en un `.sql` NUEVO numerado en `/drizzle/`, `schema.ts` es su espejo manual y
  `docs/03-data/sql-model.md` queda actualizado. No usar `drizzle-kit generate`.
- **Origen:** AGENTS.md (Base de datos / migraciones) y ADR 0005.

### R02 — Textos en español sin su par en inglés
- **Rutas:** `messages/es/*.json`
- **Requiere:** `messages/en/*.json`
- **Check:** cada archivo de `messages/es/` cambiado tiene su equivalente en `messages/en/` con las mismas claves, secciones y
  listas. Corre `pnpm run i18n:client-messages` si se tocó un componente cliente con `useTranslations`.
- **Origen:** tests `messages.consistency` / `messages.keys` y AGENTS.md (páginas informativas, "ambos idiomas").

### R03 — Textos en inglés sin su par en español
- **Rutas:** `messages/en/*.json`
- **Requiere:** `messages/es/*.json`
- **Check:** igual que R02, en sentido inverso.
- **Origen:** tests `messages.consistency` / `messages.keys`.

### R04 — Texto informativo o legal sin actualizar su fecha
- **Rutas:** `messages/es/info.json`, `messages/es/legal.json`, `messages/en/info.json`, `messages/en/legal.json`
- **Requiere:** `src/lib/info-pages.ts`
- **Check:** actualizar la fecha de la página en `INFO_PAGES`; no inventar políticas, plazos ni garantías (si falta información,
  va a "Por definir"); `pendingLegalReview` solo pasa a `false` con revisión de una persona con criterio legal.
- **Origen:** AGENTS.md (Páginas informativas y legales) y ADR 0060.

### R05 — Raw SQL con parámetros `Date`
- **Rutas:** `src/**/*.ts`, `scripts/**/*.ts`
- **Excluye:** `**/*.test.ts`
- **Patrón:** `/\bsql\x60[^\x60]*\$\{\s*(new Date\(|\w*[Dd]ate\w*\s*\})/` (`\x60` es el acento grave: no cabe dentro de un span de código)
- **Check:** en `sql`/`db.execute` no se pasan objetos `Date` como parámetro: usar el ISO string con `::timestamptz`. Las
  correlaciones en `sql` de nivel de módulo necesitan el literal `"tabla"."id"`.
- **Origen:** memoria `raw-sql-gotchas` (fallos recurrentes con postgres-js).

### R06 — CHECK con `IN (...)` sobre columna nulable
- **Rutas:** `drizzle/*.sql`
- **Cambio:** A
- **Patrón:** `/\bCHECK\b.*\bIN\s*\(/i`
- **Check:** si la columna es nulable, el `CHECK` lleva `IS NOT NULL` explícito (un `NULL IN (...)` es `NULL` y el `CHECK`
  lo deja pasar). Probar el caso nulo.
- **Origen:** corrección de la migración 0094 (smoke de conciertos compartidos).

### R07 — Firma vieja de `params` en rutas dinámicas de Next 15
- **Rutas:** `src/app/**/page.tsx`, `src/app/**/route.ts`, `src/app/**/layout.tsx`
- **Patrón:** `/\bparams\s*:\s*\{\s*\w+\s*:/`
- **Check:** en Next 15 `params` es `Promise<{ … }>` y exige `await params`. Solo `pnpm run typecheck` (proyecto completo, con
  `.next/types/`) o `next build` lo detectan; un smoke test con el input mockeado no.
- **Origen:** AGENTS.md (Arquitectura) y `docs/02-architecture/code-walkthrough.md`.

### R08 — Cookie o almacenamiento local nuevo sin documentar
- **Rutas:** `src/**/*.ts`, `src/**/*.tsx`
- **Patrón:** `/(document\.cookie|localStorage\.setItem|sessionStorage\.setItem|\.cookies\(\)\.set|cookieStore\.set|cookies\.set)/`
- **Requiere:** `messages/es/legal.json`, `messages/en/legal.json`
- **Check:** una cookie o clave de almacenamiento nueva aparece en la tabla de `/cookies` (`legal.json › cookies`) en ambos
  idiomas; un test compara la tabla con las cookies que define el código.
- **Origen:** AGENTS.md (Páginas informativas y legales) y `docs/05-features/info-pages.md`.

### R09 — Edición de una migración ya aplicada
- **Rutas:** `drizzle/*.sql`
- **Cambio:** M, D, R
- **Resultado:** falla
- **Check:** nunca se edita ni se borra un `.sql` ya aplicado (`_migrations` lo registra): el cambio va en un archivo nuevo.
- **Origen:** AGENTS.md (Base de datos / migraciones).

### R10 — Smoke test nuevo sin guardia de BD
- **Rutas:** `scripts/smoke-test-*.ts`
- **Cambio:** A
- **Check:** el script llama a `assertSmokeAllowed()` (`scripts/assert-smoke-allowed.ts`), crea fixtures con prefijo propio, los
  borra al terminar también si falla, y su entrada en `docs/06-operations/smoke-tests.md` incluye la sentencia de limpieza.
- **Origen:** incidente Pink Floyd (2026-08): un smoke test dejó "congelada" la discografía con datos falsos.
