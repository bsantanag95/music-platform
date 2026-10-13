## 1. Derivación de títulos

- [ ] 1.1 Catálogo `explore.collectionTitles` en `messages/{es,en}/catalog.json` (una plantilla por clave, con `{month}`, `{year}`, `{family}`, `{award}`, `{quarter}`) y prueba de paridad de claves entre idiomas
- [ ] 1.2 `collections/titles.ts`: `collectionTitle(templateKey, periodKey, locale, fallback)` puro, con mes por `Intl`, nombres de familia por idioma y respaldo ante plantilla desconocida o período ilegible
- [ ] 1.3 Pruebas unitarias de `collectionTitle` (cada plantilla en es y en, año en los períodos, semana ISO con familia, premio, respaldo, período ilegible)
- [ ] 1.4 `localizedTitlesFor(listIds, locale)`: mapa `id → título` solo para filas `template` (una consulta por lote); prueba

## 2. Lecturas y superficies

- [ ] 2.1 `discovery.ts`: `enrichFeatured`, `listCollectionsHub` y `listCollectionArchive` reciben `locale` y devuelven `title` localizado y `storedTitle`
- [ ] 2.2 Páginas `/explore` y `/explore/collections` pasan el locale; pruebas actualizadas
- [ ] 2.3 Panel de la consola: `listFeaturedAdmin(locale)` y `FeaturedPanel` muestran el título localizado; contrato en `contracts.md`
- [ ] 2.4 Lista de guardadas y pestaña de listas del perfil de la cuenta curadora: título localizado y enlace a la ruta de colecciones; el perfil deja de listar las generadas
- [ ] 2.5 Las colecciones curadas conservan su título y su enlace a la ruta de lista

## 3. Ruta de detalle

- [ ] 3.1 `catalog-links.ts`: `collectionSegment` / `collectionHref(title, id)`; `catalog-route.ts`: tipo `collection` con base `explore/collections`; pruebas
- [ ] 3.2 `getCollectionDetail(listId)`: la lista debe ser una colección generada, pública y visible; pruebas
- [ ] 3.3 Página `/explore/collections/[segment]`: detalle con título localizado, canonicalización 308 y `404` en los demás casos; `ListDetailHeader` con `ownerLabel`
- [ ] 3.4 `users/[username]/lists/[listId]`: `permanentRedirect` a la ruta de colecciones si la lista es una colección generada; prueba
- [ ] 3.5 `CollectionRail`: enlaces por origen (generadas → ruta de colecciones, curadas → ruta de lista); pruebas de componente

## 4. Documentación y verificación

- [ ] 4.1 Ampliar `smoke-test-explore-collections.ts`: títulos es/en de colecciones reales, detalle, redirect desde la ruta de usuario, guardadas y perfil de `@exploracion`
- [ ] 4.2 ADR 0037 (reemplaza la cláusula de títulos en español del ADR 0035), `explore.md`, `contracts.md`, `AGENTS.md`
- [ ] 4.3 `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build`; smoke contra BD de scratch
