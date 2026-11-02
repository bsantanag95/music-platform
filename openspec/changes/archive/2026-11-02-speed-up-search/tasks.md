## 1. Canciones sin browse de apariciones

- [x] 1.1 Ampliar `MBRecordingSearchItem.releases` en `src/services/musicbrainz/types.ts` a `MBReleaseWithReleaseGroup[]` (status, date y release-group embebido) y ajustar los fixtures de tests que lo construyen
- [x] 1.2 En `expandGroup` (`songs.ts`), leer las apariciones de `item.releases` de los primeros cuatro candidatos, sin `browseReleasesByRecording`; identidad por número de ediciones
- [x] 1.3 Persistir los release-groups de los cuatro candidatos con un solo `upsertReleaseGroupStubs` (separar en `ingest-recording.ts` la agrupación de releases de la escritura, o aceptar varias listas)
- [x] 1.4 Retirar `browseReleasesByRecording` del cliente si ya no tiene usos (y su comentario sobre la caché) o dejar constancia de quién lo usa
- [x] 1.5 Tests en `songs.test.ts`: unión y identidad desde la respuesta de búsqueda, cero browse de apariciones, un solo upsert de stubs; actualizar los que esperaban browse
- [x] 1.6 Verificar contra MusicBrainz real con una grabación de más de 100 ediciones (*Creep*) que la búsqueda trae todas, y medir `radiohead - creep` y `pink floyd time` en frío (objetivo ≤ 3 s) — *Creep*: 130 ediciones en la búsqueda frente a 100 del browse. De 6 a 2 solicitudes (3 con un 503); en frío 3.4 s y 4.9 s: lo que queda es la latencia de MusicBrainz (1–3 s por solicitud, más la descarga de la respuesta con todas las ediciones). En caliente 70 ms

## 2. Artistas: local primero con streaming

- [x] 2.1 Agregar `localOnly` a `searchArtists` (coincidencias locales con el mismo orden, sin MusicBrainz ni stubs) con tests
- [x] 2.2 Partir `ArtistSection` en lo local (fallback `LocalFirst`) y `ArtistRemote` dentro de `Suspense`, como `AlbumSection`; el resumen, las pastillas y el aviso de búsqueda amplia se ven en los dos estados
- [x] 2.3 Mover la redirección por coincidencia exacta única a `ArtistRemote` con la misma regla (`uniqueExactArtist`, sin redirección en avanzada, con criterios ni `all=1`)
- [x] 2.4 Verificar la redirección en las dos vías (envío desde el Header con navegación de cliente y URL abierta directamente); si alguna falla, redirigir desde un componente cliente con `router.replace` emitido por la parte transmitida
- [x] 2.5 Actualizar `sections.test.tsx` (lo local antes de MusicBrainz, redirección desde la parte transmitida, homónimos sin redirección)

## 3. Señal de envío en curso

- [x] 3.1 `AdvancedSearchForm`: `router.push` dentro de `useTransition`; botón Buscar deshabilitado y con estado mientras `isPending`, `aria-busy` en el formulario
- [x] 3.2 Contexto cliente pequeño para el estado pendiente de la búsqueda avanzada y contenedor que atenúa los resultados anteriores con `aria-busy="true"` sin convertir la página en cliente
- [x] 3.3 `ScopedSearchField` compacto: deshabilitar el envío y mostrar el indicador en el botón mientras `isNavigating`
- [x] 3.4 Mensajes nuevos en `messages/{es,en}/catalog.json` si hacen falta (texto accesible del estado) y `pnpm run i18n:client-messages`
- [x] 3.5 Tests de `AdvancedSearchForm.test.tsx` y `ScopedSearchField.test.tsx` para el estado pendiente

## 4. Desplegable estable

- [x] 4.1 En `ScopedSearchField`, conservar las sugerencias anteriores del mismo tipo mientras la consulta nueva está en vuelo (listbox `aria-busy`, filas atenuadas); vaciar al cambiar de tipo, al bajar de 2 caracteres o ante un fallo
- [x] 4.2 Tests: las sugerencias no desaparecen entre teclas, se reemplazan al llegar, se vacían al cambiar de tipo

## 5. SQL de la búsqueda y las sugerencias

- [x] 5.1 Variante en lote de `ingestCredits` (un `upsertArtistStubsFromSearch` + un `INSERT … ON CONFLICT DO NOTHING` multi-fila en `credit`)
- [x] 5.2 `searchAlbums`: guardar créditos solo de los álbumes sin créditos, con la variante en lote; tests de cero escrituras en la búsqueda repetida
- [x] 5.3 `bridgeAlbums` (`suggest.ts`): una consulta por resto de título distinto, conservando el orden de los artistas; test con varios homónimos
- [x] 5.4 `local-match.ts`: subcadena primero y similitud por trigramas solo como relleno del cupo, sin repetir filas, en artistas, release-groups y recordings; tests de palabra común, errata y pocas subcadenas
- [x] 5.5 Medir sobre la base de scratch: sugerencias de Álbumes `the d` y Artistas `soda st` ≤ 40 ms de mediana; número de consultas SQL de una búsqueda de Álbumes repetida (sin escrituras) — `the d` 236 → 25 ms, `the dark side` 136 → 19, `soda st` 49 → 14, `ok com` 46 → 40, `pink floyd the wall` 80 → 69 (fuera del presupuesto, sin empeorar)

## 6. Documentación y cierre

- [x] 6.1 `docs/05-features/catalog-browsing.md`: Artistas local primero, presupuesto de Canciones sin browse de apariciones, señal de envío
- [x] 6.2 `docs/04-api/contracts.md`: revisar la descripción del presupuesto por tipo si la menciona
- [x] 6.3 Medir de nuevo el recorrido completo (sugerencias, `/search` por tipo, búsqueda avanzada) con el servidor de producción local y comparar con la tabla del diseño
- [x] 6.4 `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build`
