## MODIFIED Requirements

### Requirement: Feed de actividad de usuarios seguidos

El sistema SHALL exponer, para un usuario autenticado, un feed de actividad v1 compuesto por
las actividades visibles de los usuarios a los que sigue con relación aceptada: escuchas
(`listen_entry`), favoritos, eventos de listas (creación o actualización de metadatos),
ratings vigentes, comentarios y **reseñas de álbum vigentes**. El feed SHALL ordenar las
actividades de la más reciente a la más antigua con paginación
(`{ entries, page, pageSize, hasNext }`) y SHALL aplicar la misma regla de visibilidad de
actividades ajenas que el perfil: cada actividad solo aparece si es visible para el lector
según audiencia, visibilidad del perfil del autor y bloqueos. Sin sesión, la petición SHALL
responder `401` con código `AUTH_REQUIRED`.

El sistema SHALL aceptar tres parámetros de filtro opcionales, combinables entre sí y
aplicados sobre la composición completa (no solo sobre la página ya cargada): `kind`
(acotar a un único tipo de actividad entre `listen`, `favorite`, `list`, `rating`,
`comment` o `review`), `authorId` (acotar a un único autor, que SHALL pertenecer a los
seguidos con relación aceptada del lector), y `q` (coincidencia parcial, sin distinguir
mayúsculas ni acentos exactos, sobre el título del objetivo de cada entrada — nombre de
artista, álbum o canción; el texto de comentarios, notas de escucha y cuerpo de reseñas NO
SHALL considerarse en la búsqueda). Sin ninguno de estos parámetros, el comportamiento
SHALL ser idéntico al de una consulta sin filtros. Un `kind` fuera del enum cerrado, o un
`authorId` que no pertenezca a los seguidos aceptados del lector, SHALL responder `400` con
código `VALIDATION_ERROR`.

#### Scenario: Feed de un usuario con seguidos
- **WHEN** un usuario autenticado que sigue a otros con relación aceptada consulta su feed
- **THEN** ve las escuchas, favoritos, eventos de listas, ratings, comentarios y reseñas
  visibles de esos seguidos, ordenados de la más reciente a la más antigua y paginados

#### Scenario: Sin sesión
- **WHEN** una petición sin sesión consulta el feed
- **THEN** la API responde `401` con código `AUTH_REQUIRED`

#### Scenario: Seguido sin actividades visibles
- **WHEN** un seguido solo tiene actividades de audiencia `private` o no visibles para el
  lector
- **THEN** ninguna de esas actividades aparece en el feed

#### Scenario: Seguido con perfil privado y relación aprobada
- **WHEN** el lector sigue con relación aceptada a un perfil privado
- **THEN** el feed incluye las actividades `public` y `followers` de ese perfil

#### Scenario: Sin seguidos o feed vacío
- **WHEN** el usuario no sigue a nadie o ninguno de sus seguidos tiene actividades visibles
- **THEN** recibe una lista vacía con paginación válida, sin error técnico

#### Scenario: Paginación inválida
- **WHEN** se envía una paginación fuera de rango
- **THEN** la API responde `400` con código `VALIDATION_ERROR` y no ejecuta la lectura

#### Scenario: Filtro por tipo de actividad
- **WHEN** el lector consulta su feed con `kind=rating`
- **THEN** solo aparecen entradas de valoración de sus seguidos, con la misma paginación y
  reglas de visibilidad que el feed sin filtrar

#### Scenario: Filtro por tipo reseña
- **WHEN** el lector consulta su feed con `kind=review`
- **THEN** solo aparecen entradas de reseña de sus seguidos, con la misma paginación y
  reglas de visibilidad que el feed sin filtrar

#### Scenario: Tipo de actividad inválido
- **WHEN** el lector consulta su feed con un valor de `kind` que no pertenece al enum
  cerrado de tipos de actividad
- **THEN** la API responde `400` con código `VALIDATION_ERROR` y no ejecuta la lectura

#### Scenario: Filtro por autor seguido
- **WHEN** el lector consulta su feed con `authorId` de una persona que sigue con relación
  aceptada
- **THEN** solo aparecen entradas de esa persona, sujetas a las mismas reglas de
  visibilidad que el feed sin filtrar

#### Scenario: Autor fuera de los seguidos
- **WHEN** el lector consulta su feed con `authorId` de una persona a la que no sigue, o a
  la que sigue con relación pendiente (no aceptada)
- **THEN** la API responde `400` con código `VALIDATION_ERROR` y no ejecuta la lectura

#### Scenario: Búsqueda por texto sobre el objetivo
- **WHEN** el lector consulta su feed con `q` coincidiendo parcialmente con el título de un
  artista, álbum o canción
- **THEN** solo aparecen entradas cuyo objetivo coincide, sin distinguir mayúsculas ni
  acentos exactos

#### Scenario: La búsqueda no alcanza el cuerpo de comentarios o notas
- **WHEN** el lector consulta su feed con `q` coincidiendo con texto que solo aparece en el
  cuerpo de un comentario, de una nota de escucha o de una reseña, no en el título del
  objetivo
- **THEN** esa entrada no aparece en el resultado

#### Scenario: Filtros combinados
- **WHEN** el lector consulta su feed con `kind`, `authorId` y `q` a la vez
- **THEN** el resultado cumple las tres condiciones simultáneamente

#### Scenario: Filtros sin resultados
- **WHEN** una combinación de filtros no coincide con ninguna entrada visible para el
  lector
- **THEN** recibe una lista vacía con paginación válida, sin error técnico, distinguible
  por el cliente de "no sigue a nadie" o "ningún seguido tiene actividad"

### Requirement: Alcance del feed v1

El feed v1 SHALL contener escuchas del diario, favoritos, eventos de listas publicadas,
ratings vigentes, comentarios y reseñas de álbum vigentes, y SHALL NOT contener un
historial de valoraciones ni de reseñas pasadas por objetivo. Un evento de lista SHALL
generarse por la creación de una lista o por la actualización de sus metadatos (título,
descripción o audiencia), no por cada ítem agregado o quitado. Un rating SHALL aparecer en
el feed una única vez por usuario y objetivo, reflejando siempre el valor vigente y su
fecha de última actualización; una nueva valoración sobre el mismo objetivo SHALL
reemplazar la entrada anterior en el feed en lugar de agregar una entrada adicional. Una
reseña SHALL aparecer en el feed una única vez por usuario y álbum, reflejando el título y
el cuerpo vigentes y su fecha de última edición; editar la reseña SHALL actualizar esa
entrada, no agregar otra. Cada comentario SHALL generar su propia entrada de feed, sin
deduplicar por autor u objetivo. Ratings, comentarios y reseñas no tienen audiencia propia:
a efectos del feed SHALL tratarse como audiencia `public`, sujeta igualmente a la regla de
visibilidad de perfil del autor y de bloqueos. Cada entrada SHALL mostrarse con el autor
(username y displayName), el tipo de actividad, la fecha y el objetivo. El objetivo SHALL
exponerse con su título y, cuando es un álbum o una canción, con el nombre de su artista
principal; para objetivos de tipo artista o lista el nombre de artista SHALL ser nulo. Este
campo de artista es una ampliación aditiva del payload y no altera la composición, la
deduplicación ni las reglas de visibilidad del feed.

#### Scenario: Solo escuchas, favoritos, listas, ratings y comentarios
- **WHEN** un seguido realiza una actividad de un tipo no contemplado por el feed
- **THEN** ese evento no genera ninguna entrada en el feed

#### Scenario: La reseña de álbum genera una entrada de feed
- **WHEN** un seguido publica una reseña de un álbum
- **THEN** el feed muestra una entrada de reseña con el autor, el álbum, el título opcional,
  el cuerpo y la fecha de última edición

#### Scenario: Un evento por lista, no por ítem
- **WHEN** un seguido crea una lista y luego le agrega varios ítems
- **THEN** el feed muestra un único evento de creación de la lista y ningún evento por ítem

#### Scenario: Actualización de metadatos de una lista
- **WHEN** un seguido actualiza el título o la audiencia de una lista visible
- **THEN** el feed muestra un evento de actualización de la lista con la fecha de `updated_at`

#### Scenario: Identificación del autor
- **WHEN** el feed muestra una actividad de un seguido
- **THEN** la entrada incluye el `username` y `displayName` del autor para poder enlazar a su
  perfil

#### Scenario: Navegación al perfil del autor
- **WHEN** el lector interactúa con la entrada de un seguido
- **THEN** puede navegar al perfil del autor de la entrada

#### Scenario: Objetivo de álbum o canción incluye el artista
- **WHEN** el feed incluye una entrada cuyo objetivo es un álbum o una canción
- **THEN** el objetivo de esa entrada expone el nombre de su artista principal además del
  título

#### Scenario: Objetivo de artista o lista sin nombre de artista
- **WHEN** el feed incluye una entrada cuyo objetivo es un artista o un evento de lista
- **THEN** el nombre de artista del objetivo es nulo y la entrada se compone sin él

#### Scenario: Rating vigente reemplaza al anterior en el feed
- **WHEN** un seguido cambia su valoración sobre un objetivo que ya había valorado antes
- **THEN** el feed muestra una única entrada de rating para ese usuario y objetivo, con el
  valor y la fecha de la valoración vigente, y no conserva la entrada del valor anterior

#### Scenario: Reseña vigente reemplaza a la edición anterior en el feed
- **WHEN** un seguido edita el cuerpo o el título de una reseña que ya había publicado
- **THEN** el feed muestra una única entrada de reseña para ese usuario y álbum, con el
  contenido vigente y la fecha de última edición, y no una entrada por cada edición

#### Scenario: Varios comentarios sobre el mismo objetivo
- **WHEN** un seguido publica más de un comentario sobre el mismo artista, álbum o canción
- **THEN** el feed muestra una entrada por cada comentario, cada una con su propia fecha

#### Scenario: Rating o comentario de un perfil privado sin relación aprobada
- **WHEN** un usuario valora, comenta o reseña y su perfil es privado, y el lector no tiene
  una relación de seguimiento aceptada con ese perfil
- **THEN** esa entrada de rating, comentario o reseña no aparece en el feed del lector,
  aunque en la vista de catálogo siga siendo visible para cualquiera

#### Scenario: Rating o comentario con bloqueo entre autor y lector
- **WHEN** existe un bloqueo en cualquier dirección entre el lector y el autor de un
  rating, comentario o reseña
- **THEN** esa entrada no aparece en el feed del lector

### Requirement: Jerarquía de presentación del feed

La presentación de una lista vertical cronológica de entradas de feed SHALL renderizar
cada entrada según su **tier de intención**, no con un formato único. Esta presentación
SHALL usarse en `/me/feed`, en el preview del feed de seguidos de Inicio y en el bloque
de rastro reciente del propio usuario. Los bloques de descubrimiento de Inicio que usan
un layout compacto o de grilla (actividad de la comunidad, listas públicas recientes) NO
están cubiertos por este requirement y conservan su presentación propia.

**Tiers de intención.** Cada entrada SHALL clasificarse en uno de cuatro tiers según su
tipo y su objetivo:

- **Tier 1 — Expresivo:** comentario · escucha con nota escrita no vacía · **reseña de
  álbum** · evento de lista. Comentario, nota de escucha y reseña SHALL mostrarse como una
  **cita** — un borde izquierdo de acento neutro con el texto indentado, NUNCA como una
  caja o panel con fondo propio ni escalón de temperatura. El evento de lista es tier 1
  pero SHALL mostrarse como fila de título, no como cita. Dentro de la cita, el tono SHALL
  distinguirse por tipo de entrada, no por caja: una **nota de escucha** SHALL mostrarse en
  cursiva y entre comillas tipográficas — la misma voz personal que su equivalente en el
  diario propio (`/me/diary`), porque es literalmente el mismo campo visto desde otra
  superficie; un **comentario** y una **reseña** SHALL mostrarse en redonda y sin comillas,
  porque no son necesariamente una impresión sentida — suelen ser crítica, opinión o humor.
  El **título de la reseña**, cuando existe, SHALL mostrarse como metadato secundario junto
  al autor, no como encabezado. Una entrada tier 1 NUNCA SHALL colapsarse ni agruparse, y
  SHALL cortar cualquier corrida de tiers inferiores.
- **Tier 2 — Señal de opinión:** rating de **álbum** sin texto · favorito de **álbum**.
  SHALL ocupar una sola fila que abre con la celda de carátula del álbum, con la marca de
  la señal (meter de rating o marca de favorito) visible. Corridas de 3 o más entradas
  consecutivas del mismo tipo y autor SHALL colapsarse en una única fila.
- **Tier 3 — Presencia cotidiana:** rating de **canción** · favorito de **canción o
  artista** · escucha sin nota · reacción. SHALL ocupar una sola fila mínima de baseline;
  si una escucha tiene reacción, la reacción SHALL mostrarse en esa misma fila. Corridas de
  3 o más entradas consecutivas del mismo tipo y autor SHALL colapsarse en una única fila.
- **Tier 4 — Ambiente:** seguir artista · seguir usuario · entrada de colección física.
  Estos eventos SHALL clasificarse como tier 4 y SHALL recibir agrupación agresiva o quedar
  fuera del feed principal. **En esta versión el feed principal NO los incluye**; el tier se
  define para que un cambio posterior solo tenga que activarlos.

En `/me/feed` (no en el preview de Inicio ni en `/me/diary`), cuando una cita supera 6
líneas de alto real SHALL plegarse y SHALL exponer un control "Ver más" que la expande a su
altura completa y "Ver menos" que vuelve a plegarla; la detección SHALL basarse en la
altura real renderizada, no en la cantidad de caracteres. Al colapsar con "Ver menos", la
posición del scroll del viewport SHALL ajustarse para que la fila colapsada siga siendo
visible.

**Anatomía de fila.** En `/me/feed` y en el preview de feed de seguidos, cada fila SHALL
abrir con una celda cuadrada fija a la izquierda que muestra la carátula del objetivo
cuando existe y el disco de vinilo (círculos concéntricos) cuando no; la ausencia de
carátula NUNCA SHALL dejar un hueco ni romper la alineación. El título del objetivo
SHALL ser el elemento visual dominante de la fila y SHALL exponer una afordancia de
enlace que no dependa del estado `:hover`. El autor, el verbo de acción, la audiencia
(cuando aplique) y la fecha SHALL ir en una línea de metadato secundaria. Para objetivos
de álbum y canción, el nombre del artista SHALL mostrarse junto al título. En `/me/feed`
(no en `/me/diary`, que no tiene lista de autores, ni en el preview de feed de seguidos
de Inicio), el nombre del autor SHALL ir acompañado de un indicador visual del autor
(avatar), consistente entre apariciones del mismo autor.

**Rating.** Una entrada de rating SHALL renderizarse con una representación visual de la
valoración (marcas en el color de acento) acompañada SIEMPRE del valor numérico; cuando
existe un score detallado, SHALL mostrarse junto al valor de estrellas. El color de
acento SHALL usarse en reposo únicamente para esta representación del rating.

**Fecha.** La fecha SHALL mostrarse en forma relativa ("hace 2 días") y SHALL conservar
la fecha absoluta como valor accesible del elemento de tiempo. Dentro de una misma
página, los bloques de actividad de feed NO SHALL mezclar fecha relativa y absoluta.

**Agrupación de actividad.** Una corrida es una secuencia de entradas consecutivas del
mismo tier (2 o 3), del mismo `kind` y del mismo autor. Cuando una corrida alcanza 3 o más
entradas, SHALL plegarse en una única fila que nombra al autor, la cantidad y lista los
títulos enlazados, con un único marcador de tiempo. Las entradas tier 1 (comentarios,
notas de escucha, reseñas, eventos de lista) NUNCA SHALL colapsarse y SHALL cortar la
corrida.

**Rastro reciente del propio usuario.** El bloque de rastro reciente SHALL diferenciarse
visualmente del preview de feed de seguidos por composición: SHALL NOT repetir el nombre
del propio usuario en cada fila y SHALL NOT usar la celda de carátula/disco; en su lugar
SHALL usar un tratamiento de margen (un riel o hairline izquierdo continuo). SHALL
conservar el orden cronológico y NO SHALL convertirse en un resumen estadístico.

**Solo lectura.** Una lista cubierta por este requirement SHALL NOT ofrecer acciones sobre
las entradas (reaccionar, responder, editar). La navegación al perfil del autor y al
objetivo musical SHALL seguir disponible.

#### Scenario: Comentario se muestra como cita en redonda y sin comillas
- **WHEN** el feed incluye un comentario de un seguido
- **THEN** el cuerpo completo del comentario se muestra como cita (borde izquierdo, sin
  caja ni fondo propio) en tipografía redonda y sin comillas, con el autor, el objetivo y
  la fecha relativa

#### Scenario: Reseña de álbum se muestra como cita en redonda con el título como metadato
- **WHEN** el feed incluye una reseña de álbum de un seguido, con título
- **THEN** el cuerpo se muestra como cita en redonda y sin comillas (mismo tratamiento que
  un comentario), y el título de la reseña aparece como metadato secundario junto al autor,
  no como encabezado

#### Scenario: Escucha con nota escrita se muestra como cita en cursiva y entre comillas
- **WHEN** el feed incluye una escucha cuya nota (`body`) no está vacía
- **THEN** la entrada se muestra como cita en cursiva y entre comillas tipográficas, no
  como una línea ni en redonda

#### Scenario: Cita larga se pliega con control para expandir
- **WHEN** el feed incluye una cita (comentario, nota de escucha o reseña) cuya altura
  renderizada supera 6 líneas
- **THEN** la cita se muestra plegada con un botón "Ver más"; al hacer click, se expande a
  su altura completa y el botón pasa a decir "Ver menos"

#### Scenario: Colapsar una cita expandida no deja al lector mirando contenido fuera de lugar
- **WHEN** el lector expande una cita larga y luego hace click en "Ver menos"
- **THEN** la posición del scroll del viewport se ajusta de forma que la fila colapsada
  siga siendo visible, en vez de dejar visible lo que quedó mucho más abajo tras encoger
  el contenido

#### Scenario: Cita corta nunca se pliega, aunque tenga varios saltos de línea
- **WHEN** el feed incluye una cita cuya altura renderizada no supera 6 líneas
- **THEN** la cita se muestra completa desde el inicio y no aparece ningún control "Ver
  más", sin importar cuántos caracteres o saltos de línea tenga el texto

#### Scenario: El plegado no aplica en el diario propio ni en el preview de Inicio
- **WHEN** una nota de escucha larga se muestra en `/me/diary` o en el preview de feed de
  seguidos de Inicio
- **THEN** se muestra completa sin plegarse, sin importar su longitud

#### Scenario: La nota de escucha usa la misma voz en el feed que en el diario propio
- **WHEN** la nota (`body`) de una escucha se muestra tanto en `/me/diary` como en el feed
  de un seguido
- **THEN** ambas superficies renderizan el mismo tratamiento — borde izquierdo, cursiva,
  entre comillas, sin caja — porque es la misma voz personal en los dos casos

#### Scenario: Favorito se muestra en una sola fila con celda a la izquierda
- **WHEN** el feed incluye un favorito de un seguido en `/me/feed`
- **THEN** la entrada ocupa una sola fila que abre con la celda de carátula o disco, con
  el título del objetivo como elemento dominante, y el autor y la acción en la línea de
  metadato

#### Scenario: Entrada de objetivo sin carátula usa el disco
- **WHEN** el feed incluye una entrada cuyo objetivo es un artista, una canción o una
  lista (sin carátula disponible)
- **THEN** la celda izquierda muestra el disco de círculos concéntricos y la fila mantiene
  la misma alineación que una fila con carátula

#### Scenario: El título del objetivo es el elemento dominante
- **WHEN** el lector escanea el feed
- **THEN** en cada fila el título del objetivo destaca por sobre el autor, el verbo y la
  fecha, y para álbumes y canciones se muestra el nombre del artista junto al título

#### Scenario: Rating se renderiza con marcas de acento y el valor numérico
- **WHEN** el feed incluye un rating (con o sin score detallado)
- **THEN** la entrada se muestra en una sola fila con una representación visual de la
  valoración en el color de acento y el valor numérico al lado, y el score detallado
  junto a él cuando existe

#### Scenario: Escucha sin nota pero con reacción
- **WHEN** el feed incluye una escucha sin nota escrita pero con una reacción
- **THEN** la entrada se muestra en una sola fila e incluye la reacción en esa fila

#### Scenario: Corrida de ratings de canción se colapsa pero una corta de ratings de álbum no
- **WHEN** un seguido registra 3 o más ratings de canción consecutivos, y por separado 2
  ratings de álbum consecutivos, antes de cualquier otra actividad
- **THEN** los 3 ratings de canción (tier 3) se pliegan en una única fila; los 2 ratings
  de álbum (tier 2) se muestran como dos filas separadas por no alcanzar la corrida mínima

#### Scenario: Corrida de escuchas del mismo autor se colapsa
- **WHEN** un seguido registra 3 o más escuchas sin nota consecutivas antes de cualquier
  otra actividad en el feed
- **THEN** esas escuchas se muestran plegadas en una única fila que nombra al autor, la
  cantidad y lista los títulos enlazados, con un solo marcador de tiempo

#### Scenario: Un comentario entre medio corta la corrida
- **WHEN** entre dos escuchas sin nota de un mismo autor aparece un comentario de esa
  persona
- **THEN** la corrida no se colapsa a través del comentario; el comentario se muestra
  siempre como su propia entrada con texto

#### Scenario: Una reseña entre medio corta la corrida
- **WHEN** entre dos favoritos de álbum de un mismo autor aparece una reseña de esa persona
- **THEN** la corrida no se colapsa a través de la reseña; la reseña se muestra como su
  propia cita

#### Scenario: Los eventos ambiente (tier 4) no aparecen en el feed en esta versión
- **WHEN** un seguido empieza a seguir a un artista o a otro usuario, o agrega una entrada
  a su colección física
- **THEN** ese evento no genera ninguna fila en el feed principal

#### Scenario: El rastro reciente no muestra el nombre del propio usuario
- **WHEN** un usuario con sesión abre `/[locale]` y su bloque de rastro reciente tiene
  varias entradas
- **THEN** ninguna fila repite su `@username`, el bloque no usa la celda de carátula/disco
  y se distingue del preview de feed de seguidos por un tratamiento de margen izquierdo

#### Scenario: El avatar del autor es consistente entre sus apariciones
- **WHEN** el mismo autor aparece en más de una entrada de `/me/feed`
- **THEN** su indicador visual (avatar) es idéntico en todas sus apariciones

#### Scenario: El avatar no aparece donde ya no hay autor que mostrar
- **WHEN** una entrada se muestra en `/me/diary` o en el rastro reciente del propio
  usuario (donde el autor ya está implícito u omitido)
- **THEN** no se muestra ningún indicador visual de autor junto al nombre

#### Scenario: El preview de feed de Inicio usa la misma presentación que /me/feed
- **WHEN** un usuario con sesión abre `/[locale]` y su preview de feed de seguidos tiene
  un comentario y un favorito
- **THEN** el comentario se muestra como bloque con su texto y el favorito como una fila
  con celda a la izquierda, igual que en `/me/feed`

#### Scenario: Los bloques compactos de Inicio no cambian de layout
- **WHEN** un usuario con sesión abre `/[locale]`
- **THEN** los bloques de actividad de la comunidad y de listas públicas recientes
  conservan su layout compacto/grilla y no adoptan la presentación por peso

#### Scenario: Fecha relativa con fecha absoluta accesible
- **WHEN** el feed muestra la fecha de una entrada
- **THEN** el texto visible es relativo ("hace 2 días") y el elemento de tiempo conserva
  la fecha absoluta como su valor `datetime`

#### Scenario: El feed no ofrece acciones sobre las entradas
- **WHEN** el lector ve una entrada en `/me/feed`
- **THEN** no hay controles para reaccionar, responder ni editar la entrada; solo enlaces
  de navegación al perfil del autor y al objetivo
