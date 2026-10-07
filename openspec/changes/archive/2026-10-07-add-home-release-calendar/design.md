## Context

- El riel de Inicio (`ReleaseRail`, línea de tiempo con marcador "hoy") ya está implementado; los datos
  salen de `listHomeReleases` en `src/services/home/home.ts`, que hoy es maqueta.
- `release_group.first_release_date` ya existe (migración 0016) y solo se puebla con precisión diaria.
- La discografía de un artista se sincroniza una vez (`discography_synced_at`), por lo que los anuncios
  posteriores no llegan al catálogo.
- No hay infraestructura de cron: los procesos periódicos del proyecto son scripts en `scripts/` o
  refrescos bajo demanda con `after()` de Next.
- Prueba del 2026-10-06 contra ListenBrainz (resultados en la conversación del cambio):
  - `GET /1/explore/fresh-releases/` (sin auth, máximo 90 días por lado) devuelve una fila por
    release-group con `release_date`, `release_group_primary_type`, `caa_id`, `artist_mbids`,
    `release_tags` y `listen_count`. **`listen_count` vale siempre 0**: no sirve como señal.
  - Volumen: 8.684 filas en los últimos 30 días (3.467 álbum/EP con carátula); 1.241 en los próximos 90
    (844 álbum/EP con carátula). Los anuncios se concentran en los primeros 60 días (oct 552, nov 251,
    dic 40).
  - `POST /1/popularity/artist` con hasta ~900 MBID devuelve `total_user_count` por artista. Ordenar por
    eso da un top coherente (U2, Queens of the Stone Age, Kings of Leon, Peter Gabriel…).
  - El feed no trae tipos secundarios: en el top aparecen discos en vivo. Una búsqueda de MusicBrainz
    `rgid:(A OR B OR …)` devuelve `secondary-types` y `first-release-date` de todo el lote en una request.
  - Solo 292 de 4.179 artistas de la ventana están en nuestro catálogo y 2 tienen seguidores.

## Goals / Non-Goals

**Goals:**
- Datos reales en el riel, filtrados por calidad y relevancia, con carátula.
- Selección personal para usuarios autenticados basada en su propia relación con artistas.
- Crecimiento del catálogo acotado a lo que realmente se muestra (Principio 4).
- Costo externo bajo y predecible: ~3 requests a ListenBrainz y 1 a MusicBrainz por día.

**Non-Goals:**
- Curación editorial, notificaciones de lanzamientos, página de calendario completa, cron.
- Recomendación por gustos inferidos.

## Decisions

### 1. ListenBrainz como fuente del calendario, MusicBrainz como verificación
ListenBrainz es del mismo proyecto que MusicBrainz, usa sus MBID y publica en CC0; resuelve el "de dónde
sale la lista" que bloqueaba el apartado. Se crea `src/services/listenbrainz/client.ts` como único punto de
salida (igual que los clientes de MusicBrainz y Wikimedia): exige `LISTENBRAINZ_USER_AGENT`, serializa las
requests y expone `freshReleases({ pivot, days, past, future })` y `artistPopularity(mbids)` (en lotes).
- *Alternativas:* búsqueda de MusicBrainz por rango de fechas (sin señal de relevancia, miles de
  resultados); Spotify / Apple Music (términos impiden cachear y mezclar); scraping de Metal Archives o
  AOTY (sin API). Descartadas.

### 2. Tabla de calendario separada del catálogo
`release_calendar_entry` guarda la ventana completa del feed:
`id`, `release_group_mbid` (único), `release_mbid`, `title`, `artist_credit_name`, `artist_mbids uuid[]`,
`release_date date`, `primary_type`, `has_cover bool`, `artist_listeners int NULL`,
`verified_at timestamptz NULL`, `exclusion text NULL` (`CHECK IN ('secondary_type','reissue')`),
`first_release_date date NULL` (verificada), `release_group_id uuid NULL` (FK `ON DELETE SET NULL`),
`anonymous_rank smallint NULL` (decisión 6), `synced_at timestamptz`. Índices por `release_date` y GIN por `artist_mbids` (para cruzar con los
artistas de un usuario). El estado de sincronización (última exitosa) se guarda en una fila de
`release_calendar_sync` (`id`, `started_at`, `finished_at`, `status`, `entry_count`).
- Es un índice de lo que existe, no catálogo: resuelve la tensión con el Principio 4. Al catálogo solo
  entra lo que se muestra (decisión 5).
- *Alternativa:* ingerir todo el feed como stubs de release-group. Descartada: ~10.000 filas diarias de
  discos que nadie buscó.

### 3. Sincronización: reemplazo completo de la ventana
Una sola a la vez: bajo un `pg_advisory_xact_lock` de clave `release-calendar` (transacción corta) se
comprueba que no haya una fila `running` de menos de 15 minutos en `release_calendar_sync` y se inserta
la propia; si la hay, se sale sin hacer nada. La fila pasa a `succeeded`/`failed` al terminar. Pasos:
1. Dos requests a fresh-releases (pasado 30 días, futuro 90 días).
2. Filtro local: precisión diaria y `Album`/`EP`. Lo demás se descarta antes de guardar para mantener la
   tabla chica (~5.400 filas). Las que no tienen `caa_id` se guardan con `has_cover = false`: no sirven
   para la selección anónima, pero sí para la marca "Anunciado" de artistas seguidos.
3. Popularidad de artistas en lotes de 500.
4. Reemplazo transaccional: `DELETE` + `INSERT` de la ventana, conservando `verified_at`,
   `first_release_date`, `exclusion` y `release_group_id` de las entradas que ya existían (se cruzan por
   `release_group_mbid` antes del borrado).
5. Verificación de finalistas (decisión 4) y vinculación al catálogo (decisión 5).
Las requests externas ocurren fuera de la transacción; si alguna falla, no se escribe nada y se registra
`status = 'failed'`.
- *Disparo:* Inicio llama `ensureReleaseCalendarFresh()` dentro de `after()` cuando la última sincronización
  exitosa tiene más de 24 h o no existe. `scripts/sync-release-calendar.ts` fuerza la sincronización (uso
  operativo y primer llenado). Mismo patrón que los refrescos de perfil de artista.

### 4. Verificación por lote solo de finalistas
Verificar las ~4.300 entradas costaría ~45 requests a MusicBrainz por día. En cambio se verifica solo lo
que puede mostrarse: los 24 elegidos de la selección anónima (si las exclusiones la acortan se vuelve a
elegir, hasta 5 vueltas) más las entradas de artistas que algún usuario tiene en relación (tope 150). Se
usa `musicbrainz.searchReleaseGroupsByMbid` (`rgid:(A OR B …)`) en lotes de hasta 50. Resultado: con tipos
secundarios → `exclusion = 'secondary_type'`; `first-release-date` anterior al inicio de la ventana →
`exclusion = 'reissue'`; sin resultado → queda sin verificar y se reintenta en la próxima sincronización
(el índice de búsqueda de MusicBrainz puede ir atrasado). Las selecciones se arman tras verificar, iterando
si las exclusiones dejan un lado corto.

### 5. Solo lo mostrado entra al catálogo, como stub
Al cerrar la selección anónima (24 discos) y los discos de artistas con relación de usuarios, se llama
`upsertReleaseGroupStubs` + `ingestCredits` (mismo camino que la búsqueda de álbumes) con la fecha
verificada, y se guarda `release_group_id` en la entrada. La carátula se resuelve con el pipeline
existente (`resolveCoverThumbUrl` / espejo); si CAA no la confirma, el disco sale de la selección anónima.
La tarjeta enlaza a `/album/{id}` como hoy.

### 6. Selección anónima
Score = `log10(1 + oyentes)` + impulso de comunidad (`+1` si el artista está en el catálogo con
seguidores, valoraciones o escuchas; `+0,5` por cada señal adicional, tope `+2`). Orden por score
descendente, un disco por artista en todo el riel, tope de 3 por familia de géneros por lado (si el artista está en el catálogo y
tiene géneros efectivos; si no, no cuenta para el tope). Recientes: 30 días; próximos: 60, ampliable a 90
si quedan menos de 4. Hasta 12 por lado. Se calcula una vez por sincronización y se guarda como orden
(`anonymous_rank smallint NULL` en la entrada) para que Inicio solo haga un `SELECT`.
- *Por qué el impulso y no un filtro de comunidad:* hoy el cruce con el catálogo es demasiado escaso
  (292 artistas) para sostener el riel; el impulso gana peso a medida que crece la comunidad.

### 7. Selección personal (por request)
Se calcula al renderizar Inicio autenticado, con una consulta:
1. Artistas en relación con el usuario y su peso (sigue 4; favorito o valoración ≥ 4 estrellas 3;
   escucha 2; colección o "En tu búsqueda" 1), uniendo `artist_follow`, `favorite`, `rating`,
   `listen_entry`, `collection_entry` y `wanted_entry` a través de los créditos primarios.
2. Cruce con el calendario por `artist_mbids && ARRAY[...]` (entradas no excluidas, últimos 30 días y
   próximos 90) y con `release_group` del catálogo con `first_release_date` entre hoy y hoy + 180 (más
   allá de la ventana del feed).
3. Orden: peso de la relación, luego cercanía a hoy. Hasta 20. Los de artistas seguidos sin carátula
   entran con placeholder y marca "Anunciado"; el resto exige carátula.
4. Si quedan menos de 6, se completan con la selección anónima marcada "Destacado".
Para que los discos de artistas en relación tengan página, la sincronización vincula (decisión 5) todas
las entradas verificadas cuyos artistas tengan alguna relación con algún usuario: es catálogo que crece
por uso real.

### 8. UI
`HomeRelease` suma `badge: 'announced' | 'featured' | null`. `ReleaseRail` mantiene el diseño actual y
agrega el chip; `HomeReleases` resuelve los textos. Si no hay ningún disco, el apartado no se renderiza
(comportamiento actual). `/album/[id]` muestra "Sale el …" y un estado vacío de tracklist para discos
futuros.

## Risks / Trade-offs

- [ListenBrainz cambia o cae la API] → el calendario anterior se conserva; el riel se oculta si queda vacío.
  El cliente aislado limita el impacto.
- [Las fechas futuras se corren] → la sincronización diaria reemplaza la ventana; un disco movido fuera de
  ella sale del riel. Los stubs ya creados quedan en el catálogo con la fecha que tenían (se corrige al
  re-verificar si vuelve a entrar).
- [Popularidad global sesgada a la audiencia de ListenBrainz (anglo, rock/indie)] → impulso por comunidad
  propia y tope por familia de géneros; revisar el balance tras unas semanas de datos.
- [`after()` largo en entornos serverless] → la sincronización completa toma ~10 s (3-4 requests a
  ListenBrainz + 1-2 a MusicBrainz con rate limit); si el entorno corta, queda `failed` y el script sirve
  de respaldo.
- [Índice de búsqueda de MusicBrainz atrasado] → los no encontrados no se muestran y se reintentan.
- [El feed trae `caa_id` pero CAA no sirve la miniatura de release-group] → se valida con el pipeline
  existente antes de mostrar.

## Migration Plan

1. Aplicar `0063_release_calendar.sql` (solo tablas nuevas; sin backfill).
2. Definir `LISTENBRAINZ_USER_AGENT` en el entorno.
3. Correr `scripts/sync-release-calendar.ts` una vez para el primer llenado (si no, la primera visita a
   Inicio lo dispara).
4. Rollback: revertir el código vuelve a la maqueta; las tablas nuevas pueden quedar sin uso.

## Open Questions

- ¿Sumar una página "Ver todos" del calendario personal más adelante? (fuera de alcance).
- Pesos exactos del score y de la relación: se fijan en la implementación y se ajustan con datos reales.
