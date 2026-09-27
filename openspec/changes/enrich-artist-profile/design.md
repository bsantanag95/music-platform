## Context

`artist` guarda `type`, `name`, `bio` (la desambiguación de MusicBrainz), `photo_url` (nunca
se escribe) y las marcas de sincronización. `ingest-artist.ts` sincroniza pertenencias con
`musicbrainz.getArtistWithRelations` (`inc=artist-rels`). MusicBrainz es hoy la única fuente
externa del catálogo (más Cover Art Archive para carátulas).

Verificación en vivo (2026-09-27):

| | Pink Floyd | Los Bunkers | Kuervos del Sur |
|---|---|---|---|
| Relación `wikidata` en MB | ✓ | ✓ | ✓ |
| P18 en Commons | dominio público, 2600×1254 | CC BY-SA 3.0, 500×375 | CC BY-SA 4.0, 4608×3456 |
| Wikipedia es / en | ✓ / ✓ | ✓ / ✓ | ✓ / — |

Trampas encontradas: la miniatura del resumen de Wikipedia en inglés de Pink Floyd es una
imagen de uso justo alojada en `upload.wikimedia.org/wikipedia/en/` (no Commons); la relación
`image` de MusicBrainz de Mon Laferte apunta a un diario argentino. Los géneros de
MusicBrainz son abundantes en artistas masivos y nulos en los pequeños. Para una persona, el
`life-span` es nacimiento y muerte, y el país (`area`) puede no ser el de nacimiento (Mon
Laferte: `MX`, nacida en Viña del Mar).

Decisiones de producto ya tomadas: agregar las fuentes de Wikimedia; resumen en la cabecera y
texto en una pestaña Biografía; los 3 géneros más votados visibles y el resto contraído; sin
nombre legal; con lugar de nacimiento; foto chica rectangular, sin portada; enlaces en orden
fijo, sin redes sociales.

## Goals / Non-Goals

**Goals:**

- Datos de ficha completos y traducibles sin requests extra a MusicBrainz.
- Foto con licencia libre verificada y crédito completo.
- Descripción y resumen en el idioma de cada usuario.
- Cumplir las licencias (CC BY-SA del texto de Wikipedia y de muchas fotos).

**Non-Goals:**

- La interfaz (cabecera, pestaña Biografía): `redesign-artist-page`.
- Espejo propio de las fotos (se sirven miniaturas de Commons; un espejo al estilo de ADR
  0018 queda para después si hace falta).
- Logos de bandas (P154), alias, nombre legal, redes sociales.
- Géneros deducidos de la discografía para artistas sin géneros.
- Integrantes y sus períodos.

## Decisions

**D1 — Wikimedia como fuente del perfil, con ADR nuevo.** ADR 0021: Wikidata (CC0),
Wikipedia (texto CC BY-SA 4.0) y Commons (licencia por archivo) como fuentes del perfil de
artista, siempre subordinadas a MusicBrainz: se llega a ellas solo desde la relación
`wikidata` de MusicBrainz (nunca por nombre, para no confundir homónimos).

**D2 — Cliente único `src/services/wikimedia/client.ts`.** Mismo patrón que el de
MusicBrainz: variable `WIKIMEDIA_USER_AGENT` obligatoria (fail-closed), cola serial,
`maxlag` en la API de Wikidata. Requests por artista: `wbgetentities` (P18, P19/P740,
descripciones, sitelinks), `wbgetentities` de las etiquetas del lugar y su país, TextExtracts
(`exintro`, `explaintext`) por idioma con artículo, `imageinfo` con `extmetadata` e
`iiurlwidth` de la foto. Cinco requests como máximo, en segundo plano.
*Alternativa descartada:* el endpoint REST `page/summary`, que solo trae el primer párrafo y
una miniatura que puede no ser libre.

**D3 — Ficha de MusicBrainz sin requests extra.** `getArtistWithRelations` pasa a
`inc=artist-rels+url-rels+genres`. País, `area`, `begin-area`, `end-area` y `life-span`
vienen en la misma respuesta.

**D4 — Esquema.**

- `artist`: `country`, `begin_area_name`, `end_area_name`, `life_begin` y `life_end` (texto
  con la precisión de MusicBrainz, validado por `CHECK` con el mismo formato que las fechas
  parciales), `life_ended`, `wikidata_id`, `profile_synced_at`, `wikimedia_synced_at`;
  foto: `photo_url` (miniatura), `photo_file`, `photo_author`, `photo_license`,
  `photo_license_url`, `photo_source_url`, `photo_blocked_at`. `bio` → `disambiguation`.
- `artist_genre (artist_id, name, votes)`.
- `artist_link (artist_id, kind, url, position)` con `kind` acotado por `CHECK` a
  `official`, `bandcamp`, `streaming`.
- `artist_localized_text (artist_id, locale, description, summary, summary_title,
  summary_url, place_label)`, con `locale` acotado a `es` y `en`.

**D5 — Licencias de foto.** Lista permitida por `LicenseShortName` normalizado: dominio
público, CC0 y CC BY / CC BY-SA en cualquier versión. Se rechaza si `NonFree` es verdadero o
la licencia no está en la lista. El autor sale de `Artist` (sin HTML). Miniatura de 500 px
de ancho (hotlink a `upload.wikimedia.org`, permitido por Wikimedia).

**D6 — Resumen por idioma con respaldo explícito.** Se guarda la introducción completa en
texto plano por idioma. La lectura devuelve el resumen del idioma pedido o, si no existe, el
del otro con su idioma de origen, para que la interfaz lo indique ("Resumen en español"). La
cabecera recorta a tres líneas; la pestaña Biografía muestra la introducción completa y
enlaza al artículo.

**D7 — Lugar traducido desde Wikidata.** P19 (personas) o P740 (grupos), con la etiqueta
del lugar y la de su país (P17) en `es` y `en`, guardadas ya compuestas ("Viña del Mar,
Chile"). Respaldo: `begin_area_name` de MusicBrainz sin país.

**D8 — Segundo plano con TTL de 30 días.** `after()` con `pg_advisory_xact_lock` por artista,
como las sincronizaciones del álbum. La primera visita de un artista responde sin foto ni
resumen; el backfill cubre a los artistas existentes. Cada paso (ficha de MusicBrainz, foto,
textos) escribe por separado: un fallo en uno no descarta los demás ni pisa datos previos.

**D9 — Retiro de fotos.** `scripts/takedown-artist-photo.ts` vacía la foto y marca
`photo_blocked_at`; mientras la marca exista, el enriquecimiento no asigna foto a ese
artista. Mismo espíritu que el retiro de carátulas.

**D10 — Renombre de `bio`.** Migración con `RENAME COLUMN`; `search/artists.ts`,
`search/suggest.ts` y demás lecturas pasan a `disambiguation`. El tipo `Artist` del contrato
cambia en el mismo cambio.

## Risks / Trade-offs

- [Otras superficies muestran la foto sin crédito (artistas seguidos, Exploración)] → el
  crédito completo está en la página del artista, a un clic; el `alt` nombra al artista. Ver
  Open Questions.
- [Recortar el resumen a tres líneas podría leerse como una adaptación del texto CC BY-SA] →
  la cabecera muestra un fragmento con enlace al texto completo y a la licencia, práctica
  habitual (MusicBrainz hace lo mismo).
- [Primera visita sin foto ni resumen] → aceptado para no sumar hasta 5 requests síncronas;
  el backfill cubre a los más visitados.
- [Vandalismo en Wikipedia o Wikidata] → la actualización cada 30 días lo corrige con el
  tiempo; el retiro de fotos cubre el caso urgente de la imagen.
- [Calidad variable de la foto (Los Bunkers: 500×375)] → la foto se muestra chica; no hay
  portada que dependa de la resolución.

## Migration Plan

1. Migración aditiva más el renombre de `bio`, desplegada junto con el código que lo lee.
2. Configurar `WIKIMEDIA_USER_AGENT` en cada entorno antes del deploy.
3. Backfill (`scripts/backfill-artist-profile.ts --limit --dry-run`).
4. Rollback: revertir el renombre con una migración inversa; las columnas nuevas son
   ignorables.

## Open Questions

- ¿Las fotos pequeñas en otras superficies (artistas seguidos, Exploración) necesitan
  crédito visible, o basta con el de la página del artista?
- ¿Se necesita un retiro a pedido también para el resumen de Wikipedia?
