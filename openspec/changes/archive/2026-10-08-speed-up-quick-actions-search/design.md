## Context

`TargetPicker` (diálogo "Añadir" del Header) hace hoy una sola búsqueda por consulta: 300 ms después de la
última tecla llama a `GET /api/catalog/search`, que combina la base local con MusicBrainz. Mediciones sobre el
servidor de desarrollo (2026-10-08):

| Escenario | Tiempo |
|---|---|
| `/api/search/suggest` (solo local), cualquier tipo | ~0,1 s |
| `/api/catalog/search` aislada: artista / álbum / canción | 1,7–4,4 s / 0,5–0,8 s / 1,0–5,7 s |
| Escribiendo con pausas de 400 ms, consulta final de canción | 13,8 s |
| Ídem, consulta final de álbum | 3,0 s |

Cuellos de botella:

- **Cola global de MusicBrainz** (`schedule()` en `src/services/musicbrainz/client.ts`): una solicitud cada
  ≥ 1,1 s para todo el proceso. El cliente marca `cancelled` pero no aborta el `fetch`, y aunque lo abortara, el
  route handler no mira `req.signal`: las búsquedas obsoletas siguen ocupando turnos delante de la vigente.
- **Canciones** gasta hasta 4 browse de apariciones (`expandGroup`) que el diálogo no muestra, y solo el primer
  grupo trae `recordingId`; `collapsedResult` lo deja en `null` y el diálogo descarta esos grupos.
- **El diálogo no usa lo local**, aunque `/api/search/suggest` ya devuelve ids locales compatibles con
  `PickTarget` (artista, release-group y recording).

Restricciones: el Header vive fuera de `<Providers>` (sin TanStack Query), todo HTTP pasa por `apiFetch`, el
cliente de MusicBrainz es el único punto de salida y su caché TTL comparte solicitudes en vuelo entre búsquedas
idénticas.

## Goals / Non-Goals

**Goals:**

- Candidatos locales en unos cientos de milisegundos.
- La consulta vigente nunca espera detrás de consultas obsoletas en la cola de MusicBrainz.
- Canciones en el diálogo: varias elegibles, como mucho cuatro solicitudes a MusicBrainz, ninguna de apariciones.

**Non-Goals:**

- Cambiar `/search` (orden, streaming, contrato sin `purpose`).
- Cambiar el rate limit o la fuente de búsqueda.
- TanStack Query en el Header, carátulas en el diálogo.

## Decisions

### D1. Dos fases en el cliente con esperas distintas

`TargetPicker` mantiene dos efectos independientes sobre `(rawQuery, type)`:

- **Local**: espera 150 ms, ≥ 2 letras → `getSearchSuggestions(type, q, signal)`.
- **Completa**: espera 500 ms, ≥ 3 letras → `search{Albums,Artists,Songs}(q, { signal, purpose })`.

Cada fase guarda sus resultados etiquetados con la consulta y el tipo que los produjo; el render solo usa los
que coinciden con la consulta vigente, así que nunca se mezclan respuestas viejas. La lista visible es
`locales ++ (completos − ids ya locales)`: lo local nunca se reordena cuando llega lo completo, para que la fila
que la persona está por tocar no se mueva bajo el puntero.

Las sugerencias traen menos campos que la búsqueda completa (sin `disambiguation` en algunos casos, `year`
opcional); el mapeo a `PickTarget` usa lo que haya. Un id duplicado conserva la fila local, pero completa su
subtítulo y año con los de la fila remota cuando faltan: en la verificación en el navegador, seis álbumes
"Dark Side" llegaban de `/api/search/suggest` con `artistName: null` y la búsqueda completa sí traía el artista.

En Canciones, `/api/search/suggest` compara solo el título, de forma difusa; con "metallica one" devolvía
"String Metallica" y "Metall" antes que «One» de Metallica. El diálogo filtra esas sugerencias: cada palabra de
la consulta debe estar en el título o el artista (la última como prefijo, porque se está escribiendo). Se filtra
en el diálogo y no en `suggest` para no cambiar el buscador del Header, que tiene su propio orden y pruebas.

*Alternativas*: una sola llamada con `localOnly` sobre `/api/catalog/search` (duplica lo que ya hace
`/api/search/suggest`, que además está afinado para escribir: orden por actividad, tope de 6); renderizar las
dos listas por separado (dos secciones con el mismo objetivo repetido confunden en un selector).

¿Por qué 3 letras para la fase completa? Con 2 letras MusicBrainz devuelve ruido y la consulta casi siempre
queda obsoleta; lo local sí es útil con 2.

### D2. Cancelación de punta a punta con conteo de interesados

- **Cliente**: un `AbortController` por fase y consulta; se aborta en la limpieza del efecto (nueva tecla,
  cambio de tipo, desmontaje). `searchArtists/Albums/Songs` aceptan `signal` y lo pasan a `apiFetch`, como ya
  hace `getSearchSuggestions`. Un `AbortError` no cuenta como error de la fase.
- **Route handler**: pasa `req.signal` a `searchCatalogByType`, que lo propaga a `searchArtists/Albums/Songs` y
  de ahí a cada llamada de `musicbrainz.*`.
- **Cliente de MusicBrainz**: `schedule(task, signal?)` comprueba la señal **al llegar su turno**: si está
  abortada, rechaza con `AbortError` sin consumir el intervalo (no actualiza `lastRequestAt`). La solicitud HTTP
  ya iniciada no se corta (se combina solo con el timeout): cortarla no libera el turno, que ya se pagó, y
  perdería una respuesta que la caché sí puede aprovechar.
- **`cachedSearch`**: la entrada en vuelo lleva un contador de interesados y un `AbortController` propio, que es
  el que recibe `schedule`. Cada llamador suma uno; cuando su señal se aborta resta uno y recibe `AbortError` de
  inmediato. Solo con el contador en cero se aborta el controlador de la entrada. Como hoy, una promesa rechazada
  se borra de la caché, así que un descarte no queda cacheado.
- Los servicios comprueban `signal.throwIfAborted()` antes de cada escritura (stubs, créditos, grabaciones):
  una búsqueda abandonada no escribe.
- `withErrorHandling` no necesita cambios: la conexión ya está cerrada, la respuesta no se entrega.

*Alternativas*: solo cancelar en el cliente (no libera la cola: el problema medido sigue); abortar el `fetch` en
curso (no ahorra turno y desperdicia una respuesta cacheable); sacar las búsquedas de la cola (violaría el rate
limit de MusicBrainz).

### D3. `purpose=pick` en Canciones

`parseCatalogSearchParams` acepta `purpose` (`pick` o nada; otros valores se ignoran, como los demás filtros).
`searchSongs(q, { offset, purpose, signal })` con `purpose === "pick"`:

1. igual que hoy hasta tener los grupos ordenados (interpretación, recordings, locales, `sortByRank`);
2. toma los primeros 10 grupos y, por cada uno, elige identidad: contribución local con más apariciones; si no
   hay, primera grabación remota del grupo sin `disambiguation`; si no, la primera;
3. registra las identidades remotas con `findOrIngestRecording` (datos de la búsqueda: título, duración,
   créditos), sin browse;
4. devuelve los grupos con `albums: []` y `nextOffset: null`; `interpretation`, `alternatives` y `refine` se
   calculan igual (el diálogo los ignora).

El diálogo pasa `purpose: "pick"` solo para canciones.

*Por qué un parámetro y no otro endpoint*: reutiliza validación, interpretación y orden; el contrato cambia de
forma aditiva. *Por qué la versión sin `disambiguation`*: en MusicBrainz las tomas en vivo y los remixes casi
siempre la tienen; es la mejor aproximación a "la de estudio" sin el browse que calculaba `release-count`.
*Por qué 10*: el diálogo muestra pocas filas y cada identidad nueva cuesta escrituras (grabación + créditos).

## Risks / Trade-offs

- [Next no aborta `req.signal` al desconectarse el cliente en algún runtime/versión] → tarea de verificación
  con el servidor real: repetir la medición de escritura rápida; si la señal no llega, el cliente igual deja de
  mostrar resultados obsoletos y lo documentamos como limitación.
- [Identidad sin `release-count` elige una grabación menos canónica que la de `/search`] → la canción es la
  misma obra/título y artista; la página de la canción agrupa versiones por obra. La identidad local siempre
  tiene prioridad, así que el error no se propaga cuando la canción ya está en el catálogo.
- [Más grabaciones registradas por búsqueda (hasta 10)] → solo con `purpose=pick`, solo de grupos que pasaron el
  filtro de relevancia y sin ingerir releases ni tracks; son stubs como los de artistas y álbumes.
- [Dos solicitudes por consulta en lugar de una] → la local cuesta ~0,1 s y no toca MusicBrainz; la completa se
  lanza menos veces (500 ms, ≥ 3 letras) y se cancela al seguir escribiendo.
- [Una solicitud compartida descartada justo cuando llega un interesado nuevo] → el nuevo interesado suma uno
  antes de que la entrada llegue a su turno; si ya se descartó, la entrada se borró y crea una nueva.

## Migration Plan

Sin migraciones. Despliegue normal; el parámetro `purpose` es aditivo y el cliente nuevo lo envía. Rollback:
revertir el commit.

## Open Questions

Ninguna.

## Resultados medidos (2026-10-08)

Servidor de desarrollo contra la BD de scratch, una búsqueda por prefijo cada 600 ms (por encima de la espera de la
fase completa), con consultas distintas en cada escenario para no reutilizar la caché TTL:

| Escenario | Consulta final | Candidatos elegibles |
|---|---|---|
| Canciones, sin abortar ni `purpose` (comportamiento anterior) | 20,0 s | 1 |
| Canciones, abortando la anterior, `purpose=pick` | 3,4 s | 10 |
| Álbumes, sin abortar | 3,3 s | — |
| Álbumes, abortando la anterior | 1,0 s | — |

Las solicitudes abandonadas terminan en el servidor en el momento del abandono (~0,6 s), sin errores en el log:
Next 15 sí aborta `req.signal` al cerrarse la conexión, así que el riesgo anotado arriba no se materializó. La fase
local (`/api/search/suggest`) responde en ~0,1 s.
