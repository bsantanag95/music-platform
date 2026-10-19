## 1. Tarjeta de salón

- [x] 1.1 Reescribir `HallOfFameTile` con el esqueleto de `AwardTile`: `<li>` con fondo teñido por la primera carátula con disco,
  nombre, año de la clase en grande, cuatro carátulas y enlace estirado a la clase más reciente. Prop `detailed` (hub): línea de
  datos (rango de años, cuántas clases, quién decide con `votingHall`) y clases anteriores como enlaces propios (tope
  `PREVIOUS_YEARS_SHOWN`, como `AwardTile`). `HallOfFameTileGrid` con la cuadrícula de `AwardTileGrid` y `detailed` opcional.
- [x] 1.2 `HallOfFameExploreSection`: quitar el riel por salón; encabezado (`SectionHeader`, `id="salon-de-la-fama"`) con
  "Ver todos" al hub (`awardsIndexHref()`) y `HallOfFameTileGrid`; omitir sin clases.
- [x] 1.3 Hub `awards/page.tsx`: el bloque de salones usa `HallOfFameTileGrid detailed`.
- [x] 1.4 Mensajes es/en: encabezado de Explorar y `jump.hallOfFame` con `plural` por cantidad de salones; `exploreSeeAll` pasa a
  "Ver todos"; `names.national-recording-registry` ("Registro Nacional de Grabaciones" / "National Recording Registry"). Quitar las
  claves que dejen de usarse. `explore/page.tsx` pasa la cantidad de salones a la entrada de la navegación rápida.

## 2. Datos (National Recording Registry 2022–2026)

- [x] 2.1 `data/awards/national-recording-registry/categories.json` (`kind: hall_of_fame`, `voting: jury`, categorías `albums`,
  `songs` y `other`, todas `general`/`performer`).
- [x] 2.2 Las cinco clases (2022, 2023, 2024, 2025 y 2026) en `ceremonies/` desde los comunicados de la Biblioteca del Congreso,
  cada una con su `sourceUrl` y su fecha de anuncio, contrastadas con Wikipedia; títulos y artistas tal como los da la fuente, las
  entradas no musicales en `other` con su responsable como `artist`.
- [x] 2.3 Resolver con `scripts/resolve-award-nominees.ts` (canciones ancladas en su disco o sencillo; `searchAs`/`anchor` a mano
  para los ambiguos) y cargar con `scripts/load-awards.ts` en la base de prueba; anotar la tasa de enlace.
- [ ] 2.4 **Revisión humana** de las cinco clases contra la fuente.

## 3. Pruebas

- [x] 3.1 Actualizar `HallOfFame.test.tsx`: tarjeta (año en grande, enlace a la clase más reciente, carátulas, fondo con y sin
  carátula, forma detallada con datos y clases anteriores como enlaces); sección de Explorar (sin clases, un salón, dos salones,
  plural del encabezado, "Ver todos" al hub, sin lista de incorporaciones, es/en); navegación rápida con el plural.
- [x] 3.2 `awards-pages.test.tsx`: el bloque del hub con dos salones y tarjetas detalladas; `explore-collections-pages.test.tsx` si
  asumía el riel.
- [x] 3.3 Que el Registry cargue sin código nuevo: prueba de validación con un `categories.json` de tres categorías (la de
  `other` con entradas sin `resolved`) y fecha de anuncio del año de la clase; si algo falla, es un hallazgo a resolver aquí.
- [x] 3.4 Verificar en el navegador (es y en, escritorio y móvil) Explorar con dos salones, el hub y la clase 2026 del Registry.

## 4. Documentación

- [x] 4.1 `docs/05-features/awards.md` (segundo salón, categorías y fuente) y `docs/05-features/explore.md` (tarjeta por salón,
  plural de la navegación rápida).
- [x] 4.2 ADR 0044: nota breve de que el segundo salón no requirió cambios de modelo (un ADR existente solo recibe nota, no se
  reescribe); `AGENTS.md` solo si el smoke test cambia.

## 5. Cierre

- [x] 5.1 Datos cargados en la base de prueba y vistos en el navegador.
- [x] 5.2 `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build` pasan.
