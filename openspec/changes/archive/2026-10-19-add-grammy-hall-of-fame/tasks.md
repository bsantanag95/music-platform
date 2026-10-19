## 1. Esquema

- [x] 1.1 `drizzle/0074_award_kind.sql`: `award.kind TEXT NOT NULL DEFAULT 'competition'` con `CHECK (kind IN
  ('competition','hall_of_fame'))` y `award_ceremony.edition` nulable con `CHECK (edition IS NULL OR edition > 0)` y `held_on` del año de la ceremonia o del
  anterior.
- [x] 1.2 Espejo en `src/db/schema.ts` (`AWARD_KINDS`, `kind`, `edition: number | null`) y `docs/03-data/sql-model.md`.

## 2. Curaduría y carga

- [x] 2.1 `curation-schema.ts`: `kind` en `categories.json` (omitido = `competition`); `edition` opcional en la ceremonia; reglas
  por tipo en `validateCeremony` (edición obligatoria solo en competencia; sin mínimo de nominados ni `winner_only` en un
  salón; `anchor` obligatorio en grabaciones). Pruebas de cada regla.
- [x] 2.2 `load.ts`: escribir `award.kind` y la edición nula, de forma idempotente; la prueba de idempotencia cubre un salón.
- [x] 2.3 Que un salón no pueda cargar una ceremonia con `held_on` futura (solo clases cerradas), con su mensaje.

## 3. Lectura y exclusión de los rankings

- [x] 3.1 `competitionOnly()` (condición SQL sobre `award.kind`) y su uso en `listLatestCeremoniesByAward`, ganadores recientes,
  más premiados y tu relación con los ganadores recientes (`read.ts`, `personal.ts`).
- [x] 3.2 Excluir los salones de los dos `awardScore` (`discovery.ts` y `collections/signal.ts`). Una prueba por lector con una
  nominación de un salón que demuestra que no cambia su resultado.
- [x] 3.3 `grammy-winners` toma la ceremonia más reciente de cualquier premio: restringirla a `competition` (con prueba);
  confirmar que `collection-context.ts` (por premio y año) y `award-anchor-tracks.ts` (sin filtro) no cambian.
- [x] 3.4 `CeremonySummary`/`CeremonyPage` con `kind` y `edition: number | null`; arreglar cada uso que asumía número.
- [x] 3.5 `listHallOfFameClasses()` (última clase cerrada de cada salón con sus incorporaciones y cuántas clases hay) y la
  lectura de las clases de un salón para su página.

## 4. Interfaz

- [x] 4.1 Ceremonia de un salón: "Clase de {año}", sin edición, "Ingresó", sin bloque de nominados si no hay, sin enlace a la
  historia de la categoría y votación "Elige un comité de la Recording Academy" (`awards.json` es/en).
- [x] 4.2 Página del premio (`/awards/[award]`): redirige a la clase más reciente, cuyas demás clases salen como años (sin
  cambios de código: ya lo hace).
- [x] 4.3 `HallOfFameExploreSection` (`id="salon-de-la-fama"`): encabezado, "Clase de 2026 · 14 grabaciones", riel con una
  tarjeta por incorporación (carátula del disco ancla en las canciones) y "Ver todas las clases"; se omite sin clases.
- [x] 4.4 `explore/page.tsx`: la sección tras Premios y su entrada en la navegación rápida (`jump.hallOfFame`, es/en).
- [x] 4.5 Hub `/awards`: bloque "Salones de la fama" con una tarjeta por salón, omitido sin salones; sin cambiar cuántos
  premios competitivos hacen un hub.
- [x] 4.6 Nombre del premio `names.grammy-hall-of-fame` (es/en) y orden de grupos del hub si hace falta.

## 5. Datos (Grammy Hall of Fame 2022–2026)

- [x] 5.1 `data/awards/grammy-hall-of-fame/categories.json` (`kind: hall_of_fame`, `voting: academy`, Álbumes y Canciones).
- [x] 5.2 Las cinco clases (2020, 2021, 2024, 2025 y 2026; no hubo en 2022 ni 2023) en `ceremonies/` desde los comunicados oficiales, cada una con su `sourceUrl`, contrastadas con
  Wikipedia ("Year inducted"); títulos y artistas tal como los da la fuente.
- [x] 5.3 Resolver con `scripts/resolve-award-nominees.ts` (canciones ancladas en su sencillo o disco) y fijar a mano los
  ambiguos; cargar en la base de prueba.
- [ ] 5.4 **Revisión humana** de las cinco clases contra la fuente.

## 6. Pruebas

- [x] 6.1 Componentes: ceremonia sin edición ni nominados, sección de Explorar (con y sin clases, canción con ancla, entrada sin
  ficha), tarjeta del hub, navegación rápida con la entrada nueva.
- [x] 6.2 `smoke-test-music-awards.ts`: un salón sintético (`kind`, edición nula, clase corta, `held_on` futura rechazada) y que
  no aparece en tarjetas, ganadores recientes, más premiados ni en los puntajes.
- [x] 6.3 Verificar en el navegador (es y en, escritorio y móvil) la sección, la ceremonia, la página del salón y el hub.

## 7. Documentación

- [x] 7.1 ADR 0044 (salones de la fama como tipo de premio; enmienda el punto 3 del 0043).
- [x] 7.2 `docs/05-features/awards.md`, `explore.md` (tabla y navegación rápida), `domain-model.md`, `business-rules.md` y
  `AGENTS.md` (smoke test).

## 8. Cierre

- [x] 8.1 Migración aplicada y datos cargados en la base de prueba.
- [x] 8.2 `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build` pasan.
