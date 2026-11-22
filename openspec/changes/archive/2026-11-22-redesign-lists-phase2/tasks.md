## 1. Datos

- [x] 1.1 `saveCount` en `listDiscoverLists` y `listsFromFollowing` (y el modo explorar) con `saveCountsFor`; 0 si no tiene
- [x] 1.2 «Para completar» trae hasta 8 caminos
- [x] 1.3 Tests de servicios: `saveCount` presente en las tres fuentes
- [x] 1.4 `docs/04-api/contracts.md`: `saveCount` en `/api/lists/{discover,popular,from-following}`

## 2. Filas y lector

- [x] 2.1 `ListRow`: mosaico 64/56 px, título, dueño · fecha, tipo · elementos · guardadas; Guardar 44×44 con sesión; variante «Para completar» con personas completando
- [x] 2.2 `ListsReader` (cliente): `tablist` con flechas, pestañas con contenido en orden (De la gente que sigues, Populares, Recientes, Para completar), primera abierta, «Ver más» por pestaña, `excludeIds` de Destacadas
- [x] 2.3 Selección desde `lg` (clic primario sin modificadores y Enter); enlace normal por debajo de `lg` y sin JavaScript
- [x] 2.4 Modo explorar: el mismo lector con una sola fuente, rótulo de resultados y «sin resultados»; retirar `CommunityExploreGrid`

## 3. Vista previa

- [x] 3.1 `ListPreview`: cabecera (mosaico, tipo, título, dueño, fecha, descripción, guardadas, Abrir, Guardar) y primeros 8 elementos numerados
- [x] 3.2 Primera vista previa resuelta en el servidor; las demás con `GET /api/users/{username}/lists/{listId}` (`useQuery` por id), con esqueleto mientras carga y estado de error
- [x] 3.3 Enlaces correctos para colecciones generadas y para «Para completar»

## 4. Sin riel

- [x] 4.1 `ListsYourLine` bajo la frase de entrada (con sesión): retomar, Mis listas, Guardadas; o crear la primera
- [x] 4.2 `ListsSignUpBand` después del lector (sin sesión)
- [x] 4.3 Retirar `ListsContextRail` y sus tests; página sin columna lateral

## 5. Tests, mensajes y documentación

- [x] 5.1 Tests: pestañas y teclado, filas con guardadas, selección y vista previa (inicial, carga, error), teléfono sin vista previa, explorar, Tus listas y banda
- [x] 5.2 Mensajes es/en y `pnpm run i18n:client-messages`
- [x] 5.3 `docs/05-features/lists-and-favorites.md`: lector, vista previa, retirada del riel; revisar si la Ayuda menciona el riel
- [x] 5.4 `pnpm run verify` y `pnpm run build`
- [x] 5.5 Verificación en el navegador a 1440, 1024, 820 y 390 px, sin sesión: pestañas, selección y vista previa, Ver más, banda, explorar; con sesión si es posible: Tus listas, De la gente que sigues y Guardar
