## Context

El buscador tiene tres superficies: el desplegable del Header y de `/search`
(`ScopedSearchField` → `GET /api/search/suggest`, solo base local), la página de resultados
`/search` y la búsqueda avanzada `/search/advanced`. Las dos páginas usan las mismas secciones
(`sections.tsx`) y los mismos servicios (`searchArtists`, `searchAlbums`, `searchSongs`), que
combinan coincidencias locales con una página de MusicBrainz. MusicBrainz admite 1 solicitud cada
1.1 s (cola única en `src/services/musicbrainz/client.ts`) y cachea las búsquedas 10 minutos.

Medición del 2026-11-02 (producción local, base de scratch, en frío / en caliente):

| Superficie | Hoy | Causa |
|---|---|---|
| Sugerencias Artistas/Canciones/Usuarios | 7–25 ms | — |
| Sugerencias Álbumes, palabras comunes («the d») | 170–245 ms | `%` trigram recorre 16k candidatos |
| Sugerencia Artistas «soda st» | ~50 ms, 26 SQL | puente: una consulta por artista «Soda» |
| `/search` Artistas | esqueleto 0.9–2.9 s | la sección espera a MusicBrainz |
| `/search` Álbumes | local 150 ms, total 0.6–1.5 s; 42 SQL en caliente | créditos re-guardados en cada búsqueda |
| `/search` Canciones | local 70 ms, total 5–15 s | 4 browse de apariciones en serie |
| Formulario avanzado | sin señal 0.4–2 s | `router.push` sin transición |
| Desplegable | se vacía en cada tecla | `visibleSuggestions = []` mientras carga |

Traza de «radiohead - creep» en Canciones (9 s): artistas 0.3 s → recordings 2.9 s → 4 browse
`/release?recording=` (0.3–1.9 s cada uno, más la espera de la cola).

## Goals / Non-Goals

**Goals:**
- Quitar del camino crítico toda solicitud a MusicBrainz que no aporte datos nuevos.
- Que ninguna superficie quede sin señal visible mientras espera.
- Acotar el SQL por búsqueda a un número que no crezca con los resultados.

**Non-Goals:**
- Cambiar el rate limit, la caché TTL o la latencia de MusicBrainz.
- Cambiar páginas de entidad, el JavaScript inicial ni el orden de resultados (salvo lo que impone
  la subcadena primero).
- Migraciones de base de datos.

## Decisions

### 1. Apariciones de Canciones desde la búsqueda de recordings

La búsqueda `/ws/2/recording` ya devuelve, por grabación, `releases[]` con `status`, `date` y el
`release-group` embebido (`id`, `title`, `primary-type`, `secondary-types`): exactamente la forma
de `MBReleaseWithReleaseGroup` que consume `albumsFromMbReleases`. Verificado con la grabación
canónica de *Creep*: la búsqueda trae las 130 ediciones (46 release-groups distintos en las 100 del
browse), el browse solo una página de 100. `expandGroup` pasará a leer `item.releases` de los
primeros cuatro candidatos del grupo, sin solicitudes, y la identidad del grupo usará
`releases.length` como `release-count`.

- `MBRecordingSearchItem.releases` se amplía al tipo completo (`MBReleaseWithReleaseGroup[]`).
- Los cuatro candidatos se resuelven con **un** `upsertReleaseGroupStubs` (unión de sus
  release-groups), no uno por candidato.
- Ya no hace falta limitarse a cuatro candidatos por costo de red; se mantiene el tope de cuatro
  para no cambiar qué apariciones se unen (el orden y la identidad siguen el requisito vigente).
- `browseReleasesByRecording` queda en el cliente (sin usos en la búsqueda); se retira si no lo
  usa nadie más al implementar.

*Alternativas:* browse en paralelo (imposible: la cola es serial por diseño), transmitir las
apariciones aparte por streaming (sigue costando 4 solicitudes y complica la página), consultar
solo el primer candidato (pierde apariciones: ninguna grabación tiene todas).

### 2. Artistas: local primero y redirección desde la parte transmitida

`searchArtists` gana `localOnly` (como `searchAlbums`/`searchSongs`): coincidencias locales con el
mismo orden y sin MusicBrainz ni stubs. `ArtistSection` renderiza lo local dentro del fallback de
un `Suspense` (`LocalFirst`, el mismo patrón que Álbumes) y `ArtistRemote` devuelve la lista
fusionada final. La redirección por coincidencia exacta única (`uniqueExactArtist`) se evalúa en
`ArtistRemote`, con la misma regla que hoy (necesita la respuesta de MusicBrainz para saber si hay
homónimos). Decisión de producto tomada con la persona usuaria: se prefiere ver lo local al
instante aunque, cuando hay redirección, la lista local se vea un momento antes del salto.

`redirect()` dentro de un límite de `Suspense` ya transmitido: Next 15 lo resuelve en la
navegación de cliente (el payload RSC lleva la redirección) y en la carga completa inserta la
redirección en el stream. Se verifica en las dos vías (Header con navegación de cliente y URL
abierta directamente) antes de dar la tarea por terminada.

*Alternativas descartadas:* decidir la redirección solo con datos locales (salta homónimos que
solo existen en MusicBrainz y cambia la regla vigente); mantener la espera solo en la búsqueda
rápida (el caso más frecuente seguiría lento).

### 3. Señal de envío en curso

`AdvancedSearchForm` envuelve `router.push` en `useTransition`; mientras `isPending`, el botón
Buscar se deshabilita y muestra el estado, y el formulario expone `aria-busy`. Los resultados
anteriores se atenúan: la página envuelve la sección de resultados en un contenedor que lee el
estado pendiente vía un contexto cliente pequeño (`SearchPendingProvider`), sin convertir la página
en componente cliente. En el Header (`ScopedSearchField`, variante compacta) ya existe
`isNavigating`; se usa también para deshabilitar el envío y mostrar un indicador en el botón de
lupa, y el `aria-busy` del campo.

*Alternativa:* `loading.tsx` por cambio de `searchParams` — Next no lo vuelve a mostrar en una
navegación de la misma ruta, por eso la transición explícita.

### 4. Desplegable que no parpadea

`ScopedSearchField` conserva la última lista cargada (`suggestions` + `loadedFor`) mientras la
consulta nueva está en vuelo: `visibleSuggestions` muestra la lista anterior si es del mismo tipo,
con el listbox en `aria-busy="true"` y las filas atenuadas. Al llegar la respuesta se reemplaza.
Cambiar de tipo o bajar de 2 caracteres sí vacía la lista (las anteriores ya no corresponden). El
índice activo del teclado se reinicia al reemplazar la lista, como hoy.

### 5. Créditos de stubs de álbum: solo los nuevos y en lote

`upsertReleaseGroupStubs` devuelve filas nuevas y existentes. Se distinguen las recién creadas (por
`created_at` del lote / `xmax = 0` vía `RETURNING`, lo que resulte más simple con el helper actual)
y solo a ellas se les guardan los créditos de la búsqueda. Para esas, una variante en lote de
`ingestCredits`: un `upsertArtistStubsFromSearch` con todos los artistas acreditados y un único
`INSERT … ON CONFLICT DO NOTHING` multi-fila en `credit`. Un álbum que ya existía sin créditos
(stub de otra vía) recibe los créditos igual: el criterio es "sin créditos", no "recién creado",
si la consulta extra lo permite en una sola sentencia (`NOT EXISTS` sobre `credit`).

*Alternativa:* cachear en memoria los mbid ya acreditados (no sobrevive a reinicios ni a varias
instancias).

### 6. Puente artista + título en una consulta por resto

`bridgeAlbums` agrupa los artistas encontrados por su resto de título (`restAfterEdgeArtist`) y
llama a `releaseGroupsByArtistsAndTitle(ids, rest)` una vez por resto distinto (normalmente uno o
dos). Se conserva el orden de los artistas en el resultado.

### 7. Subcadena primero, trigramas como relleno

`matchLocalArtists`, `matchLocalReleaseGroups` y `matchLocalRecordings` (y por tanto sugerencias y
la parte local de la búsqueda) hacen primero la consulta por subcadena normalizada (`LIKE`
`%texto%` sobre `search_normalize`, ordenada por similitud, 5–20 ms) y solo si devuelve menos filas
que el cupo pedido completan con las que casan **solo** por similitud (`% AND NOT LIKE`), detrás de
las de subcadena. Repetir la consulta combinada sumaba la subcadena al costo de antes («ok com»
46 → 59 ms en la primera medición); con la exclusión, las dos consultas cuestan lo mismo que la
combinada (4 + 26 ms frente a 35 ms en «ok com»).
Medido sobre release_group: «the d» 191 → 15 ms, «the dark side» 149 → 10 ms, «love» 74 → 21 ms.
Las erratas («dark sied») no dan subcadena y siguen yendo por trigramas, como hoy.

El orden final lo sigue decidiendo `matchTier` (exacta → palabra → prefijo → resto) y la
actividad; las filas que solo casan por trigramas ya caían en el último nivel. Cambian dos cosas: si
la subcadena llena el cupo, una fila solo difusa no entra como candidata; y dentro del último nivel
las que contienen la consulta van antes que las solo parecidas (antes se mezclaban por similitud).

*Alternativas medidas:* pasar a la columna `search_text` (más lenta: 258–475 ms, la expresión con
parámetro no aprovecha el índice), orden KNN `<->` (105–214 ms).

## Risks / Trade-offs

- [La búsqueda de recordings podría no traer todas las ediciones en grabaciones con miles] →
  hoy el browse tampoco las trae (una página de 100); se compara en la implementación con una
  grabación de más de 100 ediciones y se documenta el tope si existe.
- [Respuestas de la búsqueda de recordings más grandes en la caché] → 25 grabaciones × sus
  ediciones; la caché ya guarda la respuesta completa (no cambia qué se guarda).
- [Redirección tardía en Artistas: la lista local se ve un instante antes del salto] → aceptado
  por decisión de producto; si `redirect()` no funciona dentro del límite transmitido en alguna
  vía, se usa el componente cliente de redirección que reemplaza la URL (`router.replace`) desde
  la parte transmitida.
- [Subcadena primero deja fuera candidatos difusos cuando hay muchas subcadenas] → solo cuando el
  cupo ya está lleno; MusicBrainz sigue aportando en la búsqueda completa.
- [El desplegable muestra brevemente sugerencias de la consulta anterior] → marcadas con
  `aria-busy` y atenuadas; elegir una sigue llevando a esa entidad, que es lo que muestra.

## Migration Plan

Sin migraciones ni cambios de contrato. Despliegue normal; reversión con `git revert`.

## Open Questions

- Ninguna bloqueante. La redirección dentro de `Suspense` se confirma al implementar (ver riesgo).
