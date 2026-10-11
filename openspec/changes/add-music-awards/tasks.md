## 1. Esquema

- [x] 1.1 `drizzle/0068_music_awards.sql`: tablas `award`, `award_ceremony`, `award_category`,
  `award_category_edition`, `award_nomination`; `CHECK` de `tier`, `subject_kind`, `honors`, `coverage` y "como
  mucho una FK de sujeto"; únicos `(award_id, year)`, `(award_id, edition)`, `(award_id, key)`,
  `(ceremony_id, category_id)`; FK de sujeto con `ON DELETE SET NULL`; índices por FK de sujeto (para las insignias
  futuras); triggers de `updated_at` donde haya esa columna.
- [x] 1.2 Espejo en `src/db/schema.ts` con sus tipos `*Row`.
- [x] 1.3 `docs/03-data/sql-model.md`: sección de premios.

## 2. Curaduría

- [x] 2.1 `src/services/awards/curation-schema.ts`: esquema Zod de `categories.json` y de los archivos de
  ceremonia, con las reglas cruzadas (sujeto coherente, `winner_only` solo con ganadores, `anchor` en grabaciones,
  clave de categoría existente) y mensajes que indican archivo y categoría.
- [x] 2.2 Prueba que valida todos los archivos de `data/awards/` (corre en CI).
- [x] 2.3 `scripts/resolve-award-nominees.ts`: álbum, artista y grabación dentro de su disco ancla vía el cliente de
  MusicBrainz; escribe `resolved` (estado, MBID, semilla, candidatos); `--retry` para ambiguos y no encontrados;
  reporte final. Pruebas del criterio de decisión (exacto, ambiguo, no encontrado) con respuestas mockeadas.
- [x] 2.4 `scripts/load-awards.ts` + `src/services/awards/load.ts`: validación previa, transacción por ceremonia,
  upserts por clave, reemplazo de nominaciones, stubs desde la semilla sin consultar MusicBrainz; resumen por
  ceremonia.

## 3. Datos (Grammy, niveles A y B)

- [x] 3.1 `data/awards/grammy/categories.json`: categorías del campo general y "Mejor álbum de …" vigentes entre 2021
  y 2025, con nombre es/en, nivel, tipo de sujeto, `honors` y predecesoras.
- [x] 3.2 `data/awards/grammy/ceremonies/2025.json` (piloto) con `sourceUrl`; resolver y dejar el reporte de
  ambiguos para revisión.
- [ ] 3.3 **Revisión humana** del piloto 2025 contra la fuente, y decisión de los ambiguos.
- [x] 3.4 Ceremonias 2021–2024, resueltas y con su reporte.
- [ ] 3.5 **Revisión humana** de 2021–2024.

## 4. Lectura y páginas

- [x] 4.1 `src/services/awards/read.ts`: índice de premios, ceremonia con categorías y nominados (con carátula,
  foto y enlaces), historia de categoría con predecesora y sucesora, ceremonias recientes para Explorar.
- [x] 4.2 `/[locale]/(catalog)/awards/page.tsx` (índice).
- [x] 4.3 `/[locale]/(catalog)/awards/[award]/[year]/page.tsx` (ceremonia), con `notFound()` y `params` como
  `Promise`.
- [x] 4.4 `/[locale]/(catalog)/awards/[award]/categories/[key]/page.tsx` (historia de categoría).
- [x] 4.5 Componentes en `src/components/awards/` (categoría, fila de nominado con ganador destacado, nota de
  cobertura, chips de ceremonias) y `messages/{es,en}/awards.json` (nombre del premio por slug, etiquetas, notas).
- [x] 4.6 Sección "Premios" en `/explore` después de Próximos lanzamientos, omitida sin ceremonias.

## 5. Pruebas

- [x] 5.1 Servicio de lectura (orden de categorías y nominados, ganador primero, `winner_only`, sin resolver como
  texto, predecesora y sucesora) y componentes.
- [x] 5.2 `scripts/smoke-test-music-awards.ts` sobre una BD de scratch (MBID `5e0ce000-…`, borra sus fixtures al
  terminar): `CHECK` de la migración, carga idempotente, archivo inválido sin escritura, stubs sin requests a
  MusicBrainz, `ON DELETE SET NULL`.
- [x] 5.3 Verificación en el navegador de las tres páginas y la sección de Explorar, en es y en.

## 6. Documentación

- [x] 6.1 `docs/05-features/awards.md` (nuevo): alcance, flujo de curaduría paso a paso, cobertura y marca.
- [x] 6.2 `docs/01-domain/domain-model.md` y `docs/01-domain/business-rules.md` (cobertura, sujeto, empates).
- [x] 6.3 `docs/05-features/explore.md`: sección Premios.
- [x] 6.4 `AGENTS.md`: el smoke test nuevo y su limpieza.
- [x] 6.5 ADR 0032 a "Aceptado".

## 7. Cierre

- [x] 7.1 Migración aplicada en scratch y carga corrida ahí.
- [x] 7.2 `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build` pasan.
