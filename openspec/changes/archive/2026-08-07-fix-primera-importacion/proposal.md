## Why

El formulario de búsqueda muestra el mensaje "Estamos importando este artista por primera vez..." en **todas** las búsquedas, aunque el artista ya esté cacheado en Postgres. Para un artista registrado (ej. Sabrina Carpenter) la respuesta tarda <100ms, pero el mensaje engaña a la persona haciéndole creer que ocurre una importación lenta cada vez.

## What Changes

- **Comunicar la primera importación solo cuando corresponde:** el aviso de primera importación aparece únicamente si el request supera un umbral de duración (~3s), que es el tiempo real de una ingesta bajo demanda (rate limit de MusicBrainz ≥1.1s por request).
- **Mensaje neutro durante la carga:** mientras el request está pendiente, se muestra un mensaje genérico de consulta (sin afirmar que es una importación).
- **Sin cambios de contrato REST:** el backend ya responde rápido para artistas cacheados; el fix es puramente de UI e i18n.

## Capabilities

### New Capabilities

- Ninguna.

### Modified Capabilities

- `catalog-search`: el requisito "Estados de búsqueda" cambia — el mensaje contextual de carga deja de afirmar incondicionalmente que ocurre una primera importación y pasa a mostrarlo solo ante requests lentos.

## Impact

- `src/components/catalog/SearchForm.tsx` — estado nuevo para detectar request lento + timer.
- `src/components/catalog/SearchForm.test.tsx` — tests de carga con fake timers.
- `messages/{es,en}/catalog.json` — nueva clave `search.loading` (mensaje neutro); `search.loadingHint` pasa a ser la variante de primera importación.
- No se tocan servicios (`catalog/`, `musicbrainz/`), ni esquema de base de datos, ni contratos REST.
