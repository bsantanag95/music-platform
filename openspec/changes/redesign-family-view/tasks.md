## 1. Servicio

- [ ] 1.1 Orden compartido `best` de `listAlbumsFiltered`: lanzamientos futuros al final → valoración (umbral) → premio → estudio primero → carátula resuelta → año descendente → id; pruebas del SQL generado y de cada escenario del orden
- [ ] 1.2 Medir el listado de Rock con el orden anterior y el nuevo; si el nuevo cuesta de más, recortar a columnas (estudio, carátula, año) y dejar el premio fuera, y anotar la medida en el diseño
- [ ] 1.3 `ttl-cache.ts`: helper de caché en memoria con TTL, promesa en vuelo y error sin cachear; `family-covers.ts` pasa a usarlo sin cambiar su comportamiento ni sus pruebas
- [ ] 1.4 `listFamilyGenres(familyKey, limit = 12)`: géneros de estilo de la familia con su número de álbumes (interno), el nombre en el idioma, caché de 6 h por familia; con pruebas (orden, tope, familia desconocida, caché, error)

## 2. Componentes

- [ ] 2.1 `FilteredAlbumList`: quitar `kicker` (y el párrafo sobre el título) en todos los usos; ajustar sus pruebas
- [ ] 2.2 `FilteredAlbumList`: fila de géneros (`topics`: chips enlazados, sin cifras) y `siblings.collapsed` (un `<details>` nativo "Otras familias", cerrado, con la actual marcada); pruebas de render
- [ ] 2.3 `ExploreFilterBar`: la opción por defecto del selector pasa a "Destacados" / "Featured" (`sortBest`)

## 3. Página y mensajes

- [ ] 3.1 `explore/page.tsx`: la rama de familia carga `listFamilyGenres`, pasa los géneros con `genreHref`/`genreDisplayName` y las familias como desplegable; las demás ramas dejan de pasar `kicker`
- [ ] 3.2 Mensajes (es/en): "Géneros de {family}", "Otras familias" (ya existe), "Destacados"; retirar `kickerDecade`, `kickerFamily`, `kickerGenre` y `kickerReleases` si nada más los usa
- [ ] 3.3 Ajustar `explore-collections-pages.test.tsx` y las pruebas de la página de género que dependan del orden o del rótulo

## 4. Verificación y documentación

- [ ] 4.1 Ampliar `scripts/smoke-test-explore-collections.ts` (o el smoke de géneros) con el orden por defecto contra Postgres real (estudio antes que sencillos, futuros al final, premio y valoración mandan) y con `listFamilyGenres`
- [ ] 4.2 Verificar en el navegador a 1280 y 375 px la vista de Rock y la de una familia pequeña: géneros, desplegable, primer disco a la vista, sin scroll horizontal
- [ ] 4.3 `docs/05-features/explore.md` (listados filtrados, orden "Destacados", vista de familia)
- [ ] 4.4 `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build`; `openspec validate --specs --strict`
