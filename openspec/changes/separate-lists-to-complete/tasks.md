## 1. Sección

- [x] 1.1 `ListsToComplete` (servidor): encabezado con frase y «Ver todas», tarjetas con tira de carátulas, título, dueño, personas completando y «Completarla»; 4 columnas desde `lg`, 2 desde `sm`, fila táctil en el teléfono
- [x] 1.2 `page.tsx`: sección tras Destacadas en la vitrina; en explorar, encima del lector con tipo nulo o álbumes, filtrada por texto en el título; hasta 4

## 2. Lector

- [x] 2.1 Quitar la pestaña `to-complete`, `CaminoPanel`, `entryFromCamino` y la variante de camino de `ListRow` y `ListPreview`

## 3. Tests, textos y documentación

- [x] 3.1 Tests de la sección, de la página (vitrina y filtros) y del lector sin la pestaña
- [x] 3.2 Mensajes es/en; `docs/05-features/lists-and-favorites.md`
- [x] 3.3 `pnpm run verify` y `pnpm run build`; navegador a 1440, 1024, 820 y 390 px, con y sin filtros
