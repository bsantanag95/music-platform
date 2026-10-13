## 1. Derivación de títulos

- [x] 1.1 Catálogo de títulos por idioma (una plantilla por clave, con `{month}`, `{year}`, `{family}`, `{award}`, `{quarter}`) en `collections/titles.ts` y prueba de paridad entre idiomas y con `messages/{es,en}/catalog.json`
- [x] 1.2 `collections/titles.ts`: `collectionTitle(templateKey, periodKey, locale, fallback)` puro, con mes por `Intl`, nombres de familia por idioma y respaldo ante plantilla desconocida o período ilegible
- [x] 1.3 Pruebas unitarias de `collectionTitle` (cada plantilla en es y en, año en los períodos, semana ISO con familia, premio, respaldo, período ilegible)
- [x] 1.4 `generatedRefsFor(listIds)` y `findGeneratedCollection(id)`: plantilla y período de las listas que son colecciones generadas (una consulta por lote); pruebas

## 2. Lecturas y superficies

- [x] 2.1 `discovery.ts`: las colecciones devuelven `templateKey` y `periodKey` (nulos en las curadas); el título se localiza en la presentación con el idioma de quien mira
- [x] 2.2 `CollectionRail` muestra el título localizado y enlaza por origen; `presentList` para los listados por API; pruebas actualizadas
- [x] 2.3 Panel de la consola: `FeaturedPanel` y `TemplatesPanel` muestran el título localizado; contrato en `contracts.md`
- [x] 2.4 Lista de guardadas y pestaña de listas del perfil de la cuenta curadora: título localizado y enlace a la ruta de colecciones; el perfil deja de listar las generadas
- [x] 2.5 Las colecciones curadas conservan su título y su enlace a la ruta de lista

## 3. Ruta de detalle

- [x] 3.1 `catalog-links.ts`: `collectionSegment` / `collectionHref(title, id)`; `catalog-route.ts`: tipo `collection` con base `explore/collections`; pruebas
- [x] 3.2 `getCollectionDetail(listId)`: la lista debe ser una colección generada, pública y visible; pruebas
- [x] 3.3 Página `/explore/collections/[segment]`: detalle con título localizado, canonicalización 308 y `404` en los demás casos; `ListDetailHeader` con `ownerLabel`
- [x] 3.4 `users/[username]/lists/[listId]`: `permanentRedirect` a la ruta de colecciones si la lista es una colección generada; prueba
- [x] 3.5 `CollectionRail`: enlaces por origen (generadas → ruta de colecciones, curadas → ruta de lista); pruebas de componente

## 4. Documentación y verificación

- [x] 4.1 Ampliar `smoke-test-explore-collections.ts`: títulos es/en de colecciones reales, detalle, redirect desde la ruta de usuario, guardadas y perfil de `@exploracion`
- [x] 4.2 ADR 0037 (reemplaza la cláusula de títulos en español del ADR 0035), `explore.md`, `contracts.md`, `AGENTS.md`
- [x] 4.3 `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build`; smoke contra BD de scratch
