## 1. Preparación

- [x] 1.1 Confirmar que `add-artist-lineup-data` está implementado y que `getArtistLineup` entrega lo que piden D3, D6 y D7
- [x] 1.2 Revisar que el diccionario `catalog.album.credits.attributes` cubra los instrumentos de las alineaciones de prueba (Mötley Crüe, Pink Floyd, Los Bunkers) y agregar los faltantes en es y en. Hallazgo: `eponymous` y `principal` llegaban como instrumentos; el mapper los excluye y se resincronizaron los grupos afectados (10 en scratch, 2 en la real)

## 2. Formato y carga

- [x] 2.1 `formatLineupPeriods` y el formateo de líneas de instrumentos en `artist-format.ts`, puros (design.md D3)
- [x] 2.2 Tests: abierto, mismo año, extremos desconocidos, sin fechas, instrumento sin traducción, adicional
- [x] 2.3 Loader `loadLineup(artistId)` con `React.cache` en `artist-data.ts` (design.md D1)

## 3. Pestaña y cabecera

- [x] 3.1 `ArtistTabs` con la pestaña Integrantes o Bandas entre Discografía y Biografía, oculta sin contenido
- [x] 3.2 Fila Integrantes / Última alineación / Bandas en `ArtistFacts`, antes de Enlaces, con "Ver alineación" o "Ver todas" (design.md D6)
- [x] 3.3 `layout.tsx`: quitar `ArtistMemberships`, pasar la alineación a la barra de pestañas y a la ficha
- [x] 3.4 Tests de la barra de pestañas y de la fila de la ficha (grupo activo, grupo separado, persona, sin alineación)

## 4. Pestaña Integrantes (grupo)

- [x] 4.1 `(tabs)/members/page.tsx`: 404 sin contenido, sub-vistas por `?view=` con caída en `all`, barra oculta si hay una sola, "Última alineación" en grupos terminados (design.md D2)
- [x] 4.2 Fila de integrante: nombre enlazado, ★ y † accesibles, líneas de instrumentos con períodos, leyenda al pie (design.md D3)
- [x] 4.3 `LineupAlsoIn` (cliente): una línea con 3 afiliaciones y "+N", expandir solo esa fila, "Ver menos", sin línea si no hay afiliaciones (design.md D4)
- [x] 4.4 Aviso de integrantes pendientes y llamada a `scheduleLineupMembersSync` (design.md D5)
- [x] 4.5 Tests: sub-vistas, bloques ocultos, fila de Vince Neil y Tommy Lee, "+12" de Randy Castillo, expandir una sola fila, aviso

## 5. Pestaña Bandas (persona)

- [x] 5.1 Bloques Bandas (tarjetas con foto, instrumentos, períodos, actividad del grupo y discos principales), Apoyo para y Músicos de apoyo (design.md D7)
- [x] 5.2 Quitar la franja "También en" de la discografía de la persona
- [x] 5.3 Tests: persona integrante, músico de gira, solista con banda de gira, sin contenido → 404

## 6. Retiros y mensajes

- [x] 6.1 Eliminar `ArtistMemberships`, `AlsoIn`, `artist-also-in.ts` y sus tests (design.md D8)
- [x] 6.2 Mensajes `catalog.artist.lineup.*` y pestañas en es (voseo) y en; quitar las claves que queden sin uso tras verificar que nadie más las lee

## 7. Documentación y cierre

- [x] 7.1 `docs/05-features/catalog-browsing.md`: pestaña Integrantes/Bandas, sub-vistas, "También en", línea de la cabecera
- [x] 7.2 `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build`
- [x] 7.3 Verificar en el navegador contra la BD de scratch: Mötley Crüe (sub-vistas, "+N", aviso en la primera visita), Pink Floyd (Última alineación), un solista con bandas, escritorio y móvil
