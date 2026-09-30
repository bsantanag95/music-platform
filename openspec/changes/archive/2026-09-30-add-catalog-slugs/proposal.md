## Why

Hoy las direcciones públicas del catálogo son el UUID interno pelado
(`/es/artist/93f1f6be-b1dc-42d0-abde-2850072d0774`): 36 caracteres opacos que no dicen de qué
artista, disco o canción son, ni al compartirlas ni al verlas en la barra del navegador o en el
historial. Queremos enlaces más cortos que los actuales y legibles: que la dirección de un disco o
una canción nombre al artista al que pertenece. Se hace ahora, antes de que haya enlaces
compartidos fuera de la app, porque después cada cambio de formato exigiría mantener redirecciones
de más.

## What Changes

- Las direcciones de artista, álbum y canción pasan a `slug-<id>`, donde `<id>` es el UUID
  codificado en base58 (22 caracteres) y `slug` es texto decorativo derivado del nombre:
  - artista: `/artist/pink-floyd-KGbai8kbv81qoNbTiNhQ7m`
  - álbum: `/album/pink-floyd-the-wall-KQHie2Dgrb4CRpKj3vXDD8` (artista principal + título)
  - canción: `/song/pink-floyd-comfortably-numb-FzKLhFzuQm3ap145ndXHGH` (artista principal + título)
- El slug conserva las letras Unicode (`кино`, `宇多田ヒカル`), sin transliterar ni sumar
  dependencias.
- El **id es la verdad; el slug es decorativo**: no hay columna de slug, no hay unicidad ni tabla de
  historial. Dos artistas homónimos comparten slug y los separa el id.
- Cada página resuelve la entidad por el id del final. Si el segmento no es el canónico (slug
  desactualizado por un renombre, cambio del crédito principal, id pelado o UUID en hexadecimal
  del formato viejo), responde con `308` a la URL canónica, conservando la subruta de pestaña y el
  query (`?section=`, `?view=`, `from=search&q=`).
- Los enlaces se arman con helpers únicos (`artistHref`, `albumHref`, `songHref`, `listHref`,
  `reviewHref`) que reemplazan los ~124 enlaces manuales `/artist/${id}`. Un test falla si aparece
  un enlace armado a mano fuera de los helpers.
- Se suman al alcance las **listas** (`/users/<usuario>/lists/nombre-<id>`) y las **reseñas**
  (`/review/<usuario>-<álbum>-<id>`), reutilizando el mismo parseo y la misma canonicalización.
- La API (`/api/**`) no cambia: sigue recibiendo UUID.
- Documentación: ADR 0022 nuevo (sin reescribir el 0007), `conventions.md`, `04-api/contracts.md`
  (aclaración de que la API sigue con UUID) y el resto de `/docs` que nombre las rutas con `[id]`.

## Capabilities

### New Capabilities
- `catalog-slugs`: formato `slug-<id>` (base58) de las direcciones públicas de artista, álbum,
  canción, lista y reseña; reglas de generación del slug (artista principal, Unicode, longitud),
  parseo del id, canonicalización con 308 y helpers de enlace obligatorios.

### Modified Capabilities
- `i18n-routing`: la regla de rutas neutras en inglés pasa de `/artist/[id]` a
  `/artist/[slug-id]`; el segmento dinámico ya no es un UUID.
- `catalog-artist`: la vista pública se expone en `/{locale}/artist/{slug-id}` y una dirección con
  slug desactualizado o UUID pelado redirige a la canónica.
- `catalog-album`: ídem para `/{locale}/album/{slug-id}` y para el enlace de cada track a
  `/{locale}/song/{slug-id}`.
- `review-detail`: la reseña se comparte en `/{locale}/review/{slug-id}`, también al abrirse como
  modal.

## Impact

- **Rutas:** se mantiene el nombre del parámetro dinámico (`[id]`, `[reviewId]`, `[listId]`); solo
  cambia su valor. Las ~17 páginas y layouts de catálogo y reseña que hoy hacen `isValidUuid(id)` pasan a un único
  `parseCatalogSegment`, y cada página compara con el segmento canónico. Las rutas anidadas
  (`(tabs)`, `@modal`, `lists`) no se renombran.
- **Enlaces:** ~63 archivos de `src/components/**`, `src/app/**` y `src/services/feed/**`. Donde el
  artista principal no está a mano se completa la consulta; mientras falte, el id pelado sigue
  funcionando por el 308.
- **Servicios:** un módulo `src/lib/slug.ts` (base58 sobre `BigInt`, `slugify` Unicode, ensamblado y
  parseo) y un servicio que resuelve el artista principal de un lote de álbumes/canciones.
- **Base de datos:** sin migraciones ni cambios de `schema.ts`.
- **Dependencias:** ninguna nueva.
- **API y contratos:** sin cambios; `/api/**` sigue con UUID.
- **Riesgos conocidos:** base58 distingue mayúsculas (un enlace pasado a minúsculas da 404); un
  slug de homónimos no dice cuál es cuál; el 308 suma un salto en los clics que aún no llevan el
  artista principal.
