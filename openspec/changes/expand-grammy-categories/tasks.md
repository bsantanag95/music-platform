## 1. Esquema y migración

- [x] 1.1 Escribir `drizzle/0072_award_category_levels.sql`: columna `field` con `CHECK` de formato; quitar `chk_award_category_tier`, mover `genre` → `album` y recrear el `CHECK` con los tres niveles; `CHECK (tier <> 'genre' OR field IS NOT NULL)` (design D9)
- [x] 1.2 Espejo en `src/db/schema.ts`: `AWARD_CATEGORY_TIERS = ["general", "album", "genre"]`, columna `field`, los tres `check`, y `awardTierRank` / `awardTierRankSql` generados desde la tupla (D2)
- [x] 1.3 Prueba unitaria: `awardTierRankSql` y `awardTierRank` coinciden para cada nivel de la tupla
- [x] 1.4 Actualizar `docs/03-data/sql-model.md` (niveles, `field`)
- [x] 1.5 Aplicar `0072` en la BD de scratch y comprobar que las filas existentes quedan en `album`

## 2. Esquema de curaduría, carga y lectura

- [x] 2.1 `curation-schema.ts`: nivel con tres valores, `field` opcional en `CategoryDefinitionSchema`, error de validación si el nivel es `genre` y falta `field`, y error si un nivel distinto de `genre` lo trae
- [x] 2.2 `validateCeremony`: error si una categoría `complete` tiene menos de 3 nominados (con archivo y categoría); actualizar `curation-schema.test.ts`
- [x] 2.3 `load.ts`: persistir `field` (insert y `onConflict` con `IS DISTINCT FROM`, para que la segunda carga no cambie filas)
- [x] 2.4 `read.ts`: devolver `field` en las vistas de categoría; `sortCategoryEditions` por `awardTierRank`, luego orden del campo y luego `sortOrder`; ajustar `read.test.ts`
- [x] 2.5 `collection-context.ts` y plantilla `grammy-winners`: ordenar con `awardTierRankSql` en vez de `(tier = 'general') desc`; pruebas con ganadores de los tres niveles (`collection-context.test.ts`, `generate.test.ts`)
- [x] 2.6 Categoría de persona: verificar que `nomineeText`, la resolución y `NomineeVisual` ya cubren `artist` con `credits` (Productor / Compositor) y agregar la prueba de esquema y de resolución que lo respalde

## 3. Interfaz

- [x] 3.1 Página de ceremonia: tres niveles con títulos, navegación de saltos y subtítulos por campo en el nivel `genre`; niveles `h2`, campos `h3`, categorías `h4` (`AwardCategory` con `headingLevel="h4"`)
- [x] 3.2 Mensajes es/en (`awards.json`): `tierGeneral`, `tierAlbum`, `tierGenre`, `fields.*`, etiqueta de la navegación; quitar "Mejor álbum por género"
- [x] 3.3 Prueba que lee `categories.json` y falla si algún `field` no tiene traducción es y en (design D3)
- [x] 3.4 Prueba de la página: orden de niveles, subtítulos por campo, nivel omitido cuando no hay categorías; revisión visual en `/es/awards/grammy/2026` (escritorio y móvil) con datos reales
- [x] 3.5 Revisar que la tarjeta de Explorar y el titular siguen tomando Álbum del año (nivel `general`, sujeto álbum)

## 4. Categorías

- [x] 4.1 `categories.json`: pasar las 9 existentes a `album`; sumar las 22 nuevas (design D5, incluida `best-dance-recording` de 2021) con `tier`, `subject`, `honors`, `field`, nombres es/en y `order`; las dos de country con `predecessor: best-country-album`; `best-alternative-music-performance` y `best-dance-pop-recording` sin predecesora
- [x] 4.2 Validar con `validateCategories` y la prueba de CI

## 5. Datos por ceremonia

Por ceremonia, en este orden de trabajo: leer el artículo de Wikipedia (`sourceUrl`) por tramos, escribir las categorías
nuevas en el JSON, contrastar cada categoría con su cuenta de nominados y con la lista de ganadores del artículo,
resolver (`scripts/resolve-award-nominees.ts --year <año>`), fijar a mano los ambiguos y validar. Las categorías que la
ceremonia no otorgó no se escriben.

- [x] 5.1 **2026** (68.ª, 1 de febrero de 2026): crear `2026.json` con las 14 categorías existentes (menos la división de country, que va con las nuevas) y las nuevas, incluidas Productor / Compositor del año y los dos álbumes de country
- [x] 5.2 **2025**: agregar las categorías nuevas (incluida la grabación dance pop, primera ceremonia)
- [x] 5.3 **2024**: agregar las categorías nuevas (Compositor del año; sin grabación dance pop, que empieza en 2025)
- [x] 5.4 **2023**: agregar las categorías nuevas (Compositor del año se otorga desde esta ceremonia; primera con interpretación alternativa)
- [x] 5.5 **2022**: agregar las categorías nuevas (sin Compositor del año, grabación dance pop ni interpretación alternativa)
- [x] 5.6 **2021**: agregar las categorías nuevas (con "Mejor grabación dance", antecesora de la dance/electrónica; sin Compositor del año ni interpretación alternativa)
- [ ] 5.7 Fijar a mano los nominados `ambiguous` / `not_found` de las seis ceremonias; los que no se puedan resolver se cargan como texto
- [ ] 5.8 Revisión humana de los datos contra `sourceUrl` (queda para la persona curadora, como en `add-music-awards`)

## 6. Carga y verificación

- [x] 6.1 `scripts/load-awards.ts` sobre la BD de scratch: idempotente (segunda corrida sin filas modificadas)
- [x] 6.2 Actualizar `scripts/smoke-test-music-awards.ts` para los tres niveles, `field` y una categoría de persona; correrlo contra scratch y limpiar según `AGENTS.md`
- [x] 6.3 Comprobar en `/es/awards/grammy/2026` y en la historia de una categoría nueva (`/awards/grammy/categories/best-rock-performance`) que los ganadores y la predecesora de country se ven bien
- [x] 6.4 `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build`

## 7. Documentación

- [x] 7.1 `docs/05-features/awards.md`: cobertura 2021–2026, tres niveles, criterio de selección y lista de lo descartado, categorías de persona, cómo se agrupan por campo
- [x] 7.2 `docs/01-domain/business-rules.md` y `domain-model.md`: niveles de categoría y categorías de persona
- [x] 7.3 Nuevo ADR (siguiente número libre) sobre los tres niveles, el campo y el sujeto persona; sin reescribir el ADR 0032
- [x] 7.4 `docs/05-features/explore.md`: orden de la colección `grammy-winners` y tarjeta de premios si cambia algo
