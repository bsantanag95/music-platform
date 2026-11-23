## 1. Fondo de la portada

- [x] 1.1 `src/components/artist/artist-stage.ts`: `stageBackdrop(covers)` → modo `wall` (≥ 8), `fan` (1–7, como mucho 5 fundas) o `none` (0), carátulas de la discografía principal con `coverResolved`, en orden y sin repetir; relleno del muro (45 celdas: 9 × 5 en escritorio, 5 × 9 en el teléfono) y `stagePortrait(photo, discography)` (foto → carátula de `bestRatedId` o del disco principal más reciente → iniciales)
- [x] 1.2 Tests unitarios y de propiedades (`artist-stage.property.test.ts`): cualquier número de carátulas cae en un modo, el abanico no pasa de 5, el muro no deja celdas vacías, el retrato nunca queda vacío
- [x] 1.3 `ArtistStage.tsx` (servidor): capas `aria-hidden` del muro (velo de tinta graduado), del abanico (fondo desenfocado, fundas con giro, disco que asoma con una sola) y del disco dibujado; abanico junto al retrato en el teléfono

## 2. Cabecera

- [x] 2.1 `ArtistPhoto` → retrato circular (148 / 96 px) con respaldos de carátula cuadrada enlazada e iniciales; crédito de la foto en la esquina inferior derecha de la portada (se retira `ArtistPhotoCreditMobile`)
- [x] 2.2 `ArtistIdentity`: sin antetítulo, `<h1>` en `clamp(2.5rem, 6vw, 5.5rem)` y descripción en serif
- [x] 2.3 `ArtistFacts` en dos líneas con `·` (tipo al comienzo, géneros como fichas, rótulos `sr-only`), mismas filas de `artistFactRows`
- [x] 2.4 Comunidad como última parte de la primera línea (`ArtistCommunity` → línea): cifras en 0 omitidas, «<5» con texto accesible, favoritos como detalle de seguidores, «listas» enlazado
- [x] 2.5 Acción principal: sin sesión, «Seguir a {artista}» (ámbar, a `/auth/login`) con su frase, sin montar `ArtistRelationPanel`; con sesión, el panel en la columna derecha sobre superficie opaca; en el teléfono, después de la ficha
- [x] 2.6 Mensajes `catalog.artist` (es/en): seguir, frase, comunidad en línea, iniciales/retrato; se retiran los que queden sin uso (`typeEyebrow` se reutiliza como tipo en la ficha)

## 3. Página

- [x] 3.1 `layout.tsx`: `main` a `max-w-[88rem]` con `px-4 sm:px-8 xl:px-12`; portada a todo el ancho con la miga de pan y Compartir dentro; se retiran `ArtistSummary` y `HiddenOnTab` del layout; barra de pestañas con sus variables de altura
- [x] 3.2 Tests de la cabecera, del panel y de las páginas del artista (`ArtistHeader.test.tsx`, `ArtistRelationPanel.test.tsx`, `artist-pages.test.tsx`, `artist-blocks.test.tsx`) al nuevo marcado: retrato y respaldos, modos del fondo, visitante sin panel, comunidad sin ceros, sin resumen en la cabecera

## 4. Documentación y verificación

- [x] 4.1 `pnpm run i18n:client-messages`
- [x] 4.2 `docs/05-features/catalog-browsing.md`: la portada de la ficha de artista y el plan de las Fases 2 y 3; `docs/03-data/data-licensing.md`: las miniaturas de la discografía como fondo de la portada (250 px, atenuadas o desenfocadas, para identificar la obra)
- [x] 4.3 `pnpm run verify` (typecheck, lint, tests del diff) y `pnpm run build`
- [x] 4.4 Verificación en el navegador a 1440, 1024, 820 y 390 px, sin sesión: artista con muchas carátulas (Iron Maiden), con una o dos, sin carátulas y sin foto; contraste del texto sobre una carátula clara; sin desbordes; pestañas fijas y enlaces de la ficha funcionando
