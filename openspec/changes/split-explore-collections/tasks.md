## 1. Familias y lecturas por grupo

- [ ] 1.1 `collections/families.ts`: `CollectionFamily`, `COLLECTION_FAMILIES` por clave de plantilla, respaldo `discovery`; prueba de que toda plantilla del registro tiene familia
- [ ] 1.2 Constantes `EDITORIAL_RAIL_LIMIT` y `AUTOMATIC_RAIL_LIMIT` (6); `FeaturedCollection` gana `family` y `source`
- [ ] 1.3 `discovery.ts`: `listEditorialCollections()` y `listAutomaticCollections()` (misma condición de riel, filtradas por `source`, tope y orden propios); `listFeaturedCollections()` conserva su comportamiento mezclado para la Inicio anónima
- [ ] 1.4 `listCollectionsHub()`: curadas vigentes (máx. 48) y automáticas vigentes por familia
- [ ] 1.5 `listCollectionArchive({ family?, page })`: automáticas vencidas, públicas y visibles, por vencimiento descendente, 24 por página, familia de respaldo para claves retiradas
- [ ] 1.6 Pruebas unitarias de las lecturas (separación por origen, topes independientes, vencidas fuera de los riles, archivo, filtro y paginación)

## 2. Portada de Explorar

- [ ] 2.1 Extraer la tarjeta de `CollectionRail` a un componente compartido con etiqueta de familia opcional
- [ ] 2.2 `/explore`: dos riles (Selección editorial y Descubre por datos) con "Ver todas →"; el editorial se omite sin contenido
- [ ] 2.3 `ExploreJumpNav` y mensajes `messages/{es,en}`: ambos riles y etiquetas de familia
- [ ] 2.4 Pruebas de componente y de la página (riles por separado, rail editorial oculto, enlaces)

## 3. Página de colecciones

- [ ] 3.1 Ruta localizada `/explore/colecciones` (Server Component, mismo interruptor de Explorar, breadcrumbs, metadatos)
- [ ] 3.2 Bloques: selección editorial, automáticas por familia y archivo con `?familia=` y `?pagina=`; estados sin contenido omitidos
- [ ] 3.3 Mensajes `messages/{es,en}` y pruebas de la página

## 4. Consola y Listas

- [ ] 4.1 `featured.ts`: `railListIds(group)`, estado "dentro del tope" por grupo y `reorderFeatured(actor, group, listIds)` con conflicto por grupo
- [ ] 4.2 `GET /featured` expone `group` y `PUT /featured/order` exige `group`; esquemas Zod, rutas y pruebas
- [ ] 4.3 `FeaturedPanel`: dos grupos con orden independiente; pruebas del componente
- [ ] 4.4 `lists/community.ts`: "Destacadas" excluye `source='template'`; prueba

## 5. Documentación y verificación

- [ ] 5.1 Ampliar `smoke-test-explore-collections.ts`: riles por separado, orden por grupo sin afectar al otro, archivo, `/lists` sin automáticas
- [ ] 5.2 ADR 0036, `explore.md`, `contracts.md` (`featured` y `featured/order`), `AGENTS.md`
- [ ] 5.3 `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build`; smoke contra BD de scratch
