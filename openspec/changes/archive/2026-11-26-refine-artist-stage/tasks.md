## 1. Panel y portada

- [x] 1.1 `ArtistRelationPanel` como franja: rejilla conmutadores + filas en 3/2/1 columnas; el layout lo monta bajo la portada con sesión
- [x] 1.2 La portada sin columna derecha con sesión; «Seguir a {artista}» sigue en la portada sin sesión

## 2. Carátulas

- [x] 2.1 `stageBackdrop(covers, exclude)`: el abanico excluye la carátula del retrato; sin fundas, disco dibujado sobre el color
- [x] 2.2 `src/services/catalog/stage-covers.ts`: `resolveStageCovers` con presupuesto de 1,5 s y `after()` para el resto; el layout suma las URL resueltas
- [x] 2.3 Tests unitarios y de propiedades de `stageBackdrop` con exclusión; tests del servicio (presupuesto, límite 12, orden)

## 3. Ficha

- [x] 3.1 `ArtistFacts` en tres líneas; rótulo visible para Primer disco y Fallecimiento; enlaces sin subrayado punteado
- [x] 3.2 Alineación y bandas: hasta 3 nombres y «y N más»
- [x] 3.3 Tests de la ficha y de la alineación

## 4. Documentación y verificación

- [x] 4.1 Mensajes y `pnpm run i18n:client-messages`
- [x] 4.2 `docs/05-features/catalog-browsing.md`
- [x] 4.3 `pnpm run verify` y `pnpm run build`
- [x] 4.4 Navegador a 1440 y 390 px, con y sin sesión: Peter Gabriel, Chappell Roan, Iron Maiden
