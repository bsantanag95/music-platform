## 1. Regla y lecturas

- [x] 1.1 `src/services/catalog/search/artist-answer.ts`: `pickArtistAnswer(query, results)` puro según design D1 (`answer` / `choice` / `none`, con el motivo de cada candidato)
- [x] 1.2 Tests de ejemplo con las filas de la tabla del design (pink, kiss, queen, icon, nirvana, sin exactos) y `artist-answer.property.test.ts` (respuesta siempre entre los resultados, ≤ 3 candidatos, un exacto con discos siempre gana, `discCount < 2` nunca entra en la elección)
- [x] 1.3 `getStoredTracklistPreview(releaseGroupId, limit)`: canciones de la edición representativa ya guardada (`release.is_representative`), total y primeras `limit`; `null` sin edición guardada; sin ingesta. Con un test de que no llama a la ingesta
- [x] 1.4 Coincidencias locales en otro tipo: helper que llama a la búsqueda del tipo con `localOnly: true` y devuelve 3 filas; test de que no sale a MusicBrainz

## 2. Artistas

- [x] 2.1 `ArtistAnswer` (tarjeta grande: foto 96 px, nombre, meta, «N discos en el catálogo», géneros, «Ver perfil», nota «Más cercano en el catálogo» si corresponde)
- [x] 2.2 `ArtistChoice` («¿Cuál «x» buscas?», 2–3 tarjetas con foto o inicial y su motivo; riel horizontal en el teléfono)
- [x] 2.3 Homónimos plegados: los 3 primeros + «Ver los N» (cliente) sin repetir los de arriba; «Más resultados» sin los de arriba
- [x] 2.4 `ArtistRemote` usa `pickArtistAnswer` y pide géneros de la respuesta o de cada candidato en paralelo; el fallback local usa la misma regla con lo local
- [x] 2.5 La avanzada conserva `ArtistResults` tal cual

## 3. Álbumes

- [x] 3.1 `AlbumAnswer` según design D3 (carátula 200/160 px vía `LazyCoverImage`, datos, ★ compacta, tracklist guardada, «Ver el disco», «También: …»)
- [x] 3.2 `AlbumRemote`: ficha cuando el primero tiene `coverageLevel ≤ 2`; «Otros álbumes» (`ResultsGroupHeading`) sin la respuesta ni los «También»; «Cargar más» sigue excluyendo los vistos
- [x] 3.3 Teléfono: ficha en una columna, carátula de 160 px, sin desbordes a 390 px

## 4. Canciones

- [x] 4.1 `SongAnswer` según design D4 (reemplaza a `SongGroupPanel` en la rápida; «Ver la canción» solo con `recordingId`; «Ver N más» en el cliente)
- [x] 4.2 La interpretación sigue sobre la ficha; la avanzada sin cambios

## 5. Columna lateral

- [x] 5.1 `OtherTypePanel` (título ««x» en álbumes/canciones», filas mini, «Ver … →»), en su propio `Suspense` con fallback `null`; mapeo Artistas → álbumes, Álbumes → canciones, Canciones → álbumes; nada en Usuarios
- [x] 5.2 Tras filtros y «Acotar» en la lateral; en el teléfono, después de los resultados (no antes)
- [x] 5.3 Tests de `sections.test.tsx`: la lateral lleva el panel en la rápida y no en la avanzada

## 6. Textos, documentación y verificación

- [x] 6.1 Textos nuevos en `messages/{es,en}/catalog.json` (mismas claves) y `pnpm run i18n:client-messages`
- [x] 6.2 `docs/05-features/catalog-browsing.md`: la regla de la respuesta, las fichas y el panel lateral
- [x] 6.3 `pnpm run verify` y `pnpm run build`
- [x] 6.4 Navegador a 1440, 1024, 820 y 390 px: «pink», «kiss», «nirvana» (Artistas), «the wall», «ok computer» (Álbumes), «creep» (Canciones), «qzxvbnmqk»; `/search/advanced` sin cambios
