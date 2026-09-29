## 1. Coincidencia

- [x] 1.1 Crear `src/components/artist/discography-search.ts` con `normalizeForSearch`, `matchesDisc` y `searchDiscography` (grupos en el orden del selector, conteo por sección) según design D2
- [x] 1.2 Tests unitarios: mayúsculas y acentos, ligaduras (`Ænima`), apóstrofo tipográfico, recto y omitido, artista principal solo en Apariciones, año de cuatro cifras en O lógico con el título, consulta vacía o solo espacios sin resultados

## 2. Tabla con grupos

- [x] 2.1 `DiscographyTable` acepta grupos con `<tbody>` por grupo, fila de encabezado de grupo (`scope="rowgroup"`, `id` de ancla) y orden aplicado dentro de cada grupo; con un grupo sin título se comporta igual que hoy
- [x] 2.2 Verificar que los tests de tabla y orden existentes siguen pasando sin cambios de expectativas

## 3. Buscador en la discografía

- [x] 3.1 Campo de búsqueda en la barra de secciones cuando el total es ≥ 20 discos: escritorio siempre visible, móvil botón con lupa que despliega el campo a ancho completo con foco (D7)
- [x] 3.2 Con texto: resultados agrupados en tabla (`key="search"`), selector de vista oculto, pastillas con conteo de coincidencias como anclas al grupo y atenuadas/`aria-disabled` en cero (D4, D5)
- [x] 3.3 Esc y el botón de borrar vacían la consulta y restauran sección, vista y orden; región `aria-live` con la cantidad de resultados
- [x] 3.4 Aviso vacío con enlace a `/search?q=` y nota de discografía incompleta; la página de la pestaña pasa `discographyComplete` desde `discographyCompleteAt` (D8)
- [x] 3.5 Mensajes `catalog.artist.discography.search.*` en `messages/es` (voseo) y `messages/en`
- [x] 3.6 Tests de componente: sin buscador bajo 20 discos, grupos y conteos, Esc restaura la grilla, aviso vacío con enlace, nota de incompleta, el menú "…" sigue disponible en los resultados

## 4. Documentación y verificación

- [x] 4.1 Actualizar `docs/05-features/catalog-browsing.md` con el buscador
- [x] 4.2 `pnpm run typecheck && pnpm run lint && pnpm run build` y la suite de tests
- [x] 4.3 Verificar en el navegador (escritorio y móvil) con un artista de discografía larga en scratch
