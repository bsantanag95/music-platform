## Why

Los premios ya cubren las ceremonias de seis premios, pero falta la otra mitad de la "actualidad" musical: los **salones
de la fama**, que cada año incorporan grabaciones o artistas por su valor histórico. El Grammy Hall of Fame es el que
mejor encaja con el catálogo: sus ingresados son álbumes y canciones (no personas) con más de 25 años, así que casi
cada entrada enlaza con una ficha existente y, más adelante, puede convertirse en insignia ("Grammy Hall of Fame · 2026")
en las fichas de álbum y canción. No cabe en el modelo de premios tal como está: no hay nominados ni competencia, solo una
clase anual de unas 14 grabaciones (11 álbumes y 3 canciones en 2026), y el ADR 0043 dejó fuera los reconocimientos
honoríficos.

## Goals

- Cubrir el **Grammy Hall of Fame** con las **últimas 5 clases cerradas** (2020, 2021, 2024, 2025 y 2026; el salón no tuvo clases en 2022 ni 2023),
  enlazado al catálogo.
- Hacerlo como un **tipo de premio** (`hall_of_fame`) dentro del modelo y la curaduría existentes, para que sumar otro
  salón (Rock and Roll Hall of Fame, Songwriters, Country…) sea una carpeta de datos y no código nuevo.
- Una sección **"Salón de la Fama"** en Explorar, justo debajo de Premios, con la última clase y su carátula.
- Que una clase del Hall of Fame **no cuente como premio ganado** en los rankings, los ganadores recientes ni el
  puntaje de destacados del catálogo.

## Non-Goals

- Otros salones de la fama: el modelo los admite, se agregan después.
- Insignia de ingresado en las fichas de álbum, canción y artista, y la comparación con la comunidad: cambio posterior.
- Clases anteriores a 2020 ni la lista completa de ~1.180 grabaciones del salón.
- Clases aún no celebradas: el modelo sigue admitiendo solo ceremonias cerradas.
- Género de cada grabación: el comunicado oficial no lo trae; no se inventa.
- Copiar descripciones ni textos del sitio de la Academia: solo los hechos (título, artista, formato, año de la clase).

## What Changes

- **Esquema (migración `0074`):** `award.kind` (`competition` por omisión | `hall_of_fame`), `award_ceremony.edition`
  pasa a admitir `NULL` (las clases de un salón no tienen número) y `held_on` puede ser del año de la ceremonia o del
  anterior (la clase 2021 se anunció el 21 de diciembre de 2020). Espejo en `schema.ts` y `sql-model.md`.
- **Curaduría:** el archivo de categorías declara `kind`; para un salón no se exige número de edición, no rige el mínimo
  de nominados de las listas completas y toda entrada es una incorporación (`won: true`) salvo nominados que no entraron.
  El cargador escribe `kind` y la edición nula.
- **Datos:** `data/awards/grammy-hall-of-fame/` con las cinco clases 2020, 2021, 2024, 2025 y 2026 (91 incorporaciones;
  categorías "Álbumes" y "Canciones", estas ancladas a su disco), tomadas de los comunicados oficiales de la Academia y
  contrastadas con Wikipedia.
- **Lectura:** los consumidores de nominaciones distinguen el tipo. Los premios competitivos (tarjetas, ganadores
  recientes, más premiados, tu relación) y los dos puntajes de destacados excluyen los salones de la fama.
- **Páginas:** la ceremonia de un salón se presenta como "Clase de 2026" (sin edición, "Ingresó" en vez de "Ganador",
  sin bloque de nominados ni historia de categoría). El hub `/awards` suma un bloque "Salones de la fama" bajo los
  premios.
- **Explorar:** nueva sección "Salón de la Fama" tras Premios (riel con las grabaciones de la última clase y enlace a
  todas las clases) y su entrada en la navegación rápida.
- **ADR 0044** (salones de la fama como tipo de premio; enmienda el criterio de honoríficos del ADR 0043), smoke test y
  documentación.

## Capabilities

### New Capabilities
<!-- ninguna: se extiende music-awards -->

### Modified Capabilities
- `music-awards`: se añaden los salones de la fama como tipo de premio, la cobertura del Grammy Hall of Fame y su
  exclusión de los rankings; "Premios cubiertos" deja de excluir los reconocimientos honoríficos que son un salón.
- `album-discovery`: `/explore` suma la sección "Salón de la Fama" tras Premios y la navegación rápida su enlace.

## Impact

- Esquema: migración `0074` + `src/db/schema.ts` + `docs/03-data/sql-model.md`.
- Código: `src/services/awards/{curation-schema,load,read}.ts`, `src/services/discovery/{discovery.ts,
  collections/signal.ts}`, páginas y componentes de `src/components/awards/` y `src/app/[locale]/(catalog)/awards/`,
  `explore/page.tsx`, `ExploreJumpNav`, `messages/{es,en}/{awards,catalog}.json`.
- Datos: `data/awards/grammy-hall-of-fame/` (curaduría manual, con revisión humana).
- Docs: `docs/05-features/awards.md`, `explore.md`, `domain-model.md`, `business-rules.md`, `sql-model.md`,
  ADR 0044, `AGENTS.md` (smoke test).
- Sin dependencias nuevas ni cambios de contratos REST.
