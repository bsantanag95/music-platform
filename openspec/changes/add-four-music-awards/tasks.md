## 1. Código

- [x] 1.1 `read.ts`: `listLatestCeremoniesByAward()` (la ceremonia más reciente de cada premio por `heldOn`, con el ganador destacado, ordenadas de la más reciente a la más antigua) en lugar de `listRecentCeremonies(limit)`; con prueba (un premio por tarjeta, no se pierde ninguno aunque otros tengan ceremonias más recientes, ceremonia sin ganador de álbum)
- [x] 1.2 Extraer `AwardTile` de `AwardsExploreSection`; Explorar muestra una tarjeta por premio y el hub la reutiliza
- [x] 1.3 `awards/page.tsx`: con más de un premio, el hub (grilla de `AwardTile`, sin rótulo ni descripción); con uno redirige; sin premios, el mensaje; con prueba
- [x] 1.4 Migas de pan de la ceremonia y de la historia con el nivel "Premios" (Inicio / Premios / <premio> / …); con prueba
- [x] 1.5 Mensajes `awards.json` (es/en): `names.mercury-prize`, `names.brit-awards`, `names.latin-grammy`, `names.lo-nuestro` y los campos `urban`, `tropical`, `regional-mexican`, `singer-songwriter`, `brazilian` y `other-genres`; la prueba de campos pasa
- [x] 1.6 Migración `0073_award_source_and_voting.sql` (`award.voting`, `award_ceremony.source_url`, nulas, con `CHECK`), espejo en `schema.ts` y `docs/03-data/sql-model.md`; `curation-schema.ts` (`voting` obligatorio en `categories.json`, `sourceUrl` ya existe) con prueba; `voting` en el `categories.json` de los Grammy; `load.ts` escribe ambas columnas y sigue siendo idempotente (prueba)
- [x] 1.7 `getCeremonyPage` devuelve `sourceUrl` y `voting`; la cabecera de la ceremonia muestra la línea de votación y "Fuente: <sitio>" enlazado, y las omite si faltan; mensajes `voting.*` y `source` (es/en); con prueba
- [x] 1.8 Ajustar las pruebas de `explore` y de `AwardsExploreSection` a una tarjeta por premio

## 2. Datos: Mercury Prize (2021–2025)

- [x] 2.1 `data/awards/mercury-prize/categories.json` (Álbum del año, general, `release_group`) y `ceremonies/2021…2025.json` desde el artículo de cada ceremonia (`sourceUrl`), con edición, fecha, los 12 nominados y el ganador; contrastar el conteo con el artículo
- [x] 2.2 Resolver (`resolve-award-nominees.ts --award mercury-prize`), revisar ambiguos y no encontrados, y fijarlos a mano; cargar en la base de prueba y comprobar la página de cada año

## 3. Datos: Brit Awards (2021–2026)

- [x] 3.1 `data/awards/brit-awards/categories.json` (general y actos por género con los campos existentes, con `predecessor` en las categorías renombradas) y `ceremonies/2021…2026.json`, contrastados con el artículo de cada ceremonia
- [x] 3.2 Resolver, revisar y cargar; comprobar las categorías renombradas y la historia de una categoría con predecesora

## 4. Datos: Latin Grammy (2021–2025)

- [x] 4.1 `data/awards/latin-grammy/categories.json` (general, álbum por género y canciones y grabaciones por campo, con los campos nuevos y `predecessor` donde corresponda)
- [x] 4.2 `ceremonies/2021…2025.json` (22.ª a 26.ª edición, a verificar) contrastados con el artículo de cada ceremonia: nominados y ganador de cada categoría
- [x] 4.3 Resolver (en tandas por año), revisar ambiguos y no encontrados, y cargar; medir el porcentaje de resolución exacta

## 5. Datos: Premio Lo Nuestro (2021–2026)

- [x] 5.1 `data/awards/lo-nuestro/categories.json` (general, álbum por género y artistas y canciones por campo) y `ceremonies/2021…2026.json` (33.ª a 38.ª edición, a verificar), contrastados con el artículo de cada ceremonia
- [x] 5.2 Resolver (en tandas por año), revisar y cargar; comprobar las categorías de colaboración (varios artistas)

## 6. Verificación y documentación

- [ ] 6.1 La prueba de validación de archivos (CI) pasa con los cuatro premios; `load-awards.ts` carga en la base de prueba y una segunda corrida no cambia filas
- [ ] 6.2 Ampliar `scripts/smoke-test-music-awards.ts` con la lectura de la ceremonia más reciente por premio (varios premios sintéticos) y con `voting` y `source_url` (cargados, idempotentes, `CHECK`); aplicar `0073` y correrlo contra la base de prueba
- [ ] 6.3 Verificar en el navegador a 1280 y 375 px: Explorar con cinco tarjetas, `/awards` (hub), una ceremonia de cada premio (la de Mercury con una sola categoría), las migas de pan y la historia de una categoría con predecesora; sin scroll horizontal
- [ ] 6.4 `docs/05-features/awards.md` (premios cubiertos, años y alcance de cada uno, campos nuevos, fuente y tipo de votación, 2026 pendientes de Latin Grammy y Mercury) y ADR 0043 con los criterios para sumar un premio
- [ ] 6.5 `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build`; `openspec validate --specs --strict`
