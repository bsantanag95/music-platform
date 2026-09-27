## Why

La página de artista debe ser un híbrido entre ficha de biblioteca y biografía
(`redesign-artist-page`), pero el catálogo casi no guarda datos del artista: `artist.bio` es
en realidad la desambiguación de MusicBrainz (en inglés, a menudo vacía) y `artist.photo_url`
no se llena nunca. Una verificación en vivo (2026-09-27) mostró que MusicBrainz tiene los
datos de ficha (país, lugar de origen, fechas, enlaces) y que enlaza a **Wikidata
incluso en bandas pequeñas**; desde Wikidata se llega a una foto con licencia libre en
Wikimedia Commons, a una descripción traducida y al resumen de Wikipedia en el idioma de cada
usuario. Kuervos del Sur, una banda de Curicó, tiene foto libre y resumen en español.

## What Changes

- **Datos de ficha desde MusicBrainz**, en la misma request que ya trae las pertenencias (sin
  requests extra): país, lugar de inicio, fechas de vida o actividad y si terminó, y
  enlaces curados (sitio oficial, Bandcamp y una plataforma de streaming).
- **Sin géneros por ahora**: los de MusicBrainz son etiquetas con licencia CC BY-NC-SA (no
  comercial). La fuente se decide después (alternativa CC0: la propiedad de género de
  Wikidata, traducida).
- **Nuevas fuentes externas: Wikidata, Wikipedia y Wikimedia Commons**, con un cliente
  propio como único punto de salida, y solo a partir del enlace a Wikidata que declara
  MusicBrainz (nunca por búsqueda de nombre).
- **Foto** desde la propiedad de imagen de Wikidata (siempre Commons), aceptada solo con una
  licencia libre verificada, guardando autor y licencia para el crédito obligatorio. Nunca
  la miniatura del resumen de Wikipedia, que puede ser una imagen no libre.
- **Descripción corta traducida** (Wikidata) y **resumen de Wikipedia** en español e inglés,
  con respaldo al otro idioma, guardando el enlace al artículo para la atribución.
- **Lugar de nacimiento** (personas) y **lugar de formación** (grupos) desde Wikidata, con su
  país y traducidos; MusicBrainz como respaldo.
- Actualización en segundo plano cada 30 días, backfill para artistas existentes y retiro de
  una foto a pedido.
- **BREAKING (interno)**: `artist.bio` pasa a llamarse `artist.disambiguation` (es lo que
  guarda); la búsqueda la sigue usando para distinguir homónimos.

## Capabilities

### New Capabilities

- `artist-profile-facts`: datos de ficha del artista desde MusicBrainz (país, lugar de
  inicio, fechas, enlaces curados) y su actualización, sin géneros ni etiquetas.
- `artist-wikimedia-enrichment`: enlace a Wikidata, foto libre de Commons con crédito,
  descripción traducida, resumen de Wikipedia por idioma, lugar de nacimiento o formación,
  actualización, aislamiento de fallos y retiro de fotos.

### Modified Capabilities

(ninguna: la presentación de estos datos se especifica en `redesign-artist-page`)

## Impact

- **Esquema**: migración nueva: columnas de ficha y de foto en `artist`, renombre de `bio`,
  tablas de enlaces y textos por idioma. Espejo en `src/db/schema.ts` y
  `docs/03-data/sql-model.md`.
- **MusicBrainz**: `getArtistWithRelations` agrega `url-rels` a la request existente.
- **Cliente nuevo** `src/services/wikimedia/client.ts` (Wikidata, Wikipedia, Commons) con
  User-Agent obligatorio y cola propia.
- **Catálogo**: servicio de enriquecimiento del perfil; `ingest-artist.ts`, búsqueda y
  sugerencias adaptadas al renombre.
- **Otras superficies**: `photo_url` empieza a tener valor, así que la lista de artistas
  seguidos y la sección Exploración del perfil mostrarán fotos.
- **API**: `GET /api/catalog/artist/{id}` y el tipo `Artist` suman los datos nuevos →
  `docs/04-api/contracts.md`.
- **Docs**: ADR nuevo (Wikimedia como fuente del perfil de artista),
  `docs/03-data/data-licensing.md` (CC BY-SA del texto y de las fotos, CC0 de Wikidata),
  `docs/06-operations/catalog-scripts.md`, `AGENTS.md` (nuevo punto de salida externo).
- **Configuración**: variable nueva de User-Agent para Wikimedia en `.env.example`.
- **Fuera de alcance**: la interfaz (cabecera, pestaña Biografía), el espejo propio de las
  fotos, logos de bandas, alias y nombre legal (decidido no mostrarlos), integrantes y
  géneros.
