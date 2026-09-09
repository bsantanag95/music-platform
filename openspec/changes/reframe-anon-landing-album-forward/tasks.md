## 1. Copy del hero

- [x] 1.1 `messages/es/home.json` — reescribir `heroLine1-3` y `anonSubtagline` hacia el álbum como obra (valorar / reseñar / volver) + descubrimiento por personas; no tocar `heroCta`, `anonSearchPrompt`, `anonClosingTitle`, `feature*`
- [x] 1.2 `messages/en/home.json` — mismo reencuadre en inglés
- [x] 1.3 Revisar tests que asserten los textos viejos del hero (buscar "Registrá todo lo que" / "Track everything")

## 2. Bloque editorial de álbumes en el landing

- [x] 2.1 `messages/{es,en}/home.json` — nuevas claves: `featuredAlbumsHeading` ("Colecciones para empezar" / "Where to start"), `topRatedHeading` ("Mejor valorados de la comunidad" / "Community favorites"), `collectionItems` ("{count, plural, ...}"), `albumCoverLabel`
- [x] 2.2 `src/components/home/AnonymousHome.tsx` — importar `listFeaturedCollections`, `listTopRated` de `@/services/discovery/discovery`, `isExploreEnabled` de `@/lib/config/discovery`, `CURATOR_USERNAME` de `@/services/discovery/constants`
- [x] 2.3 En el `Promise.all`: `listTopRated()` siempre; `listFeaturedCollections()` solo si `isExploreEnabled()` (si no, `[]`)
- [x] 2.4 Renderizar, **debajo de `<AnonHero>` y encima de la grilla community/lists**: `<CollectionRail heading curatorUsername={CURATOR_USERNAME} itemsLabel collections={featured} />` y `<AlbumRail heading albums={topRated} categoryLabels coverLabel />`. `categoryLabels` desde `catalog.artist.categories.*`
- [x] 2.5 Confirmar que ambos rieles ya colapsan con `[]` (no envolver en un contenedor que quede vacío)

## 3. Tests

- [x] 3.1 `src/components/home/AnonymousHome.test.tsx` — mock de `@/services/discovery/discovery` y `@/lib/config/discovery`; el bloque aparece (`CollectionRail` / `AlbumRail` presentes) cuando hay datos y `isExploreEnabled()` true
- [x] 3.2 Con `isExploreEnabled()` false: no se consulta `listFeaturedCollections`, `CollectionRail` ausente; `AlbumRail` puede seguir si `listTopRated` trae datos
- [x] 3.3 Sin datos en ninguno: ni `CollectionRail` ni `AlbumRail` en el árbol; el resto del Inicio anónimo intacto
- [x] 3.4 `AuthenticatedHome.test.tsx` — confirmar que el bloque editorial no aparece con sesión (no hay `CollectionRail` / `AlbumRail`)

## 4. Docs

- [x] 4.1 `docs/05-features/home.md` — el bloque editorial de álbumes del landing anónimo (colecciones gateadas por el flag + mejor valorados, colapso independiente) y el reencuadre del copy del hero hacia el álbum como obra

## 5. Cierre

- [x] 5.1 `openspec validate reframe-anon-landing-album-forward --strict` pasa
- [x] 5.2 `typecheck`, `lint`, `test` (1213 pasan), `build` en verde
- [x] 5.3 Verificación cubierta por `AnonymousHome.test.tsx` (bloque presente con datos + flag on; sin consulta de colecciones con flag off; colapso sin datos; resto del Inicio intacto) y `AuthenticatedHome.test.tsx` (bloque ausente con sesión, test estructural). Walk autenticado/seed en navegador no factible en este entorno
- [ ] 5.4 Archivar el cambio y sincronizar specs cuando esté implementado y aprobado
