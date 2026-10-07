# ADR 0029 — Calendario de lanzamientos desde ListenBrainz

## Estado

Aceptado (cambio `add-home-release-calendar`, 2026-10). Agrega una fuente externa nueva (ListenBrainz) y resuelve, para
este apartado, la tensión con el Principio 4 ("el catálogo crece por uso real, nunca precargado en masa") que
`docs/05-features/home.md` dejaba abierta.

## Contexto

El riel "Lanzamientos recientes y próximos" de Inicio mostraba datos de maqueta. Faltaba de dónde sacar la lista:

- MusicBrainz tiene los anuncios (los editores cargan discos con fecha futura) pero no un feed: buscar por rango de fechas
  devuelve todo lo que sale en el mundo, sin señal de relevancia. Además la discografía de un artista se sincroniza una
  sola vez, así que un anuncio posterior a la primera visita nunca llega al catálogo.
- Spotify y Apple Music tienen buenos datos de prelanzamientos, pero sus términos impiden guardarlos y mezclarlos con
  otros datos. Metal Archives, AOTY y Metacritic no tienen API.

Prueba del 2026-10-06 contra ListenBrainz (proyecto de MetaBrainz, datos CC0 con los mismos MBID):

- `GET /1/explore/fresh-releases/` (sin token, hasta 90 días por lado) devuelve una fila por release-group con fecha,
  tipo primario, `caa_id` (si alguna edición tiene carátula), MBID de artistas y etiquetas. Su `listen_count` vale
  siempre 0: no sirve como señal.
- Volumen: ~8,7 mil filas en los últimos 30 días y ~1,2 mil en los próximos 90; con carátula y tipo Álbum/EP, ~3,5 mil y
  ~850. Los anuncios se concentran en los primeros 60 días.
- `POST /1/popularity/artist` devuelve los oyentes de cada artista; ordenar por eso da un top coherente.
- El feed no trae tipos secundarios (se cuelan discos en vivo); una búsqueda de MusicBrainz `rgid:(A OR B …)` devuelve
  tipos secundarios y fecha original de todo un lote en una request.

## Decisión

1. **ListenBrainz es la fuente del calendario; MusicBrainz, la verificación.** `src/services/listenbrainz/client.ts` es el
   único punto de salida a ListenBrainz (User-Agent obligatorio `LISTENBRAINZ_USER_AGENT`, requests en serie). La
   verificación usa el cliente de MusicBrainz existente (`searchReleaseGroupsByMbid`, lotes de 50).
2. **El calendario vive en una tabla aparte del catálogo** (`release_calendar_entry`, migración `0063`): es un índice de
   lo que existe, no catálogo. Se reemplaza completo en cada sincronización, conservando la verificación y el vínculo de
   las entradas que siguen.
3. **Al catálogo solo entra lo que se muestra**: los discos de la selección anónima (24) y los de artistas con los que
   alguna persona tiene relación (tope 150 por sincronización) se registran como stub de release-group con sus créditos
   (mismo camino que la búsqueda). Así se resuelve el Principio 4 para este apartado: el catálogo sigue creciendo por uso
   (lo que alguien ve o lo que sigue), no por el feed completo.
4. **Refresco diario bajo demanda, sin cron.** Inicio programa la sincronización con `after()` si la última exitosa tiene
   más de 24 h; `scripts/sync-release-calendar.ts` la fuerza. Una sola a la vez: una fila `running` en
   `release_calendar_sync` (tomada bajo `pg_advisory_xact_lock`) bloquea a las demás durante 15 minutos.
5. **Selección anónima precalculada** en la sincronización (`anonymous_rank`); **la personal se calcula por request** a
   partir de la relación de la persona con artistas.

## Alternativas descartadas

- **Búsqueda de MusicBrainz por rango de fechas.** Sin relevancia y con miles de resultados por mes.
- **Ingerir todo el feed como stubs.** ~10 mil release-groups diarios que nadie buscó: contradice el Principio 4.
- **Verificar todo el feed.** ~45 requests diarias a MusicBrainz para miles de discos que nunca se muestran.
- **Re-sincronizar periódicamente las discografías de los artistas seguidos.** Cubriría la vista personal, pero no la
  anónima, y cuesta varias requests por artista.
- **Curación editorial.** Depende del rol de plataforma aún sin resolver (`product_philosophy.md` §7).

## Consecuencias

- Una dependencia externa nueva (sin dependencias npm): si ListenBrainz cae, se conserva el calendario anterior; si queda
  vacío, el riel no se muestra.
- La popularidad global refleja la audiencia de ListenBrainz (sesgo anglo, rock/indie): la compensan el impulso por
  actividad en la comunidad propia y el tope de 3 por familia de géneros por lado.
- Un disco elegido que luego resulta sin carátula en Cover Art Archive puede quedar como stub en el catálogo aunque no
  se muestre (como en la búsqueda).
- La sincronización tarda ~40 s (medido en scratch con datos reales); en un entorno que corte las tareas posteriores a la
  respuesta queda `failed` y el script sirve de respaldo.
