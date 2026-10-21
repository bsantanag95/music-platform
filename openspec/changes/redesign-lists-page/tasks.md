## 1. Fase 1 · Datos y enlaces de colecciones generadas

- [x] 1.1 `DiscoverListSummary` (schema y servicio) suma `generated` opcional, resuelto con `generatedRefsFor` en `listDiscoverLists`, `listPopularLists` y `listsFromFollowing` (D2)
- [x] 1.2 `listDiscoverLists`: excluir colecciones generadas siempre que no haya `q`, también con `sort` o `entityType` (D3)
- [x] 1.3 `CommunityListCard`: con `generated`, enlazar con `collectionHref` y mostrar el título localizado (mismo helper que `SavedListsTab`)
- [x] 1.4 Tests: servicio (`generated` en las tres fuentes, exclusión según `q`/`sort`/`type`), tarjeta (enlace directo y título en `en`)

## 2. Fase 1 · Tarjeta, mosaico, toolbar y copia

- [x] 2.1 `ListCard`: la insignia en su propia línea sobre el título; título con `line-clamp-2` en vez de `truncate` (D1)
- [x] 2.2 `ListCoverMosaic`: tres imágenes en 2×2 con una cuarta celda neutra ("+N" o el tipo), sin recortes (D5)
- [x] 2.3 `SaveListButton` compacto: área táctil de 44px en móvil sin agrandar el ícono
- [x] 2.4 Orden `popular` etiquetado "Más guardadas" / "Most saved"; en la vitrina el control dice "Ordenar" sin valor (D4)
- [x] 2.5 `CommunityExploreGrid`: rótulo "N listas · <orden>" con "Limpiar filtros" (D4)
- [x] 2.6 Copia: "por <nombre>" también en `CaminoDiscoveryGrid` dentro de `/lists`; "N personas la están completando"
- [x] 2.7 Tests: `ListCard` (insignia y título), `ListCoverMosaic` (1, 2, 3 y 4 imágenes), toolbar (etiqueta, "Ordenar"), grilla (rótulo)

## 3. Fase 2 · Estantería, portada y chips

- [ ] 3.1 `CommunityListCard` / `ListCard` con `layout="shelf"`: mosaico arriba a todo el ancho, título, meta y dueño debajo, Guardar flotante de 44px (D6)
- [ ] 3.2 Imágenes de artistas en círculo dentro de su celda del mosaico (solo listas de artistas)
- [ ] 3.3 `ListsGrid`: 2 columnas en móvil, 3 en `sm`, 4 en `lg`, 5 en `xl` para la estantería
- [ ] 3.4 De la gente que sigues, Populares, Recientes y explorar usan la estantería
- [ ] 3.5 Destacada única como portada: mosaico de 160px, descripción, tira de primeras imágenes y nombres (`previewNames` en el resumen de destacadas) (D7)
- [ ] 3.6 Chips de tipo en lugar del select, con `aria-pressed`; el orden como control compacto (D8)
- [ ] 3.7 Tests: estantería (estructura, botón de 44px), portada (tira y nombres), chips (URL y estado)

## 4. Fase 3 · Riel y estado vacío

- [ ] 4.1 `page.tsx`: en la vitrina, grilla `[minmax(0,1fr)_280px]` desde `lg` con el riel `sticky`; por debajo, el riel tras las secciones; sin riel en explorar (D9)
- [ ] 4.2 Módulo "Tus listas" con `getMostRecentEditedList` y accesos a `/me/lists` y guardadas; sin listas, invitación a crear la primera
- [ ] 4.3 "Para completar" pasa al riel como módulo compacto (hasta 4, "Ver todas"); se quita la sección de la vitrina
- [ ] 4.4 Sin sesión: tarjeta para crear una cuenta en el riel, en lugar de la línea "Inicia sesión para…"
- [ ] 4.5 Estado vacío global con acción (D10)
- [ ] 4.6 Tests: página (riel con y sin sesión, ausente en explorar, sin "Para completar" en la vitrina), módulos del riel

## 5. Documentación

- [x] 5.1 `docs/04-api/contracts.md`: `generated` en los resúmenes de `/api/lists/{discover,popular,from-following}` y la regla de colecciones generadas solo con `q`
- [ ] 5.2 `docs/05-features/lists-and-favorites.md`: superficie `/lists` (estantería, chips, rótulo, riel, "Más guardadas")
- [ ] 5.3 `docs/05-features/caminos.md`: "Para completar" en el riel de `/lists`, con tope de 4

## 6. Verificación

- [ ] 6.1 `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build`
- [ ] 6.2 Navegador a 375px y 1366px, con y sin sesión, vitrina y explorar, `es` y `en`: título de la destacada completo, enlaces de colecciones sin redirección, `?sort=popular` sin colecciones generadas, carátulas de al menos 60px en móvil, riel
- [ ] 6.3 Regresión de `ListCard` y `ListCoverMosaic` en `/me/lists`, un perfil con listas, "Retoma una lista" de Inicio y el detalle de una colección
