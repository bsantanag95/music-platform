## 1. Servicio

- [x] 1.1 Añadir a `featuredRailCondition()` la exigencia de al menos un álbum (`exists` sobre `user_list_item`) y la misma condición a `listCollectionArchive`; pruebas de que una colección vacía no entra en riel, hub ni archivo
- [x] 1.2 `listCollectionFamilies()`: familias con al menos una colección vigente o archivada (mismas condiciones que las listas), con prueba
- [x] 1.3 `listCollectionSummaries(collections)`: un lote de álbumes por colección y un presentador por colección en paralelo, devolviendo solo el resumen como mensaje; aislar el fallo de cada una, tope `HUB_SUMMARY_LIMIT` (24) en `constants.ts`, con pruebas (lote único, fallo aislado, curada sin resumen, tope)
- [x] 1.4 La consola editorial muestra el estado `empty` ("Fuera del riel: sin álbumes") para una colección vigente sin álbumes, en vez de "Fuera del tope": `FeaturedStatus` (servicio y esquema), mensajes es/en y `contracts.md`
- [x] 1.5 `/lists` → Destacadas excluye toda lista con fila en `user_list_featured` (`notFeaturedCollectionCondition`): la especificación `community-lists` ya lo exigía, pero la consulta solo lo cumplía por accidente con las curadas vacías; prueba y smoke

## 2. Componentes

- [x] 2.1 `CollectionSleeves`: la pila `card` a 5 fundas, `size-20` sin crecer en `lg`, paso de 36 px y de 44 px con el mouse encima; el escenario con `overflow-hidden`
- [x] 2.2 `CollectionRail`: línea de contexto opcional bajo el título (`contextFor`), una sola línea; sin ella la tarjeta no cambia
- [x] 2.3 `FeaturedCollection` (nuevo, en `components/discovery`): la destacada con pila `hero`, sello, título, frase, conteo y enlace; apilada bajo `lg`; con prueba de render
- [x] 2.4 `CollectionFamilyFilter` (nuevo): chips "Todas" + familias con contenido, omitida con una sola familia, `aria-current` en el activo, conserva `pagina` fuera del cambio de filtro; con prueba

## 3. Página

- [x] 3.1 Recomponer `explore/collections/page.tsx`: cabecera con la frase y el enlace a Listas, barra de filtro, vigentes (destacada + rejilla única, sin destacada con filtro, sin rejilla con una sola) y archivo
- [x] 3.2 Archivo en tarjetas densas (6 por fila), omitido sin contenido y sin filtro; con filtro y sin resultados, mensaje y enlace a "Todas"; la paginación conserva `familia`
- [x] 3.3 Ajustar `explore-collections-pages.test.tsx` y `discovery-sections.test.tsx` al nuevo diseño (destacada, rejilla, filtro compartido, archivo vacío)

## 4. Mensajes

- [x] 4.1 `catalog.explore.collectionsHub` (es/en): descripción nueva con el enlace a Listas, textos del filtro y de la destacada, `archiveEmptyFamily` con la salida a "Todas"; eliminar `currentDescription` si ya no se usa
- [x] 4.2 `collectionFamilies.rankings`: "Más valorados" / "Top rated"; revisar que el sello y el chip no desborden

## 5. Humo, verificación y documentación

- [x] 5.1 Ampliar `scripts/smoke-test-explore-collections.ts`: una colección vacía no se lista en riel, hub ni archivo; familias con contenido; los resúmenes se calculan sin una consulta por álbum
- [x] 5.2 Verificar en el navegador a 1280, 768 y 375 px: destacada, rejilla, filtro, archivo, pila dentro del marco con y sin hover; captura del antes y el después
- [x] 5.3 ADR 0040 (página de colecciones: destacada, filtro único y resúmenes por presentador), `docs/05-features/explore.md`, nota en `AGENTS.md` del smoke
- [x] 5.4 `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build`; `openspec validate --specs --strict`
