## Why

El feed muestra el nombre del artista debajo del título para un álbum o una canción (ej.
"My Man on Willpower" · "Sabrina Carpenter"), pero ese nombre es texto plano — no enlaza a
la página del artista. El lector tiene que volver al título del álbum/canción y navegar
desde ahí para llegar al artista, aunque el nombre ya está visible en la fila.

## What Changes

- El nombre del artista acreditado, cuando se muestra junto al título de un álbum o una
  canción en el feed (`FeedActivityList`), pasa a ser un enlace a `/artist/:id`.
- Objetivos de tipo artista no se ven afectados: el título ya enlaza a esa misma página, así
  que no se duplica el enlace.
- Fuentes que no traen el artista acreditado (hoy: el bloque compacto de Inicio /
  `/activity` "Recientes", `CompactActivityRow`) siguen mostrándolo como texto plano — no
  se les suma esta capacidad en esta iteración.

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `activity-feed`: la anatomía de fila del feed principal gana un enlace en el nombre del
  artista acreditado de álbumes y canciones.

## Impact

- **Código**: `src/services/feed/feed.ts` (nueva subquery `PRIMARY_ARTIST_ID_SQL`, hermana
  de `PRIMARY_ARTIST_SQL`, sumada a las cinco fuentes con objetivo de catálogo), `home.ts`
  (mismas cuatro fuentes), `src/lib/api/schemas.ts` (`artistId` opcional en los esquemas de
  objetivo del feed), `src/components/feed/feed-row-parts.tsx` (`TargetTitle` gana
  `artistHref`), `FeedActivityList.tsx` (`targetLink` computa el href del artista).
- **Superficies visuales**: `/me/feed`, el preview de feed y de rastro reciente de Inicio, y
  las pestañas "De la gente que seguís" / "Tu actividad" de `/activity` heredan el enlace
  por reusar `FeedActivityList`. `CompactActivityRow` (Inicio, "Recientes" de `/activity`)
  no se toca — nunca mostró el nombre del artista.
- **Sin migraciones**: `artistId` se deriva de `credit`, ya existente; no hace falta ninguna
  tabla ni columna nueva.
