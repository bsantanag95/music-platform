## 1. Servicio

- [x] 1.1 `listFamilyCovers()`: una consulta con ventana (`row_number() over (partition by family)`) con 16 candidatos de discos de estudio con carátula por familia, ordenados por la señal de las colecciones (premio, calendario, valoración, id), y `assignCovers` que reparte hasta 4 por familia sin repetir discos y de forma estable
- [x] 1.2 Caché en memoria con TTL (6 h) y promesa en vuelo para visitas simultáneas; un error no se cachea y devuelve el mapa vacío; con prueba (reutiliza, expira, no cachea el error, una sola consulta concurrente)
- [x] 1.3 `ExplorePage.families` lleva `covers: string[]` por familia (vacío si no hay) y `getExplorePage` las lee junto al resto

## 2. Componente

- [x] 2.1 `FamilyGrid`: la tarjeta pasa a mosaico a sangre (4 → 2×2, 3 → la primera a dos filas, 2 → dos columnas, 1 → una, 0 → plana) con el nombre abajo sobre un velo, sin número ni barra; foco y hover con borde ámbar
- [x] 2.2 La tarjeta de "Más familias" conserva su lugar y su altura; prueba de render de los cinco casos de mosaico y de que no hay número ni barra

## 3. Página y mensajes

- [x] 3.1 `explore/page.tsx`: `familyTiles` deja de formatear el conteo y pasa las carátulas; retirar `albumCount` de los mensajes (es/en) si nada más lo usa
- [x] 3.2 Ajustar `explore-collections-pages.test.tsx` y `discovery-sections.test.tsx` a la tarjeta nueva

## 4. Verificación y documentación

- [x] 4.1 Ampliar `scripts/smoke-test-explore-collections.ts` o el smoke de géneros con la lectura de carátulas por familia (solo estudio con carátula, hasta 4, estable, familia sin carátulas queda vacía)
- [x] 4.2 Verificar en el navegador a 1280 y 375 px: mosaico con 4/3/2/1/0 carátulas, texto legible y sin scroll horizontal (el plegado de "Más" lo cubre la prueba de render)
- [x] 4.3 `docs/05-features/explore.md` (sección de géneros) y nota de la caché; ADR 0041 solo si la caché en memoria se considera decisión de arquitectura (se valora al implementar)
- [x] 4.4 `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build`; `openspec validate --specs --strict`
