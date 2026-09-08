## Why

La dirección `redefine-content-hierarchy` (D7 / Q4) pide una **superficie de descubrimiento
de álbumes** — la pieza que hoy falta y que hace del álbum "la unidad cultural del
producto": el catálogo solo se alcanza por búsqueda de texto, no hay ninguna experiencia
editorial que responda *"¿qué obras debería conocer?"*. Es la última pieza de la **Fase 0**
(después de `canonicalize-release-group` y `add-album-review`, ambos archivados).

El descubrimiento tiene arranque en frío: los rieles por señal social ("mejor valorados",
"más reseñados") necesitan masa crítica. La solución de D7 es sembrar contenido con tres
fuentes — curaduría semilla (listas fijas), reglas de catálogo (activadas cuando hay
datos) y curaduría editorial mínima — **sin que la curaduría se vuelva una dependencia
operativa diaria**.

## What Changes

- **Ruta pública `/[locale]/explore`** (no `/albums` — es un contenedor conceptual de
  descubrimiento, D7/OQ3), servida en el grupo `(catalog)`. En Fase 1 abre directamente
  en una experiencia de **álbumes**; artistas, canciones y listas quedan como pestañas
  futuras que **no** están en este cambio. Accesible con o sin sesión.
- **Usuario curador** (opción A): la cuenta `app_user` `exploracion` (sembrada, sin
  `password_hash`, perfil público, `display_name` "Exploración"). Sus listas públicas de
  álbumes son el contenido editorial. Se crean/actualizan con un script
  (`scripts/seed-discovery.ts`), nunca por una UI de administración.
- **Tabla nueva `user_list_featured (list_id, rank)`** — marca y ordena las colecciones
  destacadas de `/explore`. **Solo una señal de distribución**: `user_list` **no se toca**
  (así el trigger que bumpea `user_list.updated_at` y dispara eventos de feed nunca se
  activa — mismo motivo por el que `user_list_pin` es una tabla aparte). Presencia de fila
  = destacada; `rank` NOT NULL, **UNIQUE**, `> 0`. Fuera de `/explore`, la lista se
  comporta **exactamente** como cualquier lista pública (aparece en "Descubrir", se puede
  guardar/seguir, etc.).
- **Secciones de `/explore` (álbumes)**:
  - **Colecciones destacadas** — listas del curador con fila en `user_list_featured`,
    ordenadas por `rank`. Es el ancla anti-arranque-en-frío: siempre hay contenido.
  - **Novedades** — release-groups `studio`/`single_ep` por `first_release_year` reciente.
  - **Explorar por década** — navegación por décadas (1960s–2020s) derivada de
    `first_release_year`; cada una abre un listado filtrado.
  - **Explorar por género** — top de géneros por frecuencia desde `release_group_tag`;
    cada uno abre un listado filtrado.
  - **Mejor valorados de la comunidad** y **Más reseñados** — rieles por reglas sobre
    `rating` / `review`, con **degradación grácil** y dos umbrales nombrados distinto:
    `MIN_RATINGS_PER_ALBUM` / `MIN_REVIEWS_PER_ALBUM` (elegibilidad del álbum) y
    `MIN_ALBUMS_FOR_SECTION` (visibilidad del riel — se **omite** si no llega). No hay
    tabla materializada (cálculo bajo demanda, mismo criterio que `taste-fingerprint`).
- **Listados filtrados por década o género** dentro de `/explore` (`?decada=` / `?genero=`,
  uno a la vez en Fase 1): grilla paginada de álbumes, orden determinista (por valoración
  cuando hay datos, si no por año).
- **Navegación global**: enlace a `/explore` en el Header (visible con y sin sesión) y en
  el grupo "Explorar" del footer. Un flag de configuración controla la aparición del
  enlace hasta que haya suficiente contenido semilla.
- **Migración `0018`**: `CREATE TABLE user_list_featured (list_id PK → user_list, rank
  SMALLINT NOT NULL UNIQUE CHECK > 0, created_at)`. Espejo en `src/db/schema.ts`.
  `user_list` no se toca.

### Non-Goals

- Pestañas de artistas / canciones / listas en `/explore` (Fase 2+).
- Personalización o recomendación por afinidad — el descubrimiento es editorial y por
  reglas, nunca algorítmico-personalizado (mismo principio que `list-discovery`).
- UI de administración / curaduría en la app: el contenido editorial se siembra por
  script.
- Combinar filtros (década + género a la vez).
- "Seguir artista", reorganización del perfil, tiers del feed (cambios posteriores de
  `redefine-content-hierarchy`).
- Tablas materializadas o jobs periódicos para los rieles por reglas.

## Capabilities

### New Capabilities

- `album-discovery`: la superficie `/explore` centrada en álbumes — sus secciones
  (colecciones destacadas, novedades, por década, por género, rieles por reglas con
  degradación grácil), los listados filtrados por década/género, el acceso desde la
  navegación global tras el flag de configuración, y la cuenta curadora como fuente del
  contenido editorial.

### Modified Capabilities

- `lists`: se añade `user_list_featured` como señal de distribución (destacada + orden)
  para superficies que consuman curaduría; una lista con esa fila sigue siendo una lista
  pública normal en todas las demás superficies (propia, ajena, "Descubrir",
  guardar/seguir, feed, home) y `user_list` no se modifica.

## Impact

- **Migración SQL nueva** (`0018_user_list_featured.sql`): `CREATE TABLE user_list_featured`
  (FK `ON DELETE CASCADE` a `user_list`, `rank` NOT NULL UNIQUE CHECK > 0). Espejo en
  `src/db/schema.ts` (`userListFeatured`). `user_list` sin cambios.
- **Servicio nuevo**: `src/services/discovery/` — read-models de `/explore` (colecciones
  destacadas, novedades, décadas, géneros, mejor valorados, más reseñados) y de los
  listados filtrados. Reutiliza `enrichLists`, `findOrResolveCover`, `release_group_tag`.
- **API nueva** (opcional para carga progresiva): `GET /api/discovery/*` bajo demanda; o
  todo server-render si alcanza. Schemas Zod en `src/lib/api/schemas.ts`.
- **UI nueva**: `src/app/[locale]/(catalog)/explore/page.tsx` + componentes en
  `src/components/discovery/`; reutiliza `AlbumCard` / `AlbumGrid` / `LazyCoverImage`.
- **Navegación**: `src/components/layout/Header.tsx` (enlace `/explore` para todos) y
  `src/components/layout/Footer.tsx` (grupo "Explorar").
- **Config**: flag (`EXPLORE_ENABLED` o equivalente) leído server-side para gatear el
  enlace de navegación y, si está apagado, redirigir la ruta a Inicio.
- **Script nuevo**: `scripts/seed-discovery.ts` — upsert de la cuenta curadora y de sus
  listas destacadas, resolviendo álbumes por `mbid` y saltando los que no estén en el
  catálogo local con un aviso.
- **i18n**: namespace nuevo o `catalog.explore` (es/en) para títulos de sección, décadas,
  estados vacíos.
- **Docs**: `docs/04-api/contracts.md` (si hay endpoints), `docs/03-data/sql-model.md`
  (`user_list_featured`, cuenta curadora), y una nota de operación sobre
  `scripts/seed-discovery.ts` y el flag.
- **Sin cambios** en búsqueda, ratings, reseñas, favoritos ni feed.
- **Consecuencia aceptada** (OQ1 resuelta): las listas del curador también aparecen en la
  pestaña "Descubrir" de `/me/lists` y en "Listas públicas recientes" de Inicio — son
  listas públicas legítimas y **no se excluyen**. Único cuidado: no duplicarlas
  visualmente dentro del mismo viewport de `/explore` (composición, no read-model).
