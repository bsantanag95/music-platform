## 1. Marco y entrada

- [x] 1.1 `main` de `/lists` a `max-w-[88rem]`, márgenes `px-4 sm:px-8 xl:px-12`, 40 px entre cabecera, filtros y contenido y 64–80 px entre secciones; bloque de miga de pan, título y frase
- [x] 1.2 `<h1>` en `clamp(2.5rem,5vw,4rem)` con «Crear lista» a la derecha (con sesión); frase `lists.community.intro` (es/en)
- [x] 1.3 Destacadas y `CommunityListSection` con `SectionHeader size="page"`

## 2. Filtros

- [x] 2.1 `CommunityListsToolbar`: tipo como control segmentado de 44 px; búsqueda y orden a 44 px
- [x] 2.2 Distribución: una fila desde `lg`; debajo, búsqueda + orden y los cuatro segmentos en su fila a todo el ancho
- [x] 2.3 Tests: segmentos con el actual marcado, URL igual que antes, cuatro segmentos en el DOM sin contenedor desplazable

## 3. Documentación y verificación

- [x] 3.1 `pnpm run i18n:client-messages`
- [x] 3.2 `docs/05-features/lists-and-favorites.md`: marco, entrada, segmentos y el plan de las Fases 2 y 3
- [x] 3.3 `pnpm run verify` y `pnpm run build`
- [x] 3.4 Verificación en el navegador a 1440, 1024, 820 y 390 px: marco alineado con Explorar, segmentos completos en el teléfono, sin desbordes; estado filtrado y `/me/lists` sin cambios visibles
