# Colección física

**Fase 5 · cambios `add-physical-collection` y `rework-collection-section` · Estado: ✅ implementado**

Opción por álbum para declarar y presumir el coleccionismo en soporte físico. En la página propia
`/me/collection` es **la estantería personal** (tres modos de vista, toolbar de búsqueda / orden /
agrupación, edición de cada copia y cambio de audiencia en lote); en el perfil ajeno se hereda esa
estantería en modo lectura. Decisión de producto en `00-product/product_philosophy.md` §6.6; plan
de diseño y alcance de la sección en `openspec/changes/archive/*-rework-collection-section/`.

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
  selección opcional de atributos, nota opcional; formulario compartido `CollectionEntryForm`).
  Debajo, las copias propias ya registradas para ese álbum, cada una con acción de quitar. No
  bloquea la carga del contenido musical. **Es la única vía de alta** — no hay buscador de
  catálogo embebido en `/me/collection` (ver "Fuera de alcance").
- **`/me/collection`** (rework `rework-collection-section`): la estantería personal.
  - **Encabezado-retrato** con el conteo por formato como dato (`24 vinilos · 11 CD · …`), sin
    barras de progreso ni "pendientes".
  - **Tres modos de visualización a elegir** — Estantería (grilla de carátulas), Lista detallada,
    Índice —, con preferencia local por visitante (`localStorage`), global (misma mecánica que el
    detalle de lista). Ante la ausencia de carátula, silueta de disco.
  - **Toolbar**: buscador con debounce (título de álbum **o** artista acreditado), filtro por
    formato y por atributo, orden (recencia / alfabético / artista / formato) y agrupación (sin
    agrupar / por formato / por artista). Los filtros van a la URL cuando difieren del default.
  - **Gestión**: edición de cada copia en línea (formato, atributos, nota, audiencia) con
    actualización optimista; selector rápido de audiencia por ficha; modo "Seleccionar" + barra
    de acción fija para cambiar la audiencia de varias copias a la vez.
- **Perfil de usuario** (`/users/[username]`): la misma estantería en **modo lectura** (sin
  toolbar, sin edición, sin selección; el conmutador de modos sí está disponible), filtrada por
  la matriz de visibilidad (bloqueo, perfil privado, relación de seguimiento) aplicada a la
  audiencia de cada entrada. Sin permiso, la sección no revela si el usuario tiene colección. No
  hay ruta `/users/[username]/collection` dedicada (igual criterio que favoritos).

## API

`POST/GET/PATCH /api/me/collection`, `PATCH/DELETE /api/me/collection/{entryId}`,
`GET /api/users/[username]/collection`. El `PATCH` a nivel colección es el cambio de audiencia en
lote (`{ ids, audience }`); los dos `GET` aceptan `q` / `sort` / `group` y devuelven `counts` por
formato. Detalle en `04-api/contracts.md`. Código de error propio: `COLLECTION_ENTRY_NOT_FOUND`
(`04-api/errors.md`).

## Fuera de alcance

### De la v1 (`add-physical-collection`) — todavía vigentes

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
- **Contador de coleccionistas por álbum** (estilo Discogs "N personas tienen este disco").
  Idea válida pero diferida — depende de densidad de colecciones y del cálculo robusto
  anti-sockpuppet de `product_philosophy.md` §6.2. Anotada en `product_philosophy.md` §7 con
  las decisiones de diseño ya identificadas: contar **`DISTINCT user_id`, nunca entradas**
  (sin tope de entradas por `(usuario, álbum)`, un `COUNT(*)` lo infla una sola cuenta), solo
  `audience = 'public'`, suavizar N bajo. Change aparte cuando haya datos.
- **Tope de entradas por `(usuario, álbum)`.** Hoy no hay ninguno — el grano "varias copias"
  es deliberado. Un tope blando (ej. máx. 10) queda anotado en §7 como posible endurecimiento
  a evaluar junto con el contador de coleccionistas.

### De `rework-collection-section` — con criterio de cuándo abordarlo

- **Descubrimiento social de colecciones** (pestaña "Colecciones de quienes seguís" o
  "Descubrir coleccionistas"). Se decidió en shape que la colección es el espacio personal,
  contrapeso de la sección de listas (ya volcada a lo social). Reabrir **si** el perfil por sí
  solo demuestra ser insuficiente para descubrir colecciones y hay pedido concreto — sería una
  capacidad nueva con endpoint propio, análoga a `list-discovery`.
- **Buscador de catálogo embebido / alta desde `/me/collection`.** Se descartó en el detalle de
  lista (`rework-list-detail`) y se mantiene el criterio: el alta es desde la página del álbum.
  Reabrir solo ante pedido concreto del usuario (ver memoria `list-detail-scope`).
- **Wishlist / lista de deseados** (discos que se buscan, no que se tienen). Requiere un modelo
  de datos nuevo (`wanted_entry` o similar) y su propia superficie. Change aparte si el uso lo
  pide; hoy la colección modela solo posesión.
- **Contador "N personas tienen este disco"** — sin cambios respecto de la v1: sigue diferido
  por depender del cálculo anti-sockpuppet.
- **`group=artist` con conteo exacto por sección.** La agrupación por artista secciona sobre lo
  cargado y el conteo de cada sección es el de las entradas visibles (el orden estable mantiene
  cada artista contiguo). Un agregado `counts` por artista server-side es un incremento posterior
  si la aproximación molesta en uso real.
- **Índice funcional para `q` / `sort` sobre el título/artista coalescido.** A volumen de
  colección de un usuario el scan es barato; si aparece presión, un índice es un cambio aislado
  y transversal a los buscadores de listas, favoritos y diario.
