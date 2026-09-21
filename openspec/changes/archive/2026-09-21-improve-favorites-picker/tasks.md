## 1. Búsqueda por artista

- [x] 1.1 `src/services/favorites/favorites.ts`: extraer `favoriteTextMatch(q)` (`TITLE_EXPR ilike` OR `PRIMARY_ARTIST_SQL(...) ilike`) y usarla en `listMyFavorites` y `listUserFavorites`, de modo que `counts` también la respete
- [x] 1.2 Tests del servicio: `q` por artista devuelve álbumes y canciones de ese artista además del favorito del artista; sigue coincidiendo por título; sin distinguir mayúsculas
- [x] 1.3 Comprobar contra la base local con datos reales (p. ej. "sabrina" con `type=release-group` y `type=recording`)

## 2. Interfaz legible

- [x] 2.1 `OwnerIdentityCardEditor`: slots apilados a todo el ancho, "Quitar" junto al elemento elegido, tipografías mayores (heading `text-sm`, título `text-base`, artista `text-sm`); mantener la estructura DOM que usan los tests
- [x] 2.2 `FavoritePicker`: campo de búsqueda y filas con texto de lectura (`text-sm` / `text-xs`), miniatura de 40 px, resumen del desplegable en `text-sm`, lista más alta
- [x] 2.3 Actualizar los tests de los editores y del selector

## 3. Verificación y documentación

- [x] 3.1 `npm run typecheck`, `npm run lint` y `npm test` en verde
- [x] 3.2 Verificar el layout con el dev server (escritorio y panel angosto)
- [x] 3.3 Actualizar `docs/05-features/user-profile.md` (y la doc de favoritos que describa `q`) y `openspec validate improve-favorites-picker --strict`
- [x] 3.4 Archivar el change (`openspec archive improve-favorites-picker --yes`) y comprobar `openspec validate --specs --strict`
