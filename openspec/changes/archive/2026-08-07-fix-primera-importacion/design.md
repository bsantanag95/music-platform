## Context

`SearchForm.tsx` muestra `catalog.search.loadingHint` ("Estamos importando este artista por primera vez...") de forma incondicional mientras `isSearching` es `true` (SearchForm.tsx:101-105). Para un artista cacheado en Postgres el backend responde en <100ms sin tocar MusicBrainz, pero el mensaje sigue afirmando que ocurre una primera importación. El frontend no conoce de antemano el estado de cache del artista: el mensaje se decide *durante* el request, cuando todavía no se sabe si será rápido o lento.

## Goals / Non-Goals

**Goals:**
- Comunicar la primera importación solo cuando efectivamente corresponde (request lento), y mostrar un mensaje neutro el resto del tiempo.
- Mantener la advertencia útil para primeras importaciones reales.
- Mantener el contrato REST intacto (el backend ya es correcto y rápido para artistas cacheados).

**Non-Goals:**
- No cambiar el backend ni el esquema de datos.
- No distinguir en el servidor entre artista cacheado y no cacheado.
- No tocar la carga de carátulas ni la discografía.

## Decisions

**D1 — Detectar request lento con un timeout del lado del cliente (umbral ~3s).**
La duración del request es un buen discriminador: una primera ingesta (búsqueda de artista + browse de discografía, cada una con rate limit ≥1.1s contra MusicBrainz) tarda ~2.5-3s, mientras un artista cacheado responde en <100ms. Se arranca un `setTimeout` al iniciar la búsqueda; si sigue pendiente al superar el umbral, se muestra el aviso de primera importación.
- *Alternativa considerada:* que el backend devuelva una flag `ingested`. Descartada porque el mensaje debe aparecer *durante* el request, antes de tener la respuesta — el flag solo serviría retroactivamente.
- *Alternativa considerada:* texto neutro siempre. Descartada porque pierde la advertencia útil para primeras importaciones.

**D2 — Dos mensajes: neutro (`search.loading`) + variante de primera importación (`search.loadingHint`).**
Se agrega una clave i18n nueva `search.loading` (mensaje neutro) y `search.loadingHint` queda como variante de primera importación. Ambos locales (`es`, `en`) se actualizan juntos para mantener la consistencia que valida el test de claves de i18n.

**D3 — Timer con cleanup en `finally` y en unmount.**
El timer se guarda en un `ref` y se limpia en el `finally` del handler (cubre éxito y error) y en el cleanup de un `useEffect` de unmount, evitando `setState` sobre un componente desmontado. Las búsquedas no se solapan (el botón queda deshabilitado), así que no hay riesgo de timers concurrentes.

## Risks / Trade-offs

- [Un artista cacheado con discografía enorme pero sin tracklists sincronizados puede ser lento *después* de la búsqueda (en la página de artista, por carátulas lazy)] → Fuera de alcance: el aviso es sobre el request de búsqueda; la página de artista ya muestra skeletons por álbum.
- [El umbral de 3s puede disparar el aviso en conexiones muy lentas aunque el artista esté cacheado] → El aviso es solo informativo ("puede que tome algunos segundos"), no bloqueante; no daña la experiencia.
- [Tests con timers reales podrían ser flaky] → Se usan `vi.useFakeTimers()` en los tests de carga.
