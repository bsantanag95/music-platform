## 1. Esquema y familias

- [x] 1.1 Migración `drizzle/0071_collection_family.sql`: agregar `family TEXT` nullable a `user_list_featured`,
      rellenar desde el registro de plantillas para `source='template'` y con `discovery` para `source='curated'`,
      renombrar el valor `community` a `rankings`, agregar `chk_user_list_featured_family` sobre las cinco familias y
      poner `NOT NULL`
- [x] 1.2 Espejo en `src/db/schema.ts` (`userListFeatured.family`) y actualizar `docs/03-data/sql-model.md`
- [x] 1.3 `collections/families.ts`: `COLLECTION_FAMILIES` con `rankings` en lugar de `community`; `TEMPLATE_FAMILY`
      pasa a ser la familia que cada plantilla declara al escribir; retirar `familyOf` y `FALLBACK_FAMILY` de las
      lecturas (la familia ya viene en la fila) y ajustar `families.test.ts`
- [x] 1.4 Renombrar la clave de mensaje `collectionFamilies.community` a `collectionFamilies.rankings` en
      `messages/{es,en}/catalog.json`, con su texto en los dos idiomas
- [x] 1.5 `collections/generate.ts`: escribir la familia de la plantilla en la fila al crear la colección del período;
      prueba de que la fila nace con su familia

## 2. Lecturas de colecciones

- [x] 2.1 `constants.ts`: reemplazar `EDITORIAL_RAIL_LIMIT` y `AUTOMATIC_RAIL_LIMIT` por `COLLECTION_RAIL_LIMIT = 10`,
      y `HUB_EDITORIAL_LIMIT` / `HUB_AUTOMATIC_LIMIT` por `HUB_COLLECTION_LIMIT = 120`
- [x] 2.2 `discovery.ts`: `listCollections(limit)` única en lugar de `listEditorialCollections` /
      `listAutomaticCollections`; la familia sale de la fila y `FeaturedCollection.family` deja de ser nullable;
      retirar `GROUP_SOURCE` y el tipo `CollectionGroup` de las lecturas públicas
- [x] 2.3 `listCollectionsHub()` devuelve una sola secuencia vigente (no `{ editorial, automatic }`); el archivo
      conserva su consulta acotada a `source='template'`
- [x] 2.4 Actualizar `discovery-collections.test.ts`: riel mezclado, orden por peso y rank, tope 10, familia presente
      en curadas y generadas

## 3. Riel con desplazamiento horizontal

- [x] 3.1 `CollectionRail`: propiedad de disposición `grid` (actual) o `carousel`, con la tarjeta compartida; la
      etiqueta de familia pasa a mostrarse siempre que haya `familyLabel`
- [x] 3.2 Variante carrusel: contenedor con desbordamiento horizontal y anclaje, botones anterior/siguiente con
      etiqueta accesible, desactivados en los extremos y omitidos cuando todo cabe; `scrollBy` suave solo sin
      movimiento reducido
- [x] 3.3 Pruebas del carrusel: controles presentes y desactivados en los extremos, ausentes cuando cabe todo,
      etiquetas accesibles y navegación con teclado por las tarjetas

## 4. Páginas públicas

- [x] 4.1 `/explore`: un solo `CollectionRail` en carrusel con ancla `colecciones`, encabezado "Colecciones", enlace
      "Ver todas" único; retirar los dos riles y sus textos `editorialHeading` / `automaticHeading` de
      `messages/{es,en}/catalog.json`
- [x] 4.2 Navegación rápida: una entrada `colecciones`, que deja la fila en las 8 secciones que ya describe la
      capacidad; actualizar `ExploreJumpNav.test.tsx`
- [x] 4.3 `/explore/collections`: dos bloques (vigentes agrupadas por familia, incluyendo las curadas, y el archivo);
      retirar el bloque de selección editorial y sus textos
- [x] 4.4 Actualizar `explore-collections-pages.test.tsx` y `discovery-sections.test.tsx`

## 5. Consola editorial

- [x] 5.1 `featured.ts`: `reorderFeatured(actorId, ids)` sobre la secuencia completa, sin grupo; retirar `railIdsOf`
      por grupo y `GROUP_SOURCE`; conservar `FEATURED_ORDER_CONFLICT`
- [x] 5.2 `featureList` exige una familia válida y la escribe en la fila; error de validación si falta o no existe
- [x] 5.3 Ruta de reordenamiento: el cuerpo deja de recibir el grupo; esquema Zod y `docs/04-api/contracts.md` +
      `errors.md` actualizados en este cambio
- [x] 5.4 `FeaturedPanel`: selector de familia al destacar, columna de familia en las filas, estado "dentro del tope"
      contra el tope único y control de orden sobre la secuencia completa; los dos grupos siguen visibles
- [x] 5.5 Actualizar `FeaturedPanel.test.tsx` y las pruebas de `featured.ts`

## 6. Listas de la comunidad

- [x] 6.1 `src/services/lists/community.ts`: "Destacadas" deja de incluir las filas `curated` de
      `user_list_featured` y ordena las oficiales por fecha de publicación descendente
- [x] 6.2 La sección "Destacadas" de `/lists` ofrece un enlace a `/explore/collections`, con su texto en los dos
      idiomas
- [x] 6.3 Actualizar las pruebas de `/lists` y de `community.ts`

## 7. Documentación

- [x] 7.1 ADR nuevo (0038): modelo Colección / Lista y riel único; reemplaza la decisión de presentación del ADR 0036
      sin reescribirlo
- [x] 7.2 `docs/05-features/explore.md`: riel único, familia en la fila, renombre de `community` a `rankings`, orden
      único
- [x] 7.3 `docs/05-features/lists-and-favorites.md`: "Destacadas" solo con oficiales y el enlace a las colecciones
- [x] 7.4 `AGENTS.md`: lo que verifica el smoke test desde este cambio

## 8. Verificación

- [x] 8.1 Ampliar `scripts/smoke-test-explore-collections.ts`: riel único mezclado con tope 10, familia obligatoria al
      destacar, orden único sobre las dos fuentes, familia persistida por la generación, archivo sin cambios y
      `/lists` sin colecciones
- [x] 8.2 Correr el smoke test contra una base de scratch (`ALLOW_SMOKE_ON_REAL_DB=1` + `DATABASE_URL` aparte) con la
      migración `0071` aplicada
- [x] 8.3 `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build`
