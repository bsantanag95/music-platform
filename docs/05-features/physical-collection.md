# Colección física

**Fase 5 · cambios `add-physical-collection`, `rework-collection-section` y
`add-collection-wishlist` · Estado: ✅ implementado**

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

## Wishlist (deseados) — `add-collection-wishlist`

Señal prospectiva paralela ("quiero conseguir este álbum, no lo tengo"), en tabla propia
`wanted_entry` — no un flag en `collection_entry` — porque el grano difiere: una entrada de
colección es una copia real con formato **obligatorio**; una entrada de deseo es una variante
querida con formato **opcional** (`null` = "cualquier formato"). Mismo vocabulario cerrado de
formato/atributos que la colección, y misma nota libre opcional (≤140 caracteres). A diferencia
de la colección física, la wishlist **no tiene audiencia**: es privada del dueño, sin
lectura por `username` ni superficie en el perfil — mismo criterio que Want to Listen. Tener un
álbum en la colección y quererlo en la wishlist no son mutuamente excluyentes: ninguna operación
bloquea ni deduplica contra la otra.

- **Página de álbum**: el botón único "Agregar a la colección" bifurca en un selector "La tengo" /
  "La quiero" antes de mostrar el formulario correspondiente — no dos botones separados. "La
  quiero" permite declarar una o varias variantes deseadas (formato + atributos) en una sola
  operación en lote (1 a 10, transacción atómica).
- **Menú "···" de una ficha de álbum** (`AlbumCard`): alta rápida "Lo quiero" (una entrada sin
  formato, un click, sin formulario) y "Ya la tengo" (deep-link `?collection=have` que abre la
  página de álbum ya en el flujo de "La tengo").
- **`/me/collection`**: segunda pestaña "Quiero" (`?tab=wanted`) junto a la existente. A
  diferencia de "Tengo", es una lista simple con búsqueda y orden (recencia/alfabético), sin los
  tres modos de visualización, filtro por formato/atributo, agrupación ni cambio de audiencia en
  lote — ver `openspec/changes/add-collection-wishlist/design.md` (decisión D5) para el porqué de
  no replicar esa superficie completa en la v1. Es también la única vía para **editar** una
  entrada de deseo ya creada (formato, atributos, nota) — en particular las creadas sin formato
  desde el alta rápida del menú "···" — ya que ni la página de álbum ni ese menú ofrecen edición,
  solo alta y baja (mismo criterio que la colección: la edición vive en `/me/collection`).

### API de la wishlist

`POST/GET /api/me/collection/wanted`, `PATCH/DELETE /api/me/collection/wanted/{entryId}`. El
`POST` acepta un lote de 1 a 10 variantes por álbum en una sola operación atómica; el `PATCH`
edita formato (`null` = "cualquier formato"), atributos o nota de una entrada existente, desde la
pestaña "Quiero". Detalle en `04-api/contracts.md`. Código de error propio:
`WANTED_ENTRY_NOT_FOUND` (`04-api/errors.md`).

### Fuera de alcance de la wishlist (v1)

- Audiencia / visibilidad social y superficie en el perfil ajeno — incremento aditivo posterior
  si el uso lo pide (columna `audience`, análoga a `collection_entry`).
- Mover una entrada de la wishlist a la colección con un click ("ya la conseguí").
- Contador social ("cuántas personas quieren este disco") y notificaciones de disponibilidad.
- Paridad completa de vistas/filtros/agrupación con la pestaña "Tengo".

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
- **Contador "N personas tienen este disco"** — sin cambios respecto de la v1: sigue diferido
  por depender del cálculo anti-sockpuppet.
- **`group=artist` con conteo exacto por sección.** La agrupación por artista secciona sobre lo
  cargado y el conteo de cada sección es el de las entradas visibles (el orden estable mantiene
  cada artista contiguo). Un agregado `counts` por artista server-side es un incremento posterior
  si la aproximación molesta en uso real.
- **Índice funcional para `q` / `sort` sobre el título/artista coalescido.** A volumen de
  colección de un usuario el scan es barato; si aparece presión, un índice es un cambio aislado
  y transversal a los buscadores de listas, favoritos y diario.
