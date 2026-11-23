## 1. Barra en dos filas

- [x] 1.1 Contenedor fijo en `flex-col`: fila de secciones (igual que hoy) y fila de controles `flex-wrap` con el buscador a la izquierda y los grupos a la derecha
- [x] 1.2 Rótulos visibles cortos desde `sm` para Filtrar, Agrupar y Vista (`barLabels`, contenidos en sus `aria-label`), solo para lectores de pantalla en el teléfono
- [x] 1.3 `--discography-bar-h` y `scroll-mt` de la sección, los títulos de bloque y los grupos de búsqueda con el alto nuevo
- [x] 1.4 Tests: dos filas, rótulos, buscador plegado en el teléfono, sin cambios en orden, agrupación ni vista por defecto

## 2. Carátulas

- [x] 2.1 `TitleTile` con `insetTop`; `Cover` lo activa cuando la tarjeta lleva «★ Mejor valorado» o «EP»
- [x] 2.2 `CoverThumb`: `fallback` opcional y comprobación al montar (`complete && naturalWidth === 0` → fallida); `Cover` le pasa el `TitleTile` en la grilla
- [x] 2.3 `LazyCoverImage`: sin cambios (pinta la imagen solo en el cliente, su `onError` ya escucha); comprobado
- [x] 2.4 Tests: relleno con etiquetas, caída ante error previo a la hidratación, fallback a medida

## 3. Títulos

- [x] 3.1 `h3` de bloque de la grilla y de la tabla a `text-lg sm:text-xl` con la cantidad en mono

## 4. Documentación y verificación

- [x] 4.1 `pnpm run i18n:client-messages`
- [x] 4.2 `docs/05-features/catalog-browsing.md`: barra en dos filas, carátulas sin choque ni imagen rota; la propuesta D completa
- [x] 4.3 `pnpm run verify` y `pnpm run build`
- [x] 4.4 Navegador a 1440, 1024, 820 y 390 px, sin sesión: Iron Maiden (Principal con bloques, En vivo en tabla, búsqueda), un artista con discos sin carátula; sin desbordes y con la barra fija
