## 1. Anclas y navegación

- [x] 1.1 `id` de ancla (con `scroll-mt-24`) en `CollectionRail` (`colecciones`), `FamilyGrid` (`generos`) y
  `DecadeHistogram` (`decadas`).
- [x] 1.2 `MIN_SECTIONS_FOR_JUMP_NAV = 4` en `src/services/discovery/constants.ts`.
- [x] 1.3 `src/components/discovery/ExploreJumpNav.tsx`: `<nav aria-label>` con píldoras `<a href="#id">` para la lista
  `{ id, label }` recibida; `null` con menos de `MIN_SECTIONS_FOR_JUMP_NAV`; en móvil se desplaza en horizontal.
- [x] 1.4 Cadenas es/en `jump.*` (rótulo de la navegación y una etiqueta corta por sección) en
  `messages/{es,en}/catalog.json`.

## 2. Página

- [x] 2.1 `explore/page.tsx`: nuevo orden (Colecciones, Género, Novedades, Próximos, Premios, Mejor valorados, Más
  reseñados, Década).
- [x] 2.2 `explore/page.tsx`: calcular las secciones visibles con los mismos datos que cada sección usa para omitirse y
  pintar `ExploreJumpNav` bajo el `<h1>`.

## 3. Pruebas

- [x] 3.1 `ExploreJumpNav`: enlaza solo lo recibido y en su orden, hacia `#id`; se omite con menos de 4; etiquetas en
  es y en.
- [x] 3.2 Verificar en el navegador (es y en, escritorio y móvil): el orden, que cada enlace lleva a su sección sin que el
  encabezado tape el título, que no hay desborde horizontal y que una sección omitida no aparece en la fila.

## 4. Documentación

- [x] 4.1 `docs/05-features/explore.md`: tabla en el nuevo orden y nota de la navegación rápida con sus anclas.

## 5. Cierre

- [x] 5.1 `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build` pasan.
