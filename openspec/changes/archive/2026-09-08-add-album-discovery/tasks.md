## 1. Migración y schema

- [x] 1.1 `drizzle/0018_user_list_featured.sql`: `CREATE TABLE user_list_featured (list_id UUID PRIMARY KEY REFERENCES user_list(id) ON DELETE CASCADE, rank SMALLINT NOT NULL UNIQUE CHECK (rank > 0), created_at TIMESTAMPTZ NOT NULL DEFAULT now())`. `user_list` no se toca
- [x] 1.2 Espejo en `src/db/schema.ts` (`userListFeatured` pgTable + `UserListFeaturedRow` type) con comentario de sincronización (por qué tabla aparte: trigger de `user_list.updated_at` → feed); correr la migración en local y verificar `\d user_list_featured`

## 2. Servicios de descubrimiento

- [x] 2.1 Crear `src/services/discovery/` con constantes: `MIN_RATINGS_PER_ALBUM` (=3), `MIN_REVIEWS_PER_ALBUM` (=1), `MIN_ALBUMS_FOR_SECTION` (=6), tamaños de riel; helpers de década/género
- [x] 2.2 `listFeaturedCollections()`: `user_list JOIN user_list_featured` (solo `audience='public'`), ordenadas por `rank` asc; reutiliza `enrichLists` para conteo y carátulas
- [x] 2.3 `listNewReleases(limit)`: release-groups `studio`/`single_ep` por `first_release_year` desc, excluyendo año nulo
- [x] 2.4 `listDecades()`: décadas presentes en `first_release_year` con conteo; `listGenres(topN)`: top de `release_group_tag` por conteo
- [x] 2.5 `listTopRated(limit)` y `listMostReviewed(limit)`: agregación `GROUP BY release_group_id` con `HAVING count >= MIN_*_PER_ALBUM`; devuelven `[]` si hay `< MIN_ALBUMS_FOR_SECTION` elegibles (el consumidor omite el riel)
- [x] 2.6 `listAlbumsByDecade(decade, page)` y `listAlbumsByGenre(genre, page)`: grilla paginada, orden determinista (valoración agregada si ≥ `MIN_RATINGS_PER_ALBUM` → `first_release_year` desc → `id`)
- [x] 2.7 `getExplorePage()`: compone las secciones de portada (sin paginar) en una sola llamada para el Server Component
- [x] 2.8 Tests de servicio: featured ordenado por `rank`, riel por reglas oculto con `< MIN_ALBUMS_FOR_SECTION` elegibles y visible al alcanzarlo, álbum con pocas señales no elegible (`< MIN_RATINGS_PER_ALBUM`), década excluye año nulo, un solo corte a la vez, determinismo del orden

## 3. Config y flag

- [x] 3.1 Leer `EXPLORE_ENABLED` server-side (helper en `src/lib/config` o equivalente); documentar la variable en `.env.example` / docs
- [x] 3.2 Helper `isExploreEnabled()` reutilizable por la ruta y por Header/Footer

## 4. Ruta y UI

- [x] 4.1 `src/app/[locale]/(catalog)/explore/page.tsx`: Server Component; si `!isExploreEnabled()` → `redirect` a Inicio; si hay `?decada=`/`?genero=` renderiza el listado filtrado, si no la portada
- [x] 4.2 Componentes en `src/components/discovery/`: riel de colecciones (tarjeta de lista → detalle), riel de novedades, chips de década, chips de género, riel genérico de álbumes (reutiliza `AlbumCard`)
- [x] 4.3 Listado filtrado: grilla `AlbumGrid`/`AlbumCard` + "cargar más" (OQ5: server-side o `GET /api/discovery/albums`)
- [x] 4.4 i18n (`catalog.explore`, es/en): títulos de sección, etiquetas de década ("Años 90"), estados, encabezado de la vista filtrada
- [x] 4.5 Enlace a `/explore` en `src/components/layout/Header.tsx` (visible con y sin sesión, junto al buscador) gateado por `isExploreEnabled()`
- [x] 4.6 Enlace a `/explore` en el grupo "Explorar" de `src/components/layout/Footer.tsx`, gateado por `isExploreEnabled()`
- [x] 4.7 Verificación en el navegador: portada con y sin sesión, riel por reglas oculto, década, género, flag apagado redirige, cambio de locale

## 5. API (solo si la paginación del listado filtrado la necesita)

- [~] 5.1 (no necesario: paginación server-side prev/next, sin endpoint) `GET /api/discovery/albums?decada=|genero=&page=&pageSize=` con Zod (`DiscoveryAlbumsResponseSchema`), público
- [~] 5.2 (no necesario) Fetcher en `src/lib/api/` + tests de ruta (paginación inválida, corte ausente, un solo corte)

## 6. Cuenta curadora y seed

- [x] 6.1 `scripts/seed-discovery.ts`: upsert de `app_user` curador (`username='exploracion'`, `display_name='Exploración'`, `password_hash` NULL, perfil público); idempotente
- [x] 6.2 Definición de colecciones iniciales en el script (título, `rank` único y positivo, lista de `mbid` de álbum): p. ej. "Esenciales", "Un disco por década", "Discos que definieron un género"
- [x] 6.3 Resolución de ítems por `mbid` contra el catálogo local; `INSERT ... ON CONFLICT DO NOTHING`; aviso por los que falten; upsert de la fila `user_list_featured (list_id, rank)` (nunca `UPDATE` sobre `user_list`)
- [x] 6.4 Test / dry-run del script: segunda ejecución no duplica; ítem inexistente se omite con aviso
- [x] 6.5 Verificar que los flujos de login/registro no tocan la cuenta curadora (no tiene credenciales ni `auth_identity`)

## 7. Docs

- [x] 7.1 `docs/03-data/sql-model.md`: `user_list_featured` (por qué tabla aparte) y la cuenta curadora `exploracion`
- [x] 7.2 `docs/04-api/contracts.md`: endpoint de descubrimiento si se agrega
- [x] 7.3 Nota de operación en `docs/`: cuándo correr `scripts/seed-discovery.ts` y cuándo encender `EXPLORE_ENABLED`

## 8. Cierre

- [x] 8.1 `openspec validate add-album-discovery --strict` pasa
- [x] 8.2 `typecheck`, `lint`, `test`, `build` en verde
- [x] 8.3 Confirmar que una lista destacada sigue apareciendo normal en "Descubrir" y en las vistas de lista, y que crear su fila `user_list_featured` no bumpea `user_list.updated_at` ni genera evento de feed (sin regresión en `lists` / `list-discovery` / `activity-feed`)
- [x] 8.4 Archivar el cambio y sincronizar specs cuando esté implementado y aprobado
