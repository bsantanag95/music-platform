## Why

El buscador de objetivos del diálogo "Añadir" (`TargetPicker`) es lento justo cuando más se usa: mientras se
escribe. Medido contra el servidor de desarrollo, escribiendo con pausas de 400 ms la consulta final tardó
**13,8 s** en Canciones y **3,0 s** en Álbumes, contra ~0,1 s de las sugerencias locales
(`/api/search/suggest`). Hay tres causas:

1. el diálogo espera siempre a MusicBrainz aunque las sugerencias locales ya tengan la respuesta;
2. las búsquedas obsoletas no se cancelan en el servidor y ocupan la cola de MusicBrainz (≥ 1,1 s por
   solicitud, global y compartida con todas las personas), así que la consulta vigente queda detrás de las
   viejas;
3. en Canciones se gastan hasta cuatro browse de apariciones que el diálogo no muestra, y aun así solo el primer
   grupo trae `recordingId`, de modo que el diálogo ofrece como mucho **una** canción.

## What Changes

- El buscador del diálogo muestra primero las coincidencias **locales** (`/api/search/suggest`, espera corta) y
  después suma las de la búsqueda completa (espera más larga, con un mínimo mayor de letras), deduplicadas y sin
  reordenar lo que ya está a la vista.
- **Cancelación real**: el diálogo aborta la solicitud anterior al escribir o cambiar de tipo, y el servidor
  propaga la cancelación hasta la cola de MusicBrainz, que descarta las solicitudes en espera que ya nadie
  necesita (sin afectar a otra búsqueda idéntica que comparta la misma solicitud en vuelo).
- **Modo de elección en Canciones**: `GET /api/catalog/search?type=song&purpose=pick` omite los browse de
  apariciones y da a **cada** grupo una grabación identidad registrable (`recordingId`), a partir de los datos
  de la propia búsqueda de recordings. Sin `purpose`, el comportamiento de `/search` no cambia.
- `docs/04-api/contracts.md` documenta el parámetro `purpose` y la cancelación (y se elimina la sección
  duplicada de `GET /api/catalog/search`).

## Goals

- Que el diálogo muestre resultados en unos cientos de milisegundos cuando el objetivo ya está en el catálogo.
- Que la consulta vigente nunca espere detrás de consultas obsoletas en la cola de MusicBrainz.
- Que el tipo Canción del diálogo ofrezca varias canciones elegibles y cueste como mucho tres solicitudes a
  MusicBrainz.

## Non-Goals

- Cambiar la página `/search`, su orden o su streaming (solo se beneficia de la cancelación).
- Cambiar el intervalo de rate limit de MusicBrainz o usar otra fuente de búsqueda.
- Introducir TanStack Query en el Header (sigue fuera de `<Providers>`).
- Mostrar carátulas en los resultados del diálogo.

## Capabilities

### New Capabilities

_Ninguna._

### Modified Capabilities

- `header-quick-actions`: el requisito "Buscador de objetivos compartido" pasa a buscar en dos fases (local
  inmediata + completa) con cancelación de la búsqueda obsoleta.
- `catalog-search`: el endpoint acepta `purpose=pick` en Canciones (todos los grupos con grabación identidad, sin
  browse de apariciones), el presupuesto de MusicBrainz suma ese modo y se añade la cancelación de búsquedas
  abandonadas.

## Impact

- **Cliente**: `src/components/quick-actions/TargetPicker.tsx` (+ test), `src/lib/api/catalog.ts`
  (`signal` y `purpose` en `searchSongs`/`searchAlbums`/`searchArtists`).
- **API**: `src/app/api/catalog/search/route.ts`, `src/services/catalog/search/{params,index,songs,albums,
  artists}.ts`.
- **MusicBrainz**: `src/services/musicbrainz/client.ts` (`schedule`, `mbFetch`, `cachedSearch` aceptan una señal
  de cancelación con conteo de interesados).
- **Docs**: `docs/04-api/contracts.md`.
- Sin migraciones ni dependencias nuevas. El modo de elección registra grabaciones (con sus créditos) para los
  grupos que muestra, igual que hoy lo hace para el primero.
