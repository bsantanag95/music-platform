## Context

La ficha del artista se llena con el lookup de MusicBrainz `inc=artist-rels+url-rels` (`mapArtistProfileFacts`) y se
refresca en segundo plano cada 30 días. `curatedArtistLinks` elige sitio oficial, Bandcamp y una plataforma de streaming
y los guarda en `artist_link` (`CHECK` sobre `kind`, `UNIQUE (artist_id, kind)`). La cabecera los muestra en la fila
Enlaces. MusicBrainz registra la página del artista en setlist.fm como relación `setlistfm`
(ej. `https://www.setlist.fm/setlists/motley-crue-bd6b5d2.html`).

Se evaluó y descartó una pestaña Shows con la API de setlist.fm: exige clave, tiene cuota diaria, solo permite uso no
comercial y prohíbe guardar los datos, y en la práctica sería una lista de enlaces salientes.

## Goals / Non-Goals

**Goals:** enlace a los conciertos en setlist.fm desde la ficha, sin requests nuevas ni uso de la API.

**Non-Goals:** API de setlist.fm, lista de conciertos, conciertos asistidos, otros servicios de conciertos.

## Decisions

### D1. Guardar el enlace como un tipo más de `artist_link`

Sale gratis del lookup que ya hacemos y reusa la tabla, la sincronización y la lectura. Requiere rehacer el `CHECK` de
`kind` (migración `0090`, aditiva: ninguna fila existente lo viola). Se acepta solo una relación `setlistfm` activa con
host `setlist.fm` o `www.setlist.fm`, para no guardar URLs arbitrarias.
*Alternativa descartada:* no guardar nada y enlazar siempre a la búsqueda por nombre: con nombres comunes la búsqueda
mezcla artistas; la URL de MusicBrainz es exacta.

### D2. Respaldo con la búsqueda por nombre, sin backfill

Las fichas existentes no tienen el enlace hasta su próxima actualización (≤30 días). En lugar de un backfill que
recorrería MusicBrainz para todo el catálogo, la cabecera enlaza a `https://www.setlist.fm/search?query=<nombre>` cuando
no hay enlace guardado. Así todo grupo o persona tiene la fila desde el primer día, y mejora sola con el refresco.
El respaldo solo se ofrece a `group` y `person`: los stubs `unknown` y `various` no tienen conciertos útiles.

### D3. Fila propia "En vivo" en lugar de sumarlo a Enlaces

Enlaces agrupa los sitios del artista (oficial, Bandcamp, Wikipedia, streaming); setlist.fm es otra cosa (su vida en
vivo) y con una fila propia se lee como dato de la ficha, cerca de Actividad e Integrantes. Va después de Enlaces, con el
mismo estilo de enlace externo (`↗`, sin color de acento, pestaña nueva, `noopener noreferrer`).

### D4. Construcción de la URL de búsqueda

Se arma en `artist-format.ts` (junto a `streamingName`) con `URLSearchParams`, no a mano, para codificar bien nombres con
espacios, acentos o `&`.

## Risks / Trade-offs

- [La búsqueda por nombre puede traer homónimos] → solo mientras no haya enlace guardado; desaparece con el refresco.
- [Un artista sin conciertos en setlist.fm muestra igualmente la fila] → la búsqueda de setlist.fm muestra que no hay
  resultados; aceptado frente a consultar su API.
- [El refresco de 30 días tarda en traer el enlace] → aceptado; el respaldo cubre el intervalo.

## Migration Plan

Aplicar `0090` (`pnpm run db:migrate`) antes de desplegar: sin ella, guardar un enlace `setlistfm` viola el `CHECK` y la
actualización de la ficha falla. Rollback: revertir el código; la migración puede quedarse (es más permisiva).

## Open Questions

Ninguna.
