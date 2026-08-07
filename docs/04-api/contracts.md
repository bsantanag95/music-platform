# Contrato de API — `/api/catalog/*`

Documenta el contrato real de los endpoints existentes (Fases 1-2) y las brechas que
`02-architecture/frontend-plan/00-backend-analysis.md` identificó como necesarias para la
Fase 3. Ver ADR 0006 sobre por qué este contrato es REST y no tRPC.

## `GET /api/catalog/search?q=<nombre>` — ✅ Existe

Busca (o ingiere bajo demanda) un artista por nombre y su discografía completa.

**Query params:** `q` (string, requerido).

**200 OK**
```json
{
  "artist": {
    "id": "uuid",
    "mbid": "uuid | null",
    "type": "person | group | various | unknown",
    "name": "string",
    "bio": "string | null",
    "photoUrl": "string | null",
    "createdAt": "ISO 8601",
    "discographySyncedAt": "ISO 8601 | null"
  },
  "releaseGroups": [
    {
      "id": "uuid",
      "mbid": "uuid | null",
      "title": "string",
      "category": "studio | single_ep | compilation | live_other",
      "createdAt": "ISO 8601"
    }
  ]
}
```

**400** si falta `q`. **404** si MusicBrainz no devuelve ningún resultado para ese nombre.

**Nota de latencia:** si el artista no estaba cacheado, esta llamada dispara ingesta
completa (artista + discografía) contra MusicBrainz — puede tardar varios segundos según
la cantidad de álbumes. Ver riesgo 1 de `frontend-plan/04-risks.md`.

## `GET /api/catalog/release-group/[id]` — ✅ Existe

Trae (o ingiere bajo demanda) el tracklist de la edición "oficial" de un álbum ya
conocido por su `id` propio (no `mbid`).

**200 OK**
```json
{
  "release": {
    "id": "uuid",
    "mbid": "uuid | null",
    "releaseGroupId": "uuid",
    "editionLabel": "string",
    "releaseDate": "YYYY-MM-DD | null",
    "coverThumbUrl": "string | null"
  },
  "cover": "string | null",
  "tracks": [
    {
      "recordingId": "uuid",
      "position": "int",
      "discNumber": "int",
      "title": "string",
      "durationSec": "int | null",
      "credits": [
        { "artistId": "uuid", "name": "string", "role": "primary | featured", "joinPhrase": "string | null" }
      ]
    }
  ]
}
```

**404** si el `id` no corresponde a ningún `release_group`, o si MusicBrainz no tiene
ninguna edición ingerible para ese álbum.

**Nota:** `cover` se resuelve contra Cover Art Archive a nivel de **release-group**
(`coverartarchive.org/release-group/{mbid}/front-250`, siempre baja resolución, ver
`03-data/data-licensing.md`) al ingestar la edición y se cachea en `release.cover_thumb_url`.
Vale `null` cuando el álbum no tiene carátula. Nunca construir esta URL a mano en el frontend.

**Créditos por canción:** cada elemento de `tracks` incluye `credits: [{ artistId, name, role, joinPhrase }]`, ordenado por posición. Se arma con un `JOIN` de `credit` + `artist` sobre los `recordingId` de todo el tracklist en una sola query (no una query por canción).

## `GET /api/catalog/artist/[id]` — ✅ Existe

Perfil de artista navegable directo por `id` propio. Si el artista es un stub
(`type='unknown'`), se enriquece contra MusicBrainz por id antes de responder — mismo
patrón que `findOrIngestArtist` aplica a stubs encontrados por nombre.

**200 OK:** mismo shape que `GET /api/catalog/search` — `{ artist, releaseGroups }`.

**404** con `code: ARTIST_NOT_FOUND` si el `id` no corresponde a ningún artista.

## `GET /api/catalog/recording/[id]` — ❌ No existe (diferido a Fase 4)

**Decisión de producto confirmada:** la Fase 3 cierra el catálogo navegable en el
tracklist del álbum, sin página propia de canción (Camino A de
`frontend-plan/02-implementation-plan.md`, Etapa 3.5). Este endpoint se construye recién
en Fase 4, junto con el formulario de valoración/comentario sobre la misma pantalla —
evita reescribir la vista dos veces.
