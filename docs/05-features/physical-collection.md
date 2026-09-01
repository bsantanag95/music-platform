# Colección física

**Fase 5 · cambio `add-physical-collection` · Estado: ✅ implementado**

Opción por álbum para declarar y presumir el coleccionismo en soporte físico. Se muestra en
formato de lista, en la página propia y en el perfil público. Decisión de producto en
`00-product/product_philosophy.md` §6.6.

## Modelo

Una **entrada de colección** (`collection_entry`) representa una copia física de un álbum
(`release_group`) que el usuario posee:

- **Formato** (obligatorio): `vinyl` · `cd` · `cassette` · `other`. Conjunto cerrado. Los
  formatos digitales quedan deliberadamente fuera: la colección modela medios físicos.
- **Atributos de edición** (cero o más): vocabulario cerrado y curado (ver abajo). Son
  *descriptores* de una cualidad de la copia, no afirmaciones de identidad de catálogo.
- **Nota** (opcional, ≤140 caracteres): texto libre para lo que el vocabulario no captura
  (detalle de prensado, arte de portada, número de catálogo, estado de la copia). La
  plataforma no la interpreta, valida ni sugiere.
- **Audiencia**: `private` · `followers` · `public`, default `followers` (mismo patrón que
  favoritos y diario). Configurable después de crear.

**Grano por álbum + copia.** No es un toggle idempotente: cada alta crea una entrada nueva.
Un usuario puede tener **varias entradas para el mismo álbum**, con el mismo o distinto
formato, para representar copias distinguibles (el vinilo y el CD; dos ediciones del mismo CD
con portada distinta).

Formato y atributos son 100% dato del usuario: el catálogo no modela soporte físico
(`release` es "edición" — original/remaster —, no vinilo/CD).

## Vocabulario de atributos (congelado)

| Grupo | Valores |
|---|---|
| Edición | `limited-edition`, `numbered`, `first-press`, `reissue`, `remaster`, `anniversary-edition`, `deluxe-edition` |
| Soporte / prensado | `colored-vinyl`, `picture-disc`, `180g`, `gatefold`, `box-set` |
| Región | `regional-edition` (el detalle — "japonesa", "UK" — va en la nota) |
| Contenido | `bonus-tracks`, `extra-disc` |
| Otro | `signed`, `promo` |

Fuente única: `src/services/collection/vocabulary.ts`. Ampliarlo requiere una migración que
altere el `CHECK` de `collection_entry.attributes` (ver `drizzle/0012_physical_collection.sql`).

## Superficies

- **Página de álbum**: acción autenticada "Agregar a la colección" (selector de formato,
  selección opcional de atributos, nota opcional). Debajo, las copias propias ya registradas
  para ese álbum, cada una con acción de quitar. No bloquea la carga del contenido musical.
- **`/me/collection`**: la colección propia en formato de lista, orden cronológico
  descendente, paginada, con filtros por formato y por atributo.
- **Perfil de usuario** (`/users/[username]`): sección "Colección" paginada, filtrada por la
  matriz de visibilidad (bloqueo, perfil privado, relación de seguimiento) aplicada a la
  audiencia de cada entrada. Sin permiso, la sección no revela si el usuario tiene colección.

## API

`POST/GET /api/me/collection`, `PATCH/DELETE /api/me/collection/{entryId}`,
`GET /api/users/[username]/collection`. Detalle en `04-api/contracts.md`. Código de error
propio: `COLLECTION_ENTRY_NOT_FOUND` (`04-api/errors.md`).

## Fuera de alcance (v1)

- **Aparición en el feed de actividad.** Se presume vía perfil y página de álbum. Sumar
  `collection_entry` como fuente del feed es un incremento aditivo (nueva fuente en la unión)
  sin migración, si el uso lo pide. No se modificó `activity-feed`.
- **Modelar identidad de release** (sello, país, número de catálogo, barcode, bonus tracks
  estructurados, matching contra MusicBrainz). Es un proyecto de catálogo aparte; la nota
  libre cubre ese detalle como texto opaco.
- **Imágenes de portada por entrada** (upload de usuario, Cover Art Archive). V1 usa la
  portada del `release_group` que ya se resuelve.
- Filtros booleanos de varios atributos combinados (v1 filtra por un solo atributo).
- Racha, contadores de completitud o cualquier mecánica de juego sobre la colección.
- Colección sobre artista o canción: el objetivo es fijo (álbum).
