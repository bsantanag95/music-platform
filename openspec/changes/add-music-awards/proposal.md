## Why

Todo lo que muestra hoy la plataforma es catálogo: álbumes, canciones, artistas, géneros. Falta la capa de
"actualidad" que sitios como Letterboxd o Backloggd aprovechan con las ceremonias de premios. Los Grammy son la
referencia obvia y sus datos enlazan directo con el catálogo (casi cada nominado es un álbum, una grabación o un
artista). No hay fuente automática confiable (ver ADR 0032), pero el volumen es acotado y anual, así que una
curaduría manual barata alcanza.

## Goals

- Modelar premios, ceremonias, categorías y nominaciones enlazados al catálogo, con cobertura explícita
  (completa o solo ganador).
- Hacer barata la curaduría: el curador escribe texto, un script resuelve los MBID por MusicBrainz y otro carga
  el JSON versionado de forma idempotente.
- Páginas de ceremonia y de historia de una categoría, y una entrada desde Explorar.
- Cubrir la ceremonia principal de los Grammy, categorías del campo general ("nivel A") y "Mejor álbum de …" por
  género ("nivel B"), en las últimas 5 ceremonias cerradas (2021–2025).

## Non-Goals

- Insignia de ganador en las fichas de álbum, canción y artista, y la comparación con la valoración de la comunidad:
  un cambio posterior, junto con los ganadores históricos del nivel A.
- Grammy Latino y otros premios: el modelo los admite, pero se agregan después.
- Ceremonias en curso (nominaciones anunciadas, ganadores pendientes): solo ceremonias cerradas.
- Categorías del nivel C (ingeniería, empaque, video, notas, etc.).
- Curaduría desde la aplicación (rol `editorial_curator`), predicciones o votos de la comunidad.
- Consultar Wikidata, Wikipedia o grammy.com de forma automática.
- Festivales.

## What Changes

- Migración `0068`: tablas `award`, `award_ceremony`, `award_category`, `award_category_edition` (cobertura por
  ceremonia) y `award_nomination` (sujeto opcional: release-group, grabación o artista; texto siempre presente).
- `data/awards/grammy/`: `categories.json` (clave estable, nivel, tipo de sujeto, nombre es/en, categoría anterior)
  y un archivo por ceremonia (`ceremonies/<año>.json`), con validación Zod.
- `scripts/resolve-award-nominees.ts`: busca los nominados sin resolver vía el cliente de MusicBrainz (las
  grabaciones, dentro de su álbum ancla) y escribe MBID, confianza y semilla en el archivo; reporta ambiguos.
- `scripts/load-awards.ts`: carga idempotente a la base, creando los stubs de catálogo que falten sin consultar
  MusicBrainz.
- Páginas `/awards`, `/awards/[award]/[year]` (ceremonia) y `/awards/[award]/categories/[key]` (historia de la
  categoría), con nombres de categoría traducidos y nominados enlazados al catálogo.
- Explorar suma una sección "Premios" con las ceremonias cubiertas.
- ADR 0032 (premios curados en JSON versionado) pasa a Aceptado.
- Smoke test `smoke-test-music-awards.ts` sobre una BD de scratch.

## Capabilities

### New Capabilities
- `music-awards`: modelo, curaduría y carga de premios, y las páginas de ceremonia, de categoría y la entrada desde
  Explorar.

### Modified Capabilities
- `album-discovery`: la portada de Explorar suma la sección "Premios".

## Impact

- Esquema: migración `0068` + espejo en `src/db/schema.ts` + `docs/03-data/sql-model.md`.
- Código nuevo: `src/services/awards/`, `src/app/[locale]/(catalog)/awards/`, componentes en
  `src/components/awards/`, scripts de resolución y carga, `messages/{es,en}/awards.json`.
- Datos: `data/awards/grammy/` (curaduría manual, revisada por una persona).
- Docs: `docs/05-features/awards.md` (nuevo), `docs/01-domain/domain-model.md`, `docs/01-domain/business-rules.md`
  (reglas de cobertura), `docs/05-features/explore.md`, `AGENTS.md` (smoke test), ADR 0032.
- Sin dependencias nuevas ni cambios de contratos REST (las páginas son Server Components; no hay endpoint nuevo).
