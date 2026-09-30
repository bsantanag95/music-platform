## Context

Artista, álbum y canción se sirven en `/[locale]/(catalog)/{artist,album,song}/[id]` con el UUID
interno como segmento. Hay ~124 enlaces armados a mano (`/album/${id}`) en ~63 archivos, ~17
páginas/layouts validan el parámetro con `isValidUuid`, y la API (`/api/**`) también recibe UUID.
El ADR 0007 fijó que los segmentos fijos de ruta son neutros en inglés y no se traducen; eso no
cambia. Las listas viven en `/users/<usuario>/lists/<listId>` y las reseñas en `/review/<reviewId>`
(con una ruta interceptada `@modal` bajo el álbum).

No hay columna de slug, ni enlaces del catálogo persistidos en la base, ni migraciones que hacer. El
catálogo se crea bajo demanda en la ingesta (ADR 0011, con artistas stub), y por eso cualquier
unicidad de slug obligaría a resolver carreras de escritura.

## Goals / Non-Goals

**Goals:**
- Direcciones más cortas que las actuales y legibles: el enlace de un disco o una canción nombra al
  artista principal.
- Sin cambios de esquema, sin unicidad que mantener y sin historial de slugs.
- Los enlaces con UUID pelado (formato viejo) siguen funcionando para siempre.
- Un renombre o un cambio del crédito principal no rompe ningún enlace.
- Que no se puedan volver a escribir enlaces a mano sin que un test falle.
- Incluir listas y reseñas reutilizando el mismo mecanismo.

**Non-Goals:**
- Slugs únicos o legibles sin id (`/artist/pink-floyd`) y distinguir homónimos dentro del slug.
- Transliterar escrituras no latinas (nombres en cirílico, CJK, etc.) o sumar dependencias para ello.
- Cambiar rutas de la API (`/api/**`), las rutas privadas `/me/**` o los perfiles `/users/<usuario>`.
- Traducir los segmentos fijos de ruta (sigue vigente el ADR 0007).
- Metadatos SEO nuevos (`alternates.canonical`, sitemap) y cambios en el motor de búsqueda.

## Decisions

### 1. Segmento `slug-<id>` con el id como verdad y el slug decorativo

El segmento es `<slug>-<id>`; el parámetro dinámico conserva su nombre (`[id]`, `[reviewId]`,
`[listId]`), solo cambia su valor. El slug se calcula al renderizar a partir del nombre; no se
guarda.

*Alternativas:* (a) slug único en una columna `slug` + tabla de historial: URLs sin sufijo, pero
exige backfill, unicidad con desambiguador y manejo de carreras en la ingesta bajo demanda, y las
canciones y los álbumes colisionan de forma masiva ("Intro", "Greatest Hits"); (b) UUID completo
como sufijo: robusto pero de 36 caracteres. Se descarta (a) por costo y riesgo, y (b) por el largo.
Queda abierta una mejora futura solo para artistas (slug único con el id como respaldo) sin romper
este formato, porque el parseo ya distingue "solo id" de "slug-id".

### 2. Id en base58 de 22 caracteres, sin dependencias

El UUID se codifica como entero de 128 bits en el alfabeto base58 de Bitcoin (sin `0OIl`), relleno
a la izquierda con `1` hasta exactamente 22 caracteres para que cada UUID tenga una única forma
canónica. Implementación propia sobre `BigInt` en `src/lib/slug.ts`. La decodificación exige
longitud 22, alfabeto válido y valor menor que 2^128 (58^22 > 2^128, así que hay cadenas de 22
caracteres inválidas: dan 404).

*Alternativas:* prefijo hexadecimal de 12 caracteres (corto, pero exige buscar por rango en la PK y
desempatar colisiones) y UUID completo (largo). Base58 es corto, sin pérdida y sin colisiones.

*Consecuencia:* base58 distingue mayúsculas; un enlace pasado a minúsculas no resuelve. Se acepta:
los enlaces se copian y pegan y, con el segmento canónico, un id mal escrito da 404 en vez de
apuntar a otra entidad.

### 3. Parseo: el id es lo que sigue al último guion

`parseCatalogSegment(segment)` devuelve `{ id, form }`:
- si el segmento entero es un UUID hexadecimal → `form: "legacy"`;
- si no, el tramo posterior al último `-` (o el segmento entero si no hay guion) se decodifica como
  base58 → `form: "encoded"`;
- en cualquier otro caso → `null` y la página responde `notFound()`.

Como el alfabeto base58 no contiene `-`, no hay ambigüedad con slugs que tengan guiones. Reemplaza a
`isValidUuid(id)` en las ~17 páginas y layouts de catálogo y reseña, con la misma semántica de 404.

### 4. Slug: reglas y forma

`slugify(text)`: NFD → quitar marcas U+0300–U+036F → NFC (así `é`→`e`, pero el hangul y el kana con
dakuten se recomponen intactos y las marcas de escrituras índicas o tailandesa se conservan) →
minúsculas → mapa mínimo de letras que no descomponen (`ø→o`, `đ→d`, `ł→l`, `æ→ae`, `œ→oe`, `ß→ss`,
`þ→th`) → quitar apóstrofos sin separar (`don't`→`dont`) → toda otra secuencia que no sea
`\p{L}\p{N}\p{M}` pasa a `-`; se colapsan y recortan los guiones.

*Composición:*
- Artista: `slugify(nombre)` acotado a 30 caracteres.
- Álbum y canción: `slugify(artistaPrincipal) + "-" + slugify(título)`, artista acotado a 30 y título a
  60 (por puntos de código, cortando en límite de palabra; nunca a mitad de palabra salvo que una sola
  palabra exceda el límite).
- Lista: `slugify(nombre)` a 60. Reseña: `slugify(usuario) + "-" + slugify(títuloDelÁlbum)`.
- Si el slug queda vacío (nombre solo de símbolos), el segmento es únicamente el id.
- Artista principal = el primer crédito con rol `primary` por `position`; los `featured` no entran.
  Con un artista de tipo `various` ("Various Artists") o sin crédito principal, el slug es solo el
  título.

### 5. Canonicalización con 308 en cada página

Un helper de servidor `resolveCatalogRoute` recibe el segmento, la entidad ya cargada, la subruta de
la página (`""`, `"/credits"`, `"/members"`, …) y los `searchParams`, y compara el segmento decodificado
(NFC) con el canónico. Si difiere, llama a `permanentRedirect` a `/{locale}/{tipo}/{canónico}{subruta}?{query}`,
conservando el query completo (`section`, `view`, `sort`, `from=search&q=`, …).

- Cada página conoce su propia subruta; un layout compartido no puede redirigir porque no recibe la
  subruta ni el query. Por eso la llamada vive en las páginas, con un test que recorre las páginas de
  catálogo y falla si alguna no la usa.
- La comparación se hace sobre valores decodificados: Next entrega el parámetro percent-encoded para
  caracteres no ASCII, y comparar el codificado con el decodificado produciría un bucle de
  redirecciones. Un test con un nombre Unicode fija el comportamiento.
- El modal interceptado de reseñas (`@modal`) no redirige: es navegación blanda y solo necesita el id.
  La página completa de la reseña sí canonicaliza.
- `permanentRedirect` (308) y no temporal: el formato viejo y los slugs desactualizados no van a
  volver, a diferencia del alias de usuario de `redirectIfRenamed`, que es temporal por su reserva de
  30 días.

### 6. Helpers de enlace con la dependencia visible en el tipo

`src/lib/catalog-links.ts` exporta `artistHref`, `albumHref`, `songHref`, `listHref` y `reviewHref`.
Devuelven rutas sin locale (para el `Link` de `@/i18n/navigation`, que agrega el prefijo) y una
variante con locale para los `redirect` de servidor. El artista principal se pasa como
`artistName: string | null` **obligatorio**, no opcional: el compilador obliga a decidir en cada
sitio si se tiene o no. `null` produce un slug sin artista, y el 308 lo completa; así un enlace sin
artista nunca se rompe, solo cuesta un salto.

Donde el artista principal no está a mano se amplían las consultas de los servicios que alimentan
las tarjetas y listas (búsqueda, discografía, camino, feed, colecciones) para traerlo; un resolvedor
por lotes (`resolvePrimaryArtists(releaseGroupIds | recordingIds)`) cubre los casos sueltos con una
consulta por lote, no por fila.

### 7. La regla se hace cumplir en el código

Un test (`catalog-links.enforcement.test.ts`) escanea `src/**` y falla ante un enlace armado a mano
(`` `/artist/${`` , `` `/${locale}/album/${`` , `"/song/" + …`, `/users/${…}/lists/${…}`,
`/review/${`) fuera de `src/lib/catalog-links.ts` y de los tests. La expresión exige que la comilla o
el backtick preceda a `/artist`, para no confundirse con `/api/catalog/artist/${`. Mientras se migra
existe una lista de excepciones explícita, que **debe quedar vacía** al cerrar el cambio. El riesgo que
mitiga (olvidar un sitio) se controla en el código y no queda solo documentado.

### 8. Listas y reseñas

- **Listas** (`/users/<usuario>/lists/<slug>-<id>`): ~9 sitios de enlace, todos con el nombre de la
  lista y el usuario a mano. La página ya usa `redirectIfRenamed` para el usuario; se suma la
  canonicalización del segmento de la lista. `/me/lists/<id>` es una vista privada de gestión y queda
  con UUID; el redirect del dueño desde la página pública le pasa el UUID ya decodificado.
- **Reseñas** (`/review/<usuario>-<álbum>-<id>`): 5 sitios de enlace, con el detalle de la reseña
  (autor y álbum) disponible. `ReviewModal` enlaza a la anterior y a la siguiente; se amplía el
  read-model de vecinos para devolver su slug y el modal no muestre una URL sin canonicalizar.

### 9. Documentación y verificación

ADR 0022 nuevo (formato, base58, canonicalización, límites), y actualización de `conventions.md`, de
`04-api/contracts.md` (aclarando que la API sigue con UUID) y de `docs/**` que nombre `[id]` como
UUID. Sin migraciones ni cambios de `schema.ts`. El resolvedor de artista principal toca
`catalog/`: se corren los smoke tests de rutas y de discografía contra una BD de scratch.

## Risks / Trade-offs

- **[Base58 distingue mayúsculas: un enlace pasado a minúsculas da 404]** → Se acepta y se documenta
  en el ADR; un id inválido nunca resuelve a otra entidad.
- **[Homónimos: el slug de dos artistas con el mismo nombre es idéntico]** → El id los separa; la
  página ya muestra la desambiguación de MusicBrainz. Queda anotado como mejora futura, no como
  regresión.
- **[Un enlace sin artista principal cuesta un 308 extra]** → `artistName` obligatorio en el tipo,
  servicios ampliados para traerlo y test de cumplimiento; el 308 es una red de seguridad, no el
  camino normal.
- **[Bucle de redirecciones por codificación de Unicode]** → Comparar segmentos decodificados y NFC, y
  test con nombres cirílicos, CJK, hangul y diacríticos latinos.
- **[Cache permanente del 308 en navegadores si cambiara la regla de slug]** → Cada salto vuelve a
  canonicalizar, así que un cambio futuro de regla produce, como mucho, una cadena corta de redirecciones.
- **[Un cambio del crédito principal o un renombre cambia el slug]** → Los enlaces viejos redirigen;
  ningún enlace queda huérfano porque el id no cambia.
- **[Cambios del artista principal en `catalog/` afectan a muchas consultas]** → Se limita a agregar
  una columna a proyecciones existentes y a un resolvedor de solo lectura; smoke tests en BD de scratch.
- **[Slugs largos por percent-encoding de Unicode]** → Los topes de 30/60 puntos de código acotan la
  parte legible; el id sigue siendo de 22 caracteres fijos.

## Migration Plan

1. Publicar el módulo y los helpers, y cambiar las páginas a `parseCatalogSegment` +
   canonicalización. Desde ese momento los UUID pelados y los slugs desactualizados responden 308.
2. Migrar los sitios de enlace a los helpers, con la lista de excepciones del test como guía de
   avance.
3. Vaciar la lista de excepciones y activar el test sin ellas.

No hay migración de datos. Reversión: como el UUID pelado sigue siendo válido, revertir solo los
helpers de enlace devuelve el formato viejo sin romper nada; los enlaces nuevos ya emitidos seguirían
resolviendo mientras el parseo esté desplegado.

## Open Questions

- **Formato del slug de reseña:** `<usuario>-<álbum>` es una propuesta; se puede cambiar por el título
  de la reseña (opcional, así que necesitaría respaldo) sin tocar el mecanismo.
- **`alternates.canonical`:** queda fuera de este cambio; se decide cuando exista una estrategia SEO.
- **País para homónimos** (`nirvana-gb-…`): diferido; exigiría una consulta extra en cada enlace de
  artista.
