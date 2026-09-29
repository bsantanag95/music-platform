# Catálogo navegable — buscar → artista → álbum

**Fase:** 3 (roadmap). **Estado:** especificado, backend completo y validado — ver
`02-architecture/frontend-plan/` para la implementación de frontend en curso.

Este documento describe el comportamiento del feature desde la perspectiva del producto:
qué ve y qué puede hacer un usuario, en qué estados, y qué casos límite existen. El
contrato técnico exacto vive en `04-api/contracts.md`; las reglas de negocio subyacentes
(identidad de artista, remaster vs. versión nueva, ediciones) en `01-domain/business-rules.md`.

## Alcance de la Fase 3

Solo lectura, sin cuenta de usuario. El flujo completo:

```
Buscar en el catálogo → Resultados → Perfil de artista / Álbum (tracklist + créditos)
```

La vista de detalle de canción quedó fuera de esta fase (Camino A,
`02-implementation-plan.md`, Etapa 3.5); se construyó después — ver "3b. Detalle de canción"
más abajo (cambios `rebalance-catalog-detail-pages` y `redesign-song-page`).

## 1. Buscar en el catálogo

El usuario escribe un texto y `/search` muestra **todas** las coincidencias de artistas y
álbumes (pestañas **Todo / Artistas / Álbumes**); la persona elige cuál abrir. La búsqueda
no resuelve a un único resultado ni ingiere nada: combina la base local con una sola
request a MusicBrainz por tipo, persiste los candidatos aún no vistos como stubs y ordena
de forma determinista (locales cacheados → resto de locales → solo-MusicBrainz por score,
coincidencia exacta al tope de su grupo). El campo del Header siempre navega a
`/search?q=<consulta>`.

**Estados:**
- **Resultados** — lista de candidatos; cada fila enlaza directo a `/artist/<id>` o
  `/album/<id>`. Un artista o álbum todavía no ingerido se trae **en la vista destino**,
  con su propio estado de carga — la página de resultados nunca habla de "primera
  importación".
- **Sin coincidencias** — lista vacía (`200`, no error): estado vacío propio.
- **Carga** — mientras la página resuelve el `q` de la URL, `loading.tsx` muestra el
  skeleton de la lista y el formulario queda deshabilitado.
- **Error** — solo si MusicBrainz falla y no hay ninguna coincidencia local
  (`INTERNAL_ERROR`): recuperable, con reintento. Distinto de "sin coincidencias".

Los homónimos ("Poison" glam vs. thrash) aparecen como filas separadas con su
disambiguation — la ambigüedad la resuelve el usuario, no `artists[0]`. Búsqueda de
canciones, autocompletado y paginación: diferidos (ver el roadmap y
`openspec/changes/add-search-results-page/design.md` → *Trabajo futuro diferido*).

**Tolerancia a errores de tipeo — limitación conocida (aceptada por ahora).** La base
local coincide por *substring exacto*, sin distinguir mayúsculas (`ILIKE '%texto%'`): no
tolera puntuación, apóstrofes ni palabras cambiadas — `Guns and Roses` no encuentra
`Guns N' Roses` en local, ni `LA Guns` a `L.A. Guns`. Toda la tolerancia a errores viene
de la búsqueda en vivo de MusicBrainz (índice full-text), que está limitada a 1 req/seg,
cuyo ranking varía entre llamadas y se cachea 10 minutos por texto exacto (los fallos no se
cachean). Consecuencias observables:

- Una misma búsqueda mal escrita puede no devolver nada una vez y funcionar al reintentar,
  según haya respondido MusicBrainz esa vez.
- Un artista con discografía ya cacheada localmente **no** muestra la marca "en tu catálogo"
  ni sube en el orden si se llega a él por un nombre mal escrito: entra vía MusicBrainz, en
  el grupo "solo-MB".
- Con MusicBrainz caído, el catálogo propio no es buscable por variantes del nombre.

Se acepta a propósito en esta etapa: con catálogo chico el matching difuso local casi no
dispararía (el artista todavía no está en la base) y el umbral de similitud se calibraría a
ciegas, sin datos de uso. El camino cuando se decida abordarlo —columna normalizada
(`unaccent` + minúsculas + sin puntuación) + índice `pg_trgm`, con el score de similitud
como desempate **dentro** del orden determinista actual, en su propio cambio de OpenSpec—
se revisa antes de una exposición pública o cuando el catálogo tenga volumen real.

## 2. Perfil de artista

**Estructura** (cambio `redesign-artist-page`, 2026-09 — la página es un híbrido entre ficha
de biblioteca y biografía, con la misma estructura que el álbum):

- **Cabecera**: foto rectangular 4:3 (a lo sumo 200 px; 96 px en móvil, junto al nombre) con
  el crédito que exige su licencia (autor y licencia enlazados, ADR 0021) o el placeholder;
  antetítulo de tipo ("Banda", "Solista"), nombre y la descripción corta de Wikidata en el
  idioma de la interfaz; **ficha** (grupo: Origen y Actividad con estado "Activa" /
  "Separada"; persona: Nacimiento con fecha y lugar, Fallecimiento y Actividad desde su
  primer disco; **Integrantes** —o **Última alineación** si la banda se separó— con hasta 5
  nombres y "Ver alineación", o **Bandas** en una persona con "Ver todas"; Enlaces en orden
  fijo: sitio oficial, Bandcamp, Wikipedia y una plataforma de streaming); y un **resumen** de Wikipedia de tres líneas con "Seguir leyendo" y la
  atribución CC BY-SA 4.0. Sin géneros por ahora (los de MusicBrainz son etiquetas no
  comerciales) y sin la desambiguación de MusicBrainz ni el nombre legal. Cada dato que falta
  se omite sin dejar huecos.
- **Panel "Tu relación"** (columna lateral en escritorio): Siguiendo, Favorito y Pendiente
  como conmutadores; Escuchas y Colección calculadas desde los discos de la discografía propia
  (nunca el total de la discografía, que la regla de recorridos prohíbe fuera de su gestión);
  Listas con el mismo selector de casillas que el álbum; y Recorrido (barra sin cifras y
  enlace a la gestión, o "Armar recorrido"). **Sin estrellas ni reseña del artista.**
- **Bloque de comunidad**: Oyentes (personas con escuchas del artista o de sus discos), Lo
  siguen (con "favorito de N") y En listas, con el umbral de 5 del álbum. Sin promedio de
  estrellas ni agregado de recorridos.
- **Pestañas** enlazables: **Discografía** (por defecto), **Integrantes** (grupos) o **Bandas**
  (personas), solo si hay algo que listar, y **Biografía** (la introducción completa del artículo
  de Wikipedia; solo si existe).
- **Discografía por secciones** (`?section=`): Principal (estudio, EP y bandas sonoras
  propias), En vivo, Recopilatorios, Sencillos, Otros y Apariciones, cada una con su cantidad;
  grilla por defecto en Principal y tabla en el resto, con la elección recordada por sección
  en el navegador; "Mostrar más" de a 48 en la grilla; "Mejor valorado" (mayor media con al
  menos 5 valoraciones) y las marcas del usuario (su nota o ✓ si solo escuchó, favorito y
  Pendiente). La tabla muestra la **Media** ("—" con menos de 5 valoraciones) y la etiqueta de
  tipo junto al título solo cuando no es álbum.
- **Menú "…" por disco** (cambio `add-discography-quick-actions`): en la esquina de la carátula
  (al pasar el mouse o con el foco; siempre visible en táctiles) y en la última columna de la
  tabla. Registrar escucha en un clic (con "Agregar detalles"), Favorito, Pendiente, agregar a
  listas, calificar con estrellas e ir al álbum, sin salir de la discografía; cada acción se
  comporta como en el panel del álbum y actualiza las marcas. Es un diálogo no modal (hoja
  inferior en móvil), uno abierto a la vez; sin sesión invita a iniciar sesión.
  Desde `extend-album-quick-actions`, el mismo menú está en los resultados de búsqueda de
  álbumes, las tarjetas de Explorar, las listas de álbumes ajenas y la tira de la discografía del
  álbum (salvo el disco actual); ahí las marcas se piden al abrirlo
  (`GET /api/me/release-groups/[id]/marks`).
- **Orden de la tabla**: Año, Media y Tú ordenan la tabla (el primer uso en su sentido natural:
  año ascendente, notas descendente; el segundo lo invierte); los discos sin valor van al final y
  cambiar de sección vuelve al orden por año.
- **Integrantes** (cambio `add-artist-members-tab`, al estilo de Metal-Archives): sub-vistas
  Completa (por defecto), Actual (o Última alineación), Antiguos y Apoyo en `?view=`, ocultas
  si están vacías. Cada fila: nombre enlazado, ★ fundador, (†año) si murió, y una línea por
  grupo de instrumentos con sus períodos en años ("Batería (1981–1999, 2004–presente)"),
  "adicional" y "período desconocido". Debajo, **"También en"**: las otras bandas del
  integrante (actuales, "ex-" y "(apoyo)"), enlazadas, en **una sola línea** con 3 y "+N" que
  expande solo esa fila. Los **músicos de apoyo** van en su propio bloque (MusicBrainz no
  distingue gira de estudio). Mientras se sincronizan los integrantes en segundo plano (10 por
  visita) se avisa que sus otras bandas aparecerán en la próxima visita.
- **Bandas** (una persona): tarjetas de sus grupos con foto, instrumentos y períodos, años del
  grupo y discos principales; "Apoyo para" (artistas a los que acompañó); y sus propios
  músicos de apoyo si es solista.
- Al pie, fuera de las pestañas: **notas de la comunidad**: notas cortas de contexto ("empezá
  por aquí"), no reseñas.

**Caso Roger Waters / Pink Floyd (referencia del proyecto):** la discografía de una persona
muestra **solo sus propios discos** (y sus apariciones); sus bandas aparecen en la pestaña
**Bandas** (antes, en la franja "También en" de la discografía), con sus instrumentos y períodos
y la cantidad de discos principales de cada banda (si su discografía ya se sincronizó),
enlazadas a sus páginas. Antes de este cambio se
mezclaban los discos de las bandas con los del solista. Los recorridos siguen usando la
discografía combinada.

**Artista sin discografía todavía cacheada:** la búsqueda ya no ingiere nada — abre un
artista recién descubierto (stub creado por la búsqueda o por créditos de `feat.`)
dispara `findOrIngestDiscography` en el request que resuelve esta pantalla, con el estado
de carga propio del perfil. Desde la página de resultados, el aviso de "primera
importación" corresponde acá, no a la búsqueda.

**Carátulas:** carga progresiva (lazy) — la grilla de álbumes se renderiza de inmediato
sin carátula, y cada álbum completa la suya en segundo plano apenas es visible. Decisión
ya tomada (Opción C, `00-backend-analysis.md`); nunca bloquear el render inicial de la
página esperando carátulas. Desde `redesign-artist-page`, una carátula sin resolver se pide
recién cuando su tarjeta o fila entra en pantalla (o está a 200 px): 200 discos sin resolver no
disparan 200 requests al abrir la página.

## 3. Detalle de álbum

**Estructura** (cambio `redesign-album-page`, 2026-09 — la página se lee como ficha de
biblioteca, con Metal-Archives como referencia y la capa personal de Letterboxd):

- **Cabecera**, renderizada una vez por un layout común de pestañas: carátula (miniatura de
  250 px como máximo, por licencia), **tipo de obra como antetítulo** (siempre, también
  "Álbum de estudio"), título, **todos los artistas principales** con su `joinPhrase`,
  **ficha técnica** (lanzamiento con la precisión conocida, duración total —con "≥" si falta
  alguna duración—, edición mostrada y, cuando el catálogo lo conozca, sello; solo se pintan
  filas con dato), **bloque de comunidad** (media de estrellas y detallada, valoraciones y
  reseñas, "lo coleccionan / lo buscan" en tres tarjetas —los conteos bajo umbral se ven
  como "<5"—, un enlace "Aparece en N listas" solo si N > 0, e histograma; umbrales en
  `01-domain/business-rules.md`) y el **panel "Tu relación"** (valoración propia, reseña,
  escuchas, favorito, Pendiente, colección y listas, mostrados como estado).
- **Panel "Tu relación"** (cambio `rework-album-relation-panel`, 2026-09): todas las filas
  siempre visibles, sin menú "···" ni "Más acciones", también en móvil. **Nota**: cinco
  estrellas en línea con medias estrellas que guardan con un clic; junto a ellas, un botón
  abre un diálogo con el puntaje detallado limitado al tramo de las estrellas, destacar y
  borrar. Cambiar las estrellas descarta el puntaje detallado (cada valor de estrellas tiene
  su propio tramo, ver `business-rules.md`) y lo avisa. **Escuchas**: conteo y última
  fecha, "+ Registrar" y una confirmación con "Agregar detalles". **Favorito** y
  **Pendiente**: conmutadores con ícono (corazón y marcador). **Listas**: "En N de tus
  listas" (listas y Caminos propios, sin recorridos de artista) y un selector de casillas
  con búsqueda que agrega y quita; las listas de la comunidad que contienen el álbum se
  abren desde el bloque de comunidad, no desde el panel.
- **Pestañas con URL propia** (slugs en inglés): `/album/{id}` (Canciones, siempre la
  pestaña por defecto), `/album/{id}/reviews` (Reseñas, con contador), y `/credits` y
  `/editions`, que se muestran solo cuando el cambio de datos
  `enrich-album-editions-and-credits` las alimente.
- **Pestaña Créditos** (cambio `compact-album-credits`, 2026-09): el primer nivel se rotula
  "Artista principal" cuando todos los artistas principales son personas e "Integrantes de
  la banda" en los demás casos, y está siempre visible. Músicos invitados y Producción y
  sonido (y Composición) se muestran siempre contraídos, con la cantidad y los tres
  primeros nombres; solo el primer nivel queda a la vista. Arte y otros sigue contraído. Cada fila muestra 4 roles y
  "+N" para el resto, con las pistas en línea propia. Los modificadores de MusicBrainz no
  se muestran como roles: `additional`/`guest` se omiten en instrumentos y voces, `solo` es
  un matiz, y los demás forman etiquetas compuestas ("coproducción"); `membranophone` se
  lee "percusión".
- **Créditos por canción** (cambio `album-credits-by-song`, 2026-09): un control **Por
  persona / Por canción** con el estado en la URL (`?view=songs`, enlazable y renderizado en
  el servidor). La vista por canción lista cada pista con Producción, Intérpretes, Sonido y
  Otros, más los créditos de edición una vez como "Todo el álbum"; una pista sin créditos lo
  indica. En la vista por persona, quien no es integrante y tiene un crédito `producer` va a
  Producción y sonido aunque también toque (producir pesa más que tocar: en pop el
  productor suele tocar todo), con la producción primero en sus roles; programar o mezclar
  no promueve. Los números de pista enlazan a la canción con su título; "+N" aparece solo con
  2 o más roles ocultos; una solista va en línea compacta (el bloque destacado queda para
  bandas); el título "Créditos" es solo para lectores de pantalla; un instrumento sin
  especificar se lee "varios instrumentos".
- **Composición** (cambio `add-songwriter-credits`, 2026-09): compositores y letristas vienen
  de las **obras** de MusicBrainz (la autoría cuelga de la obra, que comparten estudio, vivo
  y covers) y llegan en la **misma** request de edición (`work-rels+work-level-rels`), sin
  requests extra. La vista por persona muestra una sección **Composición** tras el primer
  nivel (eje aparte: una autora puede figurar además en Producción), con la misma regla de
  contracción; la vista por canción pone el grupo **Composición** primero. Roles: `writer` →
  "composición", `composer` → "música", `lyricist` → "letra". Obras sin autores cargados en
  MusicBrainz no muestran nada; las editoriales no se guardan. Los álbumes ingeridos antes se
  completan al visitarlos o con `scripts/backfill-personnel-credits.ts` (marca
  `release.works_synced_at`).
- **Pulido de Créditos** (cambio `polish-album-credits`, 2026-09):
  - Los roles de intérprete se ordenan por peso: voz principal, instrumentos, coros y otras
    voces, y al final la percusión menor (pandereta, shakers, palmas…). Los demás roles
    no se mueven, y el "+N" esconde lo de menor peso.
  - Las pistas se compactan: 3 o más seguidas del mismo disco forman un rango ("pistas
    2–6, 9", con los extremos enlazados). Si alguien está en todas las pistas menos una o
    dos, y la edición tiene al menos 5, se lee "todas salvo la pista 1", con la excluida
    enlazada.
  - Los niveles contraídos (Composición, Músicos invitados, Producción y sonido, Arte y
    otros) forman una sola lista con divisores, chevron y fondo al pasar el mouse.
  - La pestaña tiene un ancho de lectura acotado (`max-w-3xl`), para que los roles no queden
    lejos del nombre en pantallas anchas.
  - Cada fila muestra roles y pistas en una sola línea ("batería, coros, percusión · todas las pistas"),
    con las pistas en tono secundario, y la columna del nombre mide 11rem.
- **Contexto sin desplegar** (cambio `album-credits-context`, 2026-09):
  - La autoría de los integrantes no se repite en sus filas (se probó y se retiró: ocupaba
    demasiado en un bloque de roles); queda en la sección Composición.
  - Con una banda, el resumen de Composición cuenta a los integrantes aparte y nombra a los
    autores externos ("5 · 4 integrantes + Donna McDaniel"; "3 · todas integrantes"). Con
    una solista se usa el resumen general. Al desplegar se lista a todos los autores.
  - Un nivel contraído de hasta 3 personas nombra a cada una con su primer rol ("Bob Rock
    (producción) · Chris Taylor (ingeniería)") y sigue contraído.
  - "Créditos según MusicBrainz" enlaza a la página de la edición representativa en
    musicbrainz.org, en una pestaña nueva (`AlbumPersonnel.releaseMbid`).
  - Se tradujeron los roles e instrumentos que llegaban en inglés ("other vocals", "grand
    piano", "video director"…). Una prueba exige las mismas claves en `es` y `en`.
- **Al pie**, fuera de las pestañas: franja de discografía del artista principal (mismo
  tipo de obra, orden cronológico, anterior / siguiente) y **comentarios**.
- **Móvil**: carátula e identidad, línea resumen de comunidad, panel (mismas filas que en
  escritorio), ficha técnica colapsable, pestañas.

**Pestaña Canciones:** tracklist de la edición representativa con posición, título completo
(sin truncar), duración y subtotal por disco. Cada pista muestra su variante (en vivo,
remix, regrabación, con enlace a la original), el artista cuando no es el del álbum
(recopilaciones) y la marca de **favorita de la comunidad** junto al título (hasta 3 pistas
con al menos 5 reacciones `loved`/`obsessed` públicas; no hay media de estrellas de la
comunidad por pista), explicada con una leyenda sobre la lista. Desde
`rework-album-tracklist` (2026-09), con sesión cada fila muestra siempre tu relación con la
canción: tu nota en estrellas chicas, la marca de escuchada y un corazón de favorito que se
alterna sin abrir el menú. La pestaña no repite lo que ya muestran la barra de pestañas y
la ficha técnica: el título "Canciones" es solo para lectores de pantalla, la línea de
edición mostrada solo aparece en móvil y el total al pie solo con varios discos. Las marcas
son íconos de tamaño fijo (todas las filas miden lo mismo) y la fila se resalta al pasar el
cursor. El menú "···" ordena las acciones según el Modelo C: registrar escucha y reaccionar
primero; después valorar, favorito y listas ("Ir a la canción" se quitó: el título ya
enlaza). Valorar abre estrellas en línea que guardan con un clic, con "Quitar nota" y el
mismo aviso que el panel si se descarta un puntaje detallado; registrar escucha muestra
"Escucha registrada · Agregar detalles" en lugar de abrir el formulario.

**Créditos (`feat.`):** cada canción con colaboración muestra el crédito reconstruido
(ej. "Pink Floyd feat. Roger Waters"), enlazado al perfil del artista credited. Un track
sin créditos adicionales (el caso normal) no muestra nada extra — el crédito solo aparece
cuando aporta información sobre-y-encima del artista principal del álbum.

**Álbum sin ediciones ingeribles:** MusicBrainz no tiene ninguna `release` utilizable para
ese `release_group`. Estado vacío claro, no una pantalla en blanco ni un error genérico
(`NO_EDITIONS_FOUND`).

**Ediciones alternativas (japonesa, remaster, deluxe):** hoy se ingiere y muestra una sola
edición por álbum. Decidido en `redesign-album-page`: las ediciones **no** tienen página
propia ni cambian la tracklist principal; se listan en la pestaña Ediciones y las pistas
que agregan las ediciones ampliadas se muestran en secciones desplegables de la pestaña
Canciones. Los datos llegan con `enrich-album-editions-and-credits`.

## 3b. Detalle de canción — ficha compacta

Nació mínima (`rebalance-catalog-detail-pages`); desde `redesign-song-page` (2026-09) es una
**ficha compacta de biblioteca**, coherente con el álbum y **sin pestañas** (una canción tiene
cerca de un tercio del contenido de un álbum). Reutiliza los componentes del álbum. De arriba
hacia abajo:

- **Cabecera**: carátula del **disco principal** (el primer disco de estudio que contiene la
  grabación; si no hay, el más temprano), que enlaza a ese disco; antetítulo "Canción" (la posición y
  el disco los nombran la tira y las migas); título, artistas, **ficha técnica** (duración,
  "Escrita por" solo con nombres, primera aparición —con su tipo, "(single/EP)", cuando no es el
  disco principal— y, si es una versión, "Versión en vivo de *X*" / "Versión de *X* (*Artista*)"
  con enlace a la original) y **bloque de comunidad**: valoración media (desde 5 valoraciones),
  reacción común (desde 5 reacciones públicas del diario), "favorita de" ("<5" por debajo del
  umbral) y "Aparece en N listas". Las tarjetas siempre muestran la cantidad real y "—" cuando no
  hay valor; si no hay media, reacción predominante ni favoritas, se reemplazan por una sola
  línea ("Todavía hay poca actividad de la comunidad · 1 valoración") (`polish-song-header`).
- **Panel "Tu relación"** al costado: estrellas **siempre visibles** con el puntaje detallado
  como "88/100" (mismo control y diálogo que el álbum), Escuchas en dos líneas fijas ("Escuchas ·
  + Registrar escucha" y "3 · última: Obsesión, 12 sep · Ver en tu diario →"; la reacción se
  elige en el formulario del diario), Favorita como fila compacta con un conmutador, y Listas (el
  mismo selector del álbum, con listas de canciones y sin Caminos). Sin reseña, Pendiente ni
  colección.
- **Tira de pistas**: el disco principal con "N de M" en el centro y, a cada lado, "Anterior" /
  "Siguiente" con el número separado del título ("2 · Tears") y toda el área clicable; en los
  extremos, "Inicio del disco" / "Fin del disco". Cruza discos y no aparece si la grabación no
  está en la lista de la edición representativa (por ejemplo, una pista adicional de otra
  edición).
- **Composición** (cambio `add-songwriter-credits`, 2026-09): compositores y letristas vienen
  de las **obras** de MusicBrainz (la autoría cuelga de la obra, que comparten estudio, vivo
  y covers) y llegan en la **misma** request de edición (`work-rels+work-level-rels`), sin
  requests extra. La vista por persona muestra una sección **Composición** tras el primer
  nivel (eje aparte: una autora puede figurar además en Producción), con la misma regla de
  contracción; la vista por canción pone el grupo **Composición** primero. Roles: `writer` →
  "composición", `composer` → "música", `lyricist` → "letra". Obras sin autores cargados en
  MusicBrainz no muestran nada; las editoriales no se guardan. Los álbumes ingeridos antes se
  completan al visitarlos o con `scripts/backfill-personnel-credits.ts` (marca
  `release.works_synced_at`).
- **Pulido de Créditos** (cambio `polish-album-credits`, 2026-09):
  - Los roles de intérprete se ordenan por peso: voz principal, instrumentos, coros y otras
    voces, y al final la percusión menor (pandereta, shakers, palmas…). Los demás roles
    no se mueven, y el "+N" esconde lo de menor peso.
  - Las pistas se compactan: 3 o más seguidas del mismo disco forman un rango ("pistas
    2–6, 9", con los extremos enlazados). Si alguien está en todas las pistas menos una o
    dos, y la edición tiene al menos 5, se lee "todas salvo la pista 1", con la excluida
    enlazada.
  - Los niveles contraídos (Composición, Músicos invitados, Producción y sonido, Arte y
    otros) forman una sola lista con divisores, chevron y fondo al pasar el mouse.
  - La pestaña tiene un ancho de lectura acotado (`max-w-3xl`), para que los roles no queden
    lejos del nombre en pantallas anchas.
  - Cada fila muestra roles y pistas en una sola línea ("batería, coros, percusión · todas las pistas"),
    con las pistas en tono secundario, y la columna del nombre mide 11rem.
- **Contexto sin desplegar** (cambio `album-credits-context`, 2026-09):
  - La autoría de los integrantes no se repite en sus filas (se probó y se retiró: ocupaba
    demasiado en un bloque de roles); queda en la sección Composición.
  - Con una banda, el resumen de Composición cuenta a los integrantes aparte y nombra a los
    autores externos ("5 · 4 integrantes + Donna McDaniel"; "3 · todas integrantes"). Con
    una solista se usa el resumen general. Al desplegar se lista a todos los autores.
  - Un nivel contraído de hasta 3 personas nombra a cada una con su primer rol ("Bob Rock
    (producción) · Chris Taylor (ingeniería)") y sigue contraído.
  - "Créditos según MusicBrainz" enlaza a la página de la edición representativa en
    musicbrainz.org, en una pestaña nueva (`AlbumPersonnel.releaseMbid`).
  - Se tradujeron los roles e instrumentos que llegaban en inglés ("other vocals", "grand
    piano", "video director"…). Una prueba exige las mismas claves en `es` y `en`.
- **Al pie**, fuera de las pestañas: franja de discografía del artista principal (mismo
  tipo de obra, orden cronológico, anterior / siguiente) y **comentarios**.
- **Móvil**: carátula e identidad, línea resumen de comunidad, panel (mismas filas que en
  escritorio), ficha técnica colapsable, pestañas.

**Pestaña Canciones:** tracklist de la edición representativa con posición, título completo
(sin truncar), duración y subtotal por disco. Cada pista muestra su variante (en vivo,
remix, regrabación, con enlace a la original), el artista cuando no es el del álbum
(recopilaciones) y la marca de **favorita de la comunidad** junto al título (hasta 3 pistas
con al menos 5 reacciones `loved`/`obsessed` públicas; no hay media de estrellas de la
comunidad por pista), explicada con una leyenda sobre la lista. Desde
`rework-album-tracklist` (2026-09), con sesión cada fila muestra siempre tu relación con la
canción: tu nota en estrellas chicas, la marca de escuchada y un corazón de favorito que se
alterna sin abrir el menú. La pestaña no repite lo que ya muestran la barra de pestañas y
la ficha técnica: el título "Canciones" es solo para lectores de pantalla, la línea de
edición mostrada solo aparece en móvil y el total al pie solo con varios discos. Las marcas
son íconos de tamaño fijo (todas las filas miden lo mismo) y la fila se resalta al pasar el
cursor. El menú "···" ordena las acciones según el Modelo C: registrar escucha y reaccionar
primero; después valorar, favorito y listas ("Ir a la canción" se quitó: el título ya
enlaza). Valorar abre estrellas en línea que guardan con un clic, con "Quitar nota" y el
mismo aviso que el panel si se descarta un puntaje detallado; registrar escucha muestra
"Escucha registrada · Agregar detalles" en lugar de abrir el formulario.

**Créditos (`feat.`):** cada canción con colaboración muestra el crédito reconstruido
(ej. "Pink Floyd feat. Roger Waters"), enlazado al perfil del artista credited. Un track
sin créditos adicionales (el caso normal) no muestra nada extra — el crédito solo aparece
cuando aporta información sobre-y-encima del artista principal del álbum.

**Álbum sin ediciones ingeribles:** MusicBrainz no tiene ninguna `release` utilizable para
ese `release_group`. Estado vacío claro, no una pantalla en blanco ni un error genérico
(`NO_EDITIONS_FOUND`).

**Ediciones alternativas (japonesa, remaster, deluxe):** hoy se ingiere y muestra una sola
edición por álbum. Decidido en `redesign-album-page`: las ediciones **no** tienen página
propia ni cambian la tracklist principal; se listan en la pestaña Ediciones y las pistas
que agregan las ediciones ampliadas se muestran en secciones desplegables de la pestaña
Canciones. Los datos llegan con `enrich-album-editions-and-credits`.

## 3b. Detalle de canción — ficha compacta

Nació mínima (`rebalance-catalog-detail-pages`); desde `redesign-song-page` (2026-09) es una
**ficha compacta de biblioteca**, coherente con el álbum y **sin pestañas** (una canción tiene
cerca de un tercio del contenido de un álbum). Reutiliza los componentes del álbum. De arriba
hacia abajo:

- **Cabecera**: carátula del **disco principal** (el primer disco de estudio que contiene la
  grabación; si no hay, el más temprano), que enlaza a ese disco; antetítulo "Canción" (la posición y
  el disco los nombran la tira y las migas); título, artistas, **ficha técnica** (duración,
  "Escrita por" solo con nombres, primera aparición —con su tipo, "(single/EP)", cuando no es el
  disco principal— y, si es una versión, "Versión en vivo de *X*" / "Versión de *X* (*Artista*)"
  con enlace a la original) y **bloque de comunidad**: valoración media (desde 5 valoraciones),
  reacción común (desde 5 reacciones públicas del diario), "favorita de" ("<5" por debajo del
  umbral) y "Aparece en N listas". Las tarjetas siempre muestran la cantidad real y "—" cuando no
  hay valor; si no hay media, reacción predominante ni favoritas, se reemplazan por una sola
  línea ("Todavía hay poca actividad de la comunidad · 1 valoración") (`polish-song-header`).
- **Panel "Tu relación"** al costado: estrellas **siempre visibles** con el puntaje detallado
  como "88/100" (mismo control y diálogo que el álbum), Escuchas en dos líneas fijas ("Escuchas ·
  + Registrar escucha" y "3 · última: Obsesión, 12 sep · Ver en tu diario →"; la reacción se
  elige en el formulario del diario), Favorita como fila compacta con un conmutador, y Listas (el
  mismo selector del álbum, con listas de canciones y sin Caminos). Sin reseña, Pendiente ni
  colección.
- **Tira de pistas**: el disco principal con "pista N de M" y enlaces a la pista anterior y la
  siguiente de su edición representativa (cruza discos). No aparece si la grabación no está en esa
  lista (por ejemplo, una pista adicional de otra edición).
- **Composición** (autores de la obra con sus roles, solo cuando los roles difieren entre
  autores; si no, la ficha ya lo dice) y **Créditos de esta grabación**, apilados a ancho
  completo. Los créditos van **una persona por fila** (nombre | roles, 4 roles y "+N", que
  desplegado ofrece "ocultar"), con
  Intérpretes en una columna —integrantes primero, en la tipografía destacada, separados de los
  invitados— y Producción, Sonido y Otros en la otra; Sonido ordena por rol (mezcla,
  masterización, grabación, ingeniería, programación) y contrae las asistencias en "+N
  asistentes", que desplegado dice "Ocultar asistentes" (`polish-song-credits-strip`,
  `polish-song-appearances-versions`). Los créditos de todo el disco no se repiten: un
  enlace lleva a la pestaña Créditos del álbum. Si alguien llega a la canción sin pasar por el
  álbum, la página agenda en segundo plano la sincronización de créditos y autoría del disco
  principal.
- **"Esta grabación aparece en"**: los discos que contienen esta misma grabación, por tipo
  (estudio, singles y EP, recopilaciones, en vivo y otros), 3 por grupo más "+N", con mes y año
  cuando la fecha los tiene y la marca "Primer lanzamiento" (fecha completa como ayuda) en el más
  temprano. Con recopilaciones y discos del artista, cada origen va en su columna.
- **"Otras versiones de la canción"**: las demás grabaciones de su obra, por grupo —
  Versiones de otros artistas (`cover`), En vivo (`live`) y Otras grabaciones (sin marca) — según
  los atributos de MusicBrainz, sin deducir nada (ADR 0020). Cada grupo es una pestaña (un grupo
  único va como subtítulo) con una tabla de una columna: una fila por disco (Año | Disco |
  Grabaciones, más Artista en los covers) con sus grabaciones como variantes enlazadas —lo que
  el título agrega al de la canción, "version 1", o "Ver versión"/"Grabación N"— y "+N más"
  pasados 10 discos (`song-versions-tabs`).
- **Comentarios** al final. Sin reseñas de canción.

## 4. Navegación por membresías (banda → integrantes) — diferida a Fase 4

**Problema detectado en la Etapa 3.6.** Los créditos del tracklist solo hacen navegables a los
artistas con rol `featured` (colaboraciones). En un álbum de una banda, los integrantes —p. ej.
Roger Waters en un álbum de Pink Floyd— **no figuran como `featured`** en MusicBrainz: el
`artist-credit` de cada canción es únicamente la banda. Por eso no existe un enlace desde el
álbum hacia el perfil del integrante. Se verificó con datos reales: Roger Waters tiene **0
créditos `featured`** en toda la base. Además, la discografía del perfil
(`findOrIngestDiscography`) solo incluye álbumes donde el artista aparece directamente en el
`artist-credit`, así que tampoco muestra los álbumes de las bandas a las que pertenece la persona.
Como consecuencia, el caso de referencia del proyecto ("doble discografía solista y de banda") no
queda completo con los créditos de canción.

**Solución implementada.** Implementar la navegación por membresía usando la tabla `membership`
(persona ↔ grupo, ver `03-data/sql-model.md`):

- El perfil de un **grupo** muestra a sus integrantes, con enlaces a cada perfil de persona.
- El perfil de una **persona** muestra su discografía solista **y** la de los grupos a los que
  pertenece, en la misma pantalla y agrupada por categoría — exactamente lo que define
  `01-domain/domain-model.md` y el ADR 0004.
- La consulta de discografía por membresía **completa** a `findOrIngestDiscography`, no lo
  reemplaza: se conserva el patrón de cacheo bajo demanda y no se añaden llamadas extra a
  MusicBrainz para resolver la pertenencia (la relación vive en la base propia).

La primera visita a un artista con `memberships_synced_at` nulo solicita sus `artist-rels` una sola
vez, filtra `member of band`, consolida roles y fechas conocidas, y persiste la relación de forma
idempotente. La ingesta ocurre antes de leer memberships y antes de componer la discografía. La
sincronización se ejecuta en una transacción con lock por artista: reconcilia relaciones ausentes sin
afectar memberships de otros artistas y marca el flag solo al terminar. Si la llamada externa falla,
la transacción revierte y la marca permanece nula para permitir reintentar; una lectura ya sincronizada
es exclusivamente local.

Esta extensión pertenece a Fase 4, acompaña el trabajo sobre las vistas de artista/álbum/canción y
no depende de autenticación.

## Casos límite conocidos (heredados del modelo de datos)

- **Re-grabación, remix o versión en vivo** de una canción aparecen como una entrada
  separada en el tracklist de su propio álbum — nunca se fusionan con la canción original
  (son `RECORDING` distintos por diseño, ver `business-rules.md`). Se conectan por su **obra**:
  la página de cada una lista las demás en "Otras versiones" y, si MusicBrainz marca el vínculo
  como `live` o `cover`, enlaza a la original (ADR 0020).
- **Versiones sin marcar**: muchas tomas en vivo o demos llegan de MusicBrainz sin el atributo
  `live` en su vínculo con la obra. Se muestran en "Otras grabaciones", sin deducir su tipo.
- **Grabación sin obra** (el 56 % tiene obra en la base de scratch, 2026-09): la canción no
  muestra "Otras versiones" ni línea de versión.
- **Remaster de audio** de una canción existente **no** genera una entrada nueva en
  ningún listado — es la misma canción, mismo `RECORDING`, sin importar la edición.
- **Artista credited aún no visitado** (`type = 'unknown'`): si un usuario llega al perfil
  de un artista que solo existía como stub de un crédito ajeno, se enriquece automáticamente
  antes de responder — nunca debería verse un perfil con datos "a medias" en pantalla.

## Fuera de alcance de este documento

Valoración, comentarios, listas, favoritos y actividad social — ver
`ratings-and-reviews.md`, `lists-and-favorites.md` y `activity-feed.md` (Fases 4-5).

## Internacionalización (i18n)

El catálogo navegable soporta múltiples idiomas (español e inglés inicialmente). La
internacionalización aplica únicamente al *chrome* de la interfaz — etiquetas de UI,
botones, mensajes de estado y error. Los datos del catálogo musical (nombres de artistas,
títulos de álbumes/canciones, biografías) **no se traducen** y se muestran tal cual
llegan de MusicBrainz. Ver `02-architecture/i18n.md` para la arquitectura completa.
