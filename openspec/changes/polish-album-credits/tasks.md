## 1. Traducciones

- [x] 1.1 Agregar a `messages/es/catalog.json` y `messages/en/catalog.json` los 19 atributos y 8 tipos de rol del inventario (design.md), en `catalog.album.credits.attributes` / `.roles`
- [x] 1.2 Prueba de paridad: los conjuntos de claves de `roles` y `attributes` son iguales en `es` y `en`
- [x] 1.3 Prueba: `vocal ["other vocals"]` se muestra "otras voces"

## 2. Orden de roles de intérprete

- [x] 2.1 En `formatRoles`, asignar peso a cada etiqueta de instrumento/voz (0 voz principal, 1 instrumento, 2 voces de apoyo, 3 percusión menor) y reordenar solo esa subsecuencia, estable
- [x] 2.2 Pruebas unitarias de `formatRoles`: vocalista con coros, baterista con percusión, productor que toca (el rol no intérprete no se mueve), empate conserva el orden
- [x] 2.3 Verificar que el "+N" esconde los roles de menor peso (prueba de `AlbumCredits`)

## 3. Pistas compactas

- [x] 3.1 Función pura `compactTracks(tracks, total)` en `credit-roles.ts` (rangos de 3+ consecutivas del mismo disco; exclusión de 1–2 pistas con total ≥ 5)
- [x] 3.2 Pruebas unitarias: rango, dos consecutivas sin rango, cortes entre discos, "todas salvo" una y dos, disco corto sin exclusión, sin total
- [x] 3.3 `TrackRefs` renderiza los segmentos con enlaces en cada extremo y en las pistas excluidas; textos `allTracksExcept` en `es` y `en`
- [x] 3.4 Prueba de `AlbumCredits`: "pistas 2–6, 9" y "todas salvo la 1" con los enlaces correctos

## 4. Niveles contraídos

- [x] 4.1 Agrupar los niveles contraídos de `PeopleView` en una lista con divisores, chevron visible, hover y nombre del nivel en color distinto del resumen
- [x] 4.2 Arte y otros usa `CollapsibleLevel` con su resumen de cantidad
- [x] 4.3 Ajustar las pruebas de `AlbumCredits` que dependen del `<summary>` de Arte y otros

## 5. Documentación y verificación

- [x] 5.1 Actualizar la pestaña Créditos en `docs/05-features/catalog-browsing.md`
- [x] 5.2 `pnpm run typecheck && pnpm run lint && pnpm test` y build en worktree aparte
- [x] 5.3 Verificación en el navegador con un álbum de banda con muchos créditos (vista por persona y por canción, es y en)
