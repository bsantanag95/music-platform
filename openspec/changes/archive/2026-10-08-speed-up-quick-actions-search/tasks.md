## 1. Cancelación en el cliente de MusicBrainz

- [x] 1.1 `schedule(task, signal?)`: al llegar el turno, si la señal está abortada rechaza con `AbortError` sin actualizar `lastRequestAt`; pruebas (descarta en espera, no consume intervalo, la siguiente tarea no espera)
- [x] 1.2 `mbFetch` y los métodos de búsqueda/browse aceptan `signal` opcional y la pasan a `schedule` (el `fetch` en curso sigue solo con su timeout)
- [x] 1.3 `cachedSearch` con contador de interesados y `AbortController` propio por entrada: abortar un interesado le rechaza al instante; con cero interesados se aborta la entrada y se borra de la caché; pruebas (compartida no se cancela si queda uno, descartada no queda cacheada)

## 2. Propagación en la búsqueda del catálogo

- [x] 2.1 `parseCatalogSearchParams`: `purpose` (`pick` o ausente; otro valor se ignora); pruebas
- [x] 2.2 Route `GET /api/catalog/search`: pasa `req.signal` a `searchCatalogByType`; `searchArtists/Albums/Songs` lo propagan a cada llamada de `musicbrainz.*` y llaman `signal?.throwIfAborted()` antes de cada escritura (stubs, créditos, grabaciones); pruebas de que una búsqueda abortada no escribe
- [x] 2.3 Prueba de la ruta: `type=song&purpose=pick` llega al servicio con `purpose` y la señal

## 3. Modo de elección en Canciones

- [x] 3.1 `searchSongs` con `purpose: "pick"`: sin `expandGroup` ni browse de apariciones; primeros 10 grupos; identidad local con más apariciones → primera remota sin `disambiguation` → primera remota; `findOrIngestRecording` con los datos de la búsqueda; `albums: []`, `nextOffset: null`
- [x] 3.2 Pruebas en `songs.test.ts`: varios grupos con `recordingId`, preferencia de estudio, preferencia local sin registro nuevo, cero browse de apariciones, tope de 10, sin `purpose` igual que antes

## 4. TargetPicker en dos fases

- [x] 4.1 `src/lib/api/catalog.ts`: `searchArtists/Albums/Songs` aceptan `signal` y `purpose`; pruebas de la URL y la señal
- [x] 4.2 `TargetPicker`: fase local (150 ms, ≥ 2 letras, `getSearchSuggestions`) y fase completa (500 ms, ≥ 3 letras, `purpose: "pick"` en canciones), cada una con su `AbortController` abortado en la limpieza del efecto; resultados etiquetados por consulta y tipo
- [x] 4.3 Lista combinada: locales primero, completos sin ids repetidos debajo; indicador de carga discreto con locales visibles; "sin resultados" solo con ambas fases vacías; error solo sin locales; `AbortError` no es error; textos nuevos en `quickActions.picker` (es/en) si hacen falta
- [x] 4.4 Pruebas de `TargetPicker` y del diálogo: local antes que completa, deduplicación sin reordenar, 2 letras solo local, abortar al seguir escribiendo y al cambiar de tipo, fallo de la completa con locales; ajustar las esperas fijas del test del diálogo (hoy 450 ms)

## 5. Documentación y verificación

- [x] 5.1 `docs/04-api/contracts.md`: parámetro `purpose`, forma de la respuesta en modo de elección y cancelación por abandono; eliminar la sección duplicada de `GET /api/catalog/search`
- [x] 5.2 `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build`
- [x] 5.3 Smoke tests de búsqueda relevantes contra la BD de scratch (`ALLOW_SMOKE_ON_REAL_DB=1`), ya que se tocó `musicbrainz/` y `catalog/`
- [x] 5.4 Repetir la medición de escritura rápida contra el servidor de desarrollo (pausas de 400 ms, Canciones y Álbumes) y confirmar que `req.signal` llega abortado al servicio; anotar los tiempos antes/después en el cambio
- [x] 5.5 Verificación en el navegador del diálogo "Añadir": candidatos locales al instante, suma de remotos sin saltos, varias canciones elegibles (sin ejecutar acciones de escritura sobre datos reales)
