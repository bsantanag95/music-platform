## Context

`findOrIngestOwnDiscography` (`src/services/catalog/ingest-discography.ts`) sirve la discografía guardada
y, si `needsDiscographyRefresh` lo indica (nunca completa o `discography_complete_at` con más de 7 días),
programa `syncArtistDiscography({ mode: "full" })` en `after()`. Esa sincronización recorre el browse de
release-groups (100 por página, tope de 20) dentro de una transacción con `pg_advisory_xact_lock` por
artista, hace upsert de cada disco con sus créditos y marca o desmarca los discos que quedan fuera.

Medido en la BD de scratch (2026-10-07): 885 artistas con discografía, 803 con algún disco; un ciclo completo
son ~1.140 requests (~21 min de la cola de MusicBrainz). La mediana es de 31 discos y 145 artistas
ocupan más de una página (máximo, 2.077 discos = 21 páginas).

El calendario de Inicio (`src/services/home/release-calendar-sync.ts`, ADR 0029) reemplaza cada día
`release_calendar_entry` con el feed de ListenBrainz (30 días atrás y los próximos), con `artist_mbids`
indexado por GIN y `exclusion` para los discos descartados al verificar. Solo vincula al catálogo
(stub + créditos) los discos que se muestran. Hoy el feed tiene ~5.800 entradas; 22 artistas con
discografía guardada figuran en él, con 28 entradas sin vincular.

`discography_complete_at` no es solo un dato de frescura: lo leen la página de artista
(`discographyComplete`) y el descubrimiento de géneros (`src/services/genres/artists.ts`: tamaño, debut
y filtro «sin explorar»).

## Goals / Non-Goals

**Goals:**
- Que la siguiente visita a un artista con un lanzamiento detectado por el calendario lo resincronice.
- Que un artista con más de 100 discos cuya discografía no cambió cueste 1 request por ciclo.
- Mantener la red de seguridad del recorrido completo y no cambiar el significado de
  `discography_complete_at`.

**Non-Goals:**
- Cron, jobs o refresco de artistas no visitados.
- Mostrar el disco en la misma visita que dispara el refresco.
- Refrescar tracklists, ediciones o créditos de álbumes.

## Decisions

### 1. Tres columnas nuevas en `artist`, sin tocar `discography_complete_at`

Migración `0064_artist_discography_refresh.sql`, aditiva:

- `discography_mb_total INTEGER NULL`: `release-group-count` que informó MusicBrainz en la última
  sincronización completa (no truncada). `NULL` = desconocido → no hay atajo hasta el próximo recorrido
  completo. `CHECK (discography_mb_total IS NULL OR discography_mb_total >= 0)`.
- `discography_checked_at TIMESTAMPTZ NULL`: última vez que la discografía se dio por vigente (recorrido
  completo o verificación barata).
- `discography_refresh_requested_at TIMESTAMPTZ NULL`: última solicitud de resincronización del calendario.

La frescura pasa a medirse desde `coalesce(discography_checked_at, discography_complete_at)`. Así, los
artistas existentes se comportan igual que hoy hasta su próxima sincronización.

*Alternativa descartada:* poner `discography_complete_at = NULL` para pedir el refresco (reusar
`needsDiscographyRefresh` sin columnas nuevas). Haría que el artista aparezca como «sin explorar» en
géneros y con la discografía incompleta en su página hasta la próxima visita: un efecto colateral visible.

### 2. Cuándo se resincroniza (`needsDiscographyRefresh`)

```
checked = coalesce(checked_at, complete_at)
refrescar si:  complete_at IS NULL
           o   now - checked > 7 días
           o   refresh_requested_at > checked
```

Sin cambios para la primera visita (`mode: "initial"`) ni para el candado por artista.

### 3. Verificación barata dentro de `syncArtistDiscography({ mode: "full" })`

Se pide la página 1 como hoy. Luego:

```
forzar recorrido completo si:  mb_total IS NULL
                           o   refresh_requested_at > checked
                           o   now - complete_at > 30 días
si total(página 1) <= 100            → ya está todo: camino completo actual
si !forzar y total == mb_total       → atajo: upsert de la página 1, checked_at = now
en otro caso                         → seguir con las páginas 2..N (reusando la 1): camino completo
```

El camino completo, además de lo que hace hoy, fija `discography_mb_total = total` (solo si no se
truncó) y `discography_checked_at = now`. El atajo **no** marca ni desmarca discos (no conoce la lista
completa) y **no** toca `discography_complete_at`. El orden del browse no es documentado por MusicBrainz,
así que el atajo no compara contenidos, solo el total.

`fetchDiscographyPages` se divide para poder pedir la primera página, decidir y continuar sin repetir
requests. El resultado del sync suma un estado `verified` (atajo) para el backfill y los tests.

*Alternativa descartada:* comparar con el número de discos acreditados en la base. Ese número incluye
stubs creados fuera del browse (búsqueda, calendario, créditos de álbum) y discos marcados como fuera de la
discografía, así que nunca coincide de forma fiable.

*Alternativa descartada:* bajar el intervalo de 7 días. Multiplica el costo para todos los artistas
visitados, cambien o no.

### 4. Marca desde el calendario, en una sola sentencia al final de `runSync`

Después de persistir las entradas, dentro de la misma sincronización del calendario:

```sql
UPDATE artist a SET discography_refresh_requested_at = now()
FROM release_calendar_entry e
WHERE a.mbid = ANY (e.artist_mbids)
  AND a.discography_synced_at IS NOT NULL
  AND e.exclusion IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM release_group rg JOIN credit c ON c.release_group_id = rg.id
    WHERE rg.mbid = e.release_group_mbid AND c.artist_id = a.id)
  AND coalesce(a.discography_checked_at, a.discography_complete_at, '-infinity') < now() - interval '24 hours'
```

- Las entradas sin verificar también cuentan: la resincronización usa los tipos del browse, no los del feed.
- La condición de 24 h acota a una resincronización por artista por día. Si el disco no entra nunca a la
  discografía (por ejemplo, porque todas sus ediciones son bootleg), el artista se resincroniza como mucho
  una vez al día mientras el disco siga en la ventana del calendario.
- Un disco ya vinculado por el calendario (stub + créditos) no dispara nada: ya está en la discografía.
- Un fallo de esta sentencia se registra y no hace fallar la sincronización del calendario.
- No hace requests a MusicBrainz ni a ListenBrainz.

*Alternativa descartada:* vincular directamente esas entradas desde el calendario (stub + créditos). El
disco aparecería sin el tipo verificado (el feed deja pasar en vivo y recopilatorios como `Album`) y la
regla del calendario limita el ingreso al catálogo a los discos mostrados.

### 5. Backfill

`scripts/backfill-artist-discography.ts` sigue forzando el recorrido completo, con una opción explícita del
sync (`forceFullWalk`) que salta el atajo. Solo importa con `--artist`: las demás selecciones del script son
artistas sin recorrido completo, que nunca toman el atajo. El script no llena `discography_mb_total` de los
artistas ya completos (los omite mientras estén al día); el total se llena en la próxima resincronización
de cada uno, que es completa porque el total es desconocido.

## Risks / Trade-offs

- [Un alta y una baja en el mismo período dejan el total igual] → el atajo no lo ve; el recorrido completo
  cada 30 días lo corrige, y el calendario fuerza el recorrido si el alta es un lanzamiento.
- [Un artista con un disco que nunca entra a la discografía] → una resincronización por día como mucho, solo
  si alguien lo visita y solo mientras el disco siga en el calendario (≤ 30 días después del lanzamiento).
- [El atajo actualiza solo los 100 discos de la página 1] → los cambios de título o de Wikidata del resto
  esperan al recorrido completo (≤ 30 días). Es aceptable: no afecta qué discos se muestran.
- [La marca depende de que Inicio se visite] → sin visitas a Inicio no hay sincronización del calendario y
  queda el comportamiento actual (7 días).
- [Ahorro moderado con el catálogo actual] → ~30 % de requests; crece con artistas grandes.
- [Artistas con más de 2.000 discos (tope de 20 páginas)] → su total no se guarda (no se recorrió entero),
  así que siguen haciendo el recorrido completo como hoy.

## Migration Plan

1. Aplicar `0064` (aditiva: el código anterior ignora las columnas).
2. Desplegar. Los artistas existentes tienen `discography_mb_total = NULL`: su próxima resincronización es
   completa y llena el total; el atajo empieza a regir en el ciclo siguiente.
3. Rollback: desplegar el código anterior; las columnas quedan sin uso y no requieren borrado.

## Open Questions

(ninguna)
