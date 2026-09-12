# activity-feed Specification

## Purpose

Feed de actividad de Fase 5: composición bajo demanda de las actividades visibles de los
usuarios seguidos — escuchas del diario, favoritos, eventos de listas, ratings vigentes,
comentarios, reseñas de álbum, "seguir a un usuario" y "seguir a un artista" — ordenadas
cronológicamente y filtradas por audiencia, perfil y bloqueos, y presentadas según una
jerarquía de 4 tiers (expresivo, señal de opinión, presencia cotidiana, ambiente), con un
glifo por tipo, un tratamiento propio para la reseña, un enlace al artista acreditado de
álbumes y canciones, y un barrido sintético cuando una corrida valora varias canciones del
mismo álbum.
## Requirements
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
ratings vigentes, comentarios, reseñas de álbum vigentes y, como **tier 4**, los eventos de
empezar a seguir a un usuario y de empezar a seguir a un artista; SHALL NOT contener un
historial de valoraciones ni de reseñas pasadas por objetivo. Un evento de lista SHALL
generarse por la creación de una lista, por la actualización de sus metadatos (título,
descripción o audiencia) o por agregar un ítem a una lista existente; SHALL NOT generarse un
evento por cada ítem — agregar varios ítems seguidos sigue produciendo una única entrada
vigente para esa lista, igual que editar sus metadatos varias veces. Quitar un ítem de una
lista SHALL NOT generar un evento. Un rating SHALL aparecer en el feed una única vez por
usuario y objetivo, reflejando siempre el valor vigente y su fecha de última actualización;
una nueva valoración sobre el mismo objetivo SHALL reemplazar la entrada anterior en el feed
en lugar de agregar una entrada adicional. Una reseña SHALL aparecer en el feed una única vez
por usuario y álbum, reflejando el título y el cuerpo vigentes y su fecha de última edición;
editar la reseña SHALL actualizar esa entrada, no agregar otra. Cada comentario SHALL generar
su propia entrada de feed, sin deduplicar por autor u objetivo. Ratings, comentarios y
reseñas no tienen audiencia propia: a efectos del feed SHALL tratarse como audiencia
`public`, sujeta igualmente a la regla de visibilidad de perfil del autor y de bloqueos. Cada
entrada SHALL mostrarse con el autor (username y displayName), el tipo de actividad, la
fecha y el objetivo. El objetivo SHALL exponerse con su título y, cuando es un álbum o una
canción, con el nombre de su artista principal; para objetivos de tipo artista o lista el
nombre de artista SHALL ser nulo. Este campo de artista es una ampliación aditiva del payload
y no altera la composición, la deduplicación ni las reglas de visibilidad del feed.

**Seguir a un usuario.** Una entrada de este tipo SHALL generarse cuando el autor empieza a
seguir a otra persona con relación **aceptada**, y SHALL aparecer solo si el **objetivo del
seguimiento** tiene perfil público, o el lector ya sigue a ese objetivo con relación
aceptada; el objetivo NO SHALL ser el propio lector; y NO SHALL haber bloqueo entre el lector
y el objetivo — misma regla de visibilidad que ya usaba el resumen de eventos ambiente para
este tipo de evento. La fecha de la entrada SHALL ser la de aceptación de la relación. Si la
relación de seguimiento deja de existir, la entrada SHALL dejar de aparecer. Esta fuente no
tiene concepto de edición ni de historial: solo existe mientras la relación esté vigente.

**Seguir a un artista.** Una entrada de este tipo SHALL generarse cuando el autor empieza a
seguir a un artista, y SHALL aparecer siempre que no haya bloqueo entre el lector y el autor
— a diferencia de "seguir a un usuario", el objetivo es un artista, no una persona, y no
tiene noción de perfil privado: no hay regla de visibilidad adicional sobre el objetivo. La
fecha de la entrada SHALL ser la de creación del seguimiento. Si el seguimiento deja de
existir, la entrada SHALL dejar de aparecer. Esta fuente tampoco tiene concepto de edición ni
de historial: solo existe mientras el seguimiento esté vigente.

#### Scenario: Solo escuchas, favoritos, listas, ratings y comentarios
- **WHEN** un seguido realiza una actividad de un tipo no contemplado por el feed
- **THEN** ese evento no genera ninguna entrada en el feed

#### Scenario: La reseña de álbum genera una entrada de feed
- **WHEN** un seguido publica una reseña de un álbum
- **THEN** el feed muestra una entrada de reseña con el autor, el álbum, el título opcional,
  el cuerpo y la fecha de última edición

#### Scenario: Un evento por lista, no por ítem
- **WHEN** un seguido crea una lista y luego le agrega varios ítems
- **THEN** el feed muestra un único evento para esa lista, con la fecha del último cambio
  (el ítem agregado más reciente), y no un evento por cada ítem

#### Scenario: Agregar un ítem a una lista existente genera o refresca su evento
- **WHEN** un seguido agrega un ítem a una lista existente que no había cambiado en un
  tiempo
- **THEN** el feed muestra un evento de actualización de esa lista, con la fecha en que se
  agregó el ítem

#### Scenario: Quitar un ítem no genera evento
- **WHEN** un seguido quita un ítem de una lista
- **THEN** ese evento no genera ninguna entrada ni actualiza la fecha de la entrada
  existente de esa lista

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

#### Scenario: Seguir a un usuario con perfil público genera entrada
- **WHEN** un seguido empieza a seguir, con relación aceptada, a un tercero con perfil
  público
- **THEN** el feed incluye una entrada "seguir a un usuario" con el autor, el tercero
  seguido y la fecha de aceptación

#### Scenario: Seguir a un perfil privado no seguido por el lector se omite
- **WHEN** un seguido empieza a seguir a un tercero con perfil privado con el que el lector
  no tiene relación de seguimiento aceptada
- **THEN** esa entrada no aparece en el feed del lector

#### Scenario: Seguir al propio lector no genera entrada en su propio feed
- **WHEN** un seguido empieza a seguir al propio lector
- **THEN** ese evento no aparece en el feed de ese lector (es materia de notificación, no
  de esta línea de tiempo)

#### Scenario: Bloqueo excluye la entrada de "seguir a un usuario"
- **WHEN** existe un bloqueo en cualquier dirección entre el lector y el autor de un evento
  de "seguir a un usuario", o entre el lector y la persona seguida
- **THEN** esa entrada no aparece en el feed del lector

#### Scenario: Dejar de seguir hace desaparecer la entrada
- **WHEN** un seguido deja de seguir a una persona cuya entrada de "seguir a un usuario"
  ya aparecía en el feed
- **THEN** esa entrada deja de aparecer

#### Scenario: Seguir a un artista genera entrada
- **WHEN** un seguido empieza a seguir a un artista
- **THEN** el feed incluye una entrada "seguir a un artista" con el autor, el artista
  seguido y la fecha del seguimiento

#### Scenario: Bloqueo excluye la entrada de "seguir a un artista"
- **WHEN** existe un bloqueo en cualquier dirección entre el lector y el autor de un evento
  de "seguir a un artista"
- **THEN** esa entrada no aparece en el feed del lector

#### Scenario: Dejar de seguir a un artista hace desaparecer la entrada
- **WHEN** un seguido deja de seguir a un artista cuya entrada de "seguir a un artista" ya
  aparecía en el feed
- **THEN** esa entrada deja de aparecer

### Requirement: Jerarquía de presentación del feed

La presentación de una lista vertical cronológica de entradas de feed SHALL renderizar
cada entrada según su **tier de intención**, no con un formato único. Esta presentación
SHALL usarse en `/me/feed`, en el preview del feed de seguidos de Inicio y en el bloque
de rastro reciente del propio usuario. Los bloques de descubrimiento de Inicio que usan
un layout compacto o de grilla (actividad de la comunidad, listas públicas recientes) NO
están cubiertos por este requirement y conservan su presentación propia.

**Diferenciación visual por tipo.** Cada `kind` (escucha, favorito, evento de lista,
rating, comentario, reseña, seguir a un usuario, seguir a un artista) SHALL mostrarse con un
glifo mono de 14px junto al verbo de la línea de metadato, reforzando el tipo de entrada sin
ser nunca la única señal — el texto del verbo SHALL acompañar siempre al glifo, mismo
criterio de accesibilidad que los íconos de reacción de escucha. "Seguir a un usuario" y
"seguir a un artista" SHALL compartir el mismo glifo (misma acción, "empezar a seguir",
distinta solo en el objetivo y el verbo). El rating SHALL quedar exento: su medidor de
valoración ya cumple ese rol y no SHALL sumar un glifo adicional. Una reseña SHALL
distinguirse además con su propio tratamiento: un rótulo "Reseña" en el segundo color de
acento del sistema, su título (cuando existe) mostrado como titular en vez de como metadato
secundario, y un borde izquierdo propio en ese color — el mismo tratamiento editorial
reservado que ya usa una lista oficial en la superficie pública de listas. Este segundo
acento SHALL reservarse exclusivamente a la reseña dentro del feed.

**Tiers de intención.** Cada entrada SHALL clasificarse en uno de cuatro tiers según su
tipo y su objetivo:

- **Tier 1 — Expresivo:** comentario · escucha con nota escrita no vacía · **reseña de
  álbum** · evento de lista. Comentario, nota de escucha y reseña SHALL mostrarse como una
  **cita** — un borde izquierdo de acento neutro con el texto indentado, NUNCA como una
  caja o panel con fondo propio ni escalón de temperatura (la reseña usa el acento propio
  descrito en "Diferenciación visual por tipo" en vez del acento neutro). El evento de
  lista es tier 1 pero SHALL mostrarse como fila de título, no como cita. Dentro de la
  cita, el tono SHALL distinguirse por tipo de entrada, no por caja: una **nota de
  escucha** SHALL mostrarse en cursiva y entre comillas tipográficas — la misma voz
  personal que su equivalente en el diario propio (`/me/diary`), porque es literalmente el
  mismo campo visto desde otra superficie; un **comentario** y una **reseña** SHALL
  mostrarse en redonda y sin comillas, porque no son necesariamente una impresión sentida —
  suelen ser crítica, opinión o humor. El **título de la reseña**, cuando existe, SHALL
  mostrarse como titular (ver "Diferenciación visual por tipo"), no como metadato
  secundario. Una entrada tier 1 NUNCA SHALL colapsarse ni agruparse, y SHALL cortar
  cualquier corrida de tiers inferiores.
- **Tier 2 — Señal de opinión:** rating de **álbum** sin texto · favorito de **álbum**.
  SHALL ocupar una sola fila que abre con la celda de carátula del álbum, con la marca de
  la señal (meter de rating o marca de favorito) visible. Corridas de 3 o más entradas
  consecutivas del mismo tipo y autor SHALL colapsarse en una única fila.
- **Tier 3 — Presencia cotidiana:** rating de **canción** · favorito de **canción o
  artista** · escucha sin nota · reacción. SHALL ocupar una sola fila mínima de baseline;
  si una escucha tiene reacción, la reacción SHALL mostrarse en esa misma fila. Corridas de
  3 o más entradas consecutivas del mismo tipo y autor SHALL colapsarse en una única fila.
- **Tier 4 — Ambiente:** **seguir usuario** · **seguir artista** · entrada de colección
  física. **Seguir a un usuario y seguir a un artista SHALL activarse en el feed
  principal**: cada uno SHALL ocupar una sola fila mínima, sin celda de carátula ni objetivo
  de catálogo (el "objetivo" es la persona o el artista seguido, enlazado a su perfil o
  página), con el autor, el verbo y el objetivo seguido en una única línea. Corridas de 3 o
  más entradas consecutivas del mismo tipo ("seguir usuario" o "seguir artista") y autor
  SHALL colapsarse en una única fila, mismo criterio que tiers 2/3, sin mezclar ambos tipos
  en una misma corrida. La entrada de colección física SHALL continuar recibiendo
  agrupación agresiva fuera del feed principal (ver capability `feed-ambient-events`); **en
  esta versión el feed principal no la incluye**, solo el tier se define para que un cambio
  posterior la active igual que a los dos tipos de seguimiento.

En `/me/feed` (no en el preview de Inicio ni en `/me/diary`), cuando una cita supera 6
líneas de alto real SHALL plegarse y SHALL exponer un control "Ver más" que la expande a su
altura completa y "Ver menos" que vuelve a plegarla; la detección SHALL basarse en la
altura real renderizada, no en la cantidad de caracteres. Al colapsar con "Ver menos", la
posición del scroll del viewport SHALL ajustarse para que la fila colapsada siga siendo
visible.

**Anatomía de fila.** En `/me/feed` y en el preview de feed de seguidos, cada fila SHALL
abrir con una celda cuadrada fija a la izquierda que muestra la carátula del objetivo
cuando existe y el disco de vinilo (círculos concéntricos) cuando no; la ausencia de
carátula NUNCA SHALL dejar un hueco ni romper la alineación. Una fila de "seguir a un
usuario" o de "seguir a un artista" (tier 4) queda exenta de esta celda, por no tener
objetivo de catálogo (ver "Tiers de intención"). El título del objetivo SHALL ser el
elemento visual dominante de la fila y SHALL exponer una afordancia de enlace que no
dependa del estado `:hover`. El autor, el verbo de acción, la audiencia (cuando aplique) y
la fecha SHALL ir en una línea de metadato secundaria. Para objetivos de álbum y canción, el
nombre del artista acreditado SHALL mostrarse junto al título, **enlazado a la página de ese
artista** — la misma afordancia de enlace que el título, sin depender de `:hover`. Un
objetivo de tipo artista NO SHALL duplicar ese enlace: su título ya es el artista y ya
enlaza a esa página. En `/me/feed` (no en `/me/diary`, que no tiene lista de autores, ni en
el preview de feed de seguidos de Inicio), el nombre del autor SHALL ir acompañado de un
indicador visual del autor (avatar), consistente entre apariciones del mismo autor.

**Rating.** Una entrada de rating SHALL renderizarse con una representación visual de la
valoración (marcas en el color de acento) acompañada SIEMPRE del valor numérico; cuando
existe un score detallado, SHALL mostrarse junto al valor de estrellas. El color de
acento SHALL usarse en reposo únicamente para esta representación del rating, salvo el
segundo acento reservado a la reseña (ver "Diferenciación visual por tipo").

**Fecha.** La fecha SHALL mostrarse en forma relativa ("hace 2 días") y SHALL conservar
la fecha absoluta como valor accesible del elemento de tiempo. Dentro de una misma
página, los bloques de actividad de feed NO SHALL mezclar fecha relativa y absoluta.

**Agrupación de actividad.** Una corrida es una secuencia de entradas consecutivas del
mismo tier (2, 3 o 4), del mismo `kind` y del mismo autor. Cuando una corrida alcanza 3 o
más entradas, SHALL plegarse en una única fila que nombra al autor, la cantidad y lista los
títulos o personas enlazadas, con un único marcador de tiempo. Las entradas tier 1
(comentarios, notas de escucha, reseñas, eventos de lista) NUNCA SHALL colapsarse y SHALL
cortar la corrida.

**Rastro reciente del propio usuario.** El bloque de rastro reciente SHALL diferenciarse
visualmente del preview de feed de seguidos por composición: SHALL NOT repetir el nombre
del propio usuario en cada fila y SHALL NOT usar la celda de carátula/disco; en su lugar
SHALL usar un tratamiento de margen (un riel o hairline izquierdo continuo). SHALL
conservar el orden cronológico y NO SHALL convertirse en un resumen estadístico. Este
bloque también SHALL incluir las entradas de "seguir a un usuario" y de "seguir a un
artista" del propio usuario, con la misma fila mínima sin celda.

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
  un comentario), con su propio borde y rótulo "Reseña" en el segundo acento, y el título
  de la reseña aparece como titular

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
  fecha, y para álbumes y canciones se muestra el nombre del artista, enlazado, junto al
  título

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
- **WHEN** un seguido agrega una entrada a su colección física
- **THEN** ese evento no genera ninguna fila en el feed principal (a diferencia de "seguir
  a un usuario" y "seguir a un artista", que sí generan fila — ver los escenarios
  siguientes)

#### Scenario: Seguir a un usuario sí genera una fila en el feed principal
- **WHEN** un seguido empieza a seguir a otro usuario visible para el lector
- **THEN** el feed muestra una fila mínima sin celda de carátula: el autor, el verbo y la
  persona seguida, enlazados, con la fecha relativa

#### Scenario: Una corrida de "seguir usuario" se agrupa igual que escuchas o favoritos
- **WHEN** un seguido empieza a seguir a 4 personas visibles para el lector, de forma
  consecutiva y sin otra actividad entre medio
- **THEN** el feed muestra una única fila plegada que nombra al autor, la cantidad y lista
  las personas seguidas enlazadas, con un solo marcador de tiempo

#### Scenario: Cada tipo de entrada muestra su glifo junto al verbo
- **WHEN** el feed incluye entradas de distinto `kind`
- **THEN** cada una muestra un glifo mono reconocible junto al verbo de su línea de
  metadato, salvo el rating, que no lo necesita porque ya tiene su propio medidor

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
  de navegación al perfil del autor y al objetivo musical

#### Scenario: Seguir a un artista sí genera una fila en el feed principal
- **WHEN** un seguido empieza a seguir a un artista
- **THEN** el feed muestra una fila mínima sin celda de carátula: el autor, el verbo y el
  artista seguido, enlazados, con la fecha relativa

#### Scenario: Una corrida de "seguir artista" se agrupa igual que escuchas o favoritos
- **WHEN** un seguido empieza a seguir a 4 artistas de forma consecutiva y sin otra
  actividad entre medio
- **THEN** el feed muestra una única fila plegada que nombra al autor, la cantidad y lista
  los artistas seguidos enlazados, con un solo marcador de tiempo

#### Scenario: Una corrida de "seguir usuario" y otra de "seguir artista" no se mezclan
- **WHEN** un mismo autor sigue primero a 3 usuarios y luego, sin otra actividad entre
  medio, a 3 artistas
- **THEN** el feed muestra dos filas plegadas separadas, una por tipo, en vez de una única
  corrida mixta

#### Scenario: El nombre del artista acreditado enlaza a su página
- **WHEN** el feed incluye una entrada cuyo objetivo es un álbum o una canción con artista
  acreditado
- **THEN** el nombre del artista, junto al título, es un enlace a la página de ese artista

#### Scenario: Un objetivo de tipo artista no duplica el enlace
- **WHEN** el feed incluye una entrada cuyo objetivo es un artista
- **THEN** solo el título enlaza a la página del artista; no aparece un segundo enlace
  redundante

### Requirement: Pico de rotación en el feed

Cuando una corrida colapsable de escuchas sin nota (tier 3) del mismo autor —tal como la
define el párrafo "Agrupación de actividad" del requirement "Jerarquía de presentación del
feed"— está compuesta **íntegramente por entradas del mismo objetivo musical**, y ese
objetivo acumula suficientes registros dentro de una ventana reciente, la lista de feed
SHALL presentar esa corrida como un **pico de rotación**: una síntesis de comportamiento
("En rotación"), en lugar de la fila genérica de grupo que enumera títulos. Este requirement
refina —no contradice— la presentación de una corrida colapsada descrita en "Jerarquía de
presentación del feed".

**Ventana y umbrales.** La ventana SHALL ser de **7 días** contados hacia atrás desde el
momento de lectura. La cantidad relevante SHALL ser el número de entradas de la corrida
cuya fecha cae dentro de esa ventana. Una corrida SHALL presentarse como pico de rotación
solo si:

- el objetivo común es una **canción** y la cantidad en ventana es **≥ 3**, o
- el objetivo común es un **álbum** y la cantidad en ventana es **≥ 2**.

Una corrida cuyo objetivo común es un **artista** NUNCA SHALL producir un pico de rotación
(el artista es un objetivo demasiado grueso para "en rotación", igual criterio que la
sección "En rotación" del perfil). Una corrida cuya cantidad en ventana no alcanza el
umbral NO SHALL presentarse como pico y SHALL seguir la presentación de grupo genérica.

Un pico de rotación de **álbum** SHALL poder formarse a partir de una corrida de solo **2**
entradas consecutivas, aunque ese largo esté por debajo del mínimo de plegado de grupo
genérico; un pico de **canción** requiere el mínimo de plegado habitual.

**Cortes.** El pico de rotación SHALL respetar las mismas reglas de corte que una corrida:
una entrada tier 1 (comentario, reseña, nota de escucha, evento de lista), una escucha de
otro objetivo, o actividad de otro autor entre medio, cortan la corrida y por lo tanto el
pico. El pico SHALL derivarse únicamente de entradas **consecutivas** de la página cargada;
NO SHALL consultar una fuente de datos adicional ni contar entradas fuera de esa corrida.

**Presentación.** El pico de rotación SHALL mostrarse como una fila subordinada, indentada
a la columna del título y **sin celda de carátula**, con el mismo peso visual que una fila
de grupo colapsado. SHALL contener: el rótulo "En rotación", el **título del objetivo
enlazado** a su página (con el nombre del artista acreditado junto al título cuando
exista), y la **cantidad de registros de la semana**, además del marcador de tiempo
relativo de la entrada más reciente de la corrida. En `/me/feed` y en el preview de feed de
seguidos SHALL nombrar al autor; en el rastro reciente del propio usuario SHALL omitirlo,
igual que el resto de la presentación.

**Tono.** El pico de rotación SHALL usar un registro cultural: NO SHALL mostrar el
algoritmo, un porcentaje, una barra de progreso, un contador de tipo "racha", emojis de
fuego ni exclamaciones de logro. La única métrica visible SHALL ser la cantidad de
registros de la semana, redactada de forma neutra ("N registros esta semana").

**Alcance.** Este requirement SHALL aplicarse en las tres superficies que usan la
presentación por tier: `/me/feed`, el preview del feed de seguidos de Inicio y el bloque de
rastro reciente del propio usuario. Los umbrales y la ventana SHALL implementarse como
constantes con nombre, calibrables sin cambio de esta especificación.

#### Scenario: Corrida de escuchas del mismo tema se presenta como pico de rotación

- **WHEN** un seguido registra 4 escuchas sin nota consecutivas de la misma canción, todas
  dentro de los últimos 7 días, antes de cualquier otra actividad
- **THEN** en lugar de la fila genérica "registró 4 escuchas" con la lista de títulos, el
  feed muestra una única fila subordinada "En rotación · {título de la canción} · 4
  registros esta semana", con el título enlazado a la página de la canción y el marcador de
  tiempo de la escucha más reciente

#### Scenario: Dos escuchas del mismo álbum en la semana forman un pico de álbum

- **WHEN** un seguido registra 2 escuchas sin nota consecutivas del mismo álbum, ambas
  dentro de los últimos 7 días, antes de cualquier otra actividad
- **THEN** el feed muestra una fila "En rotación · {título del álbum} · 2 registros esta
  semana", aunque una corrida de 2 entradas no alcanzaría el mínimo de plegado de grupo
  genérico

#### Scenario: Dos escuchas de la misma canción no forman pico

- **WHEN** un seguido registra 2 escuchas sin nota consecutivas de la misma canción dentro
  de la ventana
- **THEN** no se forma un pico de rotación (el umbral de canción es 3) y las dos escuchas
  se muestran como filas individuales

#### Scenario: Corrida del mismo tema pero fuera de la ventana

- **WHEN** un seguido tiene una corrida de 3 escuchas consecutivas de la misma canción,
  pero solo 1 de ellas cae dentro de los últimos 7 días
- **THEN** la corrida no se presenta como pico de rotación y se muestra con la presentación
  de grupo genérica

#### Scenario: Corrida de escuchas de títulos distintos sigue siendo grupo genérico

- **WHEN** un seguido registra 3 o más escuchas sin nota consecutivas de canciones
  distintas
- **THEN** la corrida se pliega en la fila de grupo genérica que nombra al autor, la
  cantidad y lista los títulos enlazados — no como pico de rotación

#### Scenario: Corrida del mismo artista no produce pico

- **WHEN** un seguido registra 3 o más escuchas sin nota consecutivas cuyo objetivo es el
  mismo artista (no un álbum ni una canción)
- **THEN** no se forma un pico de rotación; la corrida se muestra con la presentación de
  grupo genérica

#### Scenario: Una entrada con texto entre medio corta el pico

- **WHEN** entre escuchas de la misma canción de un seguido aparece un comentario o una
  reseña de esa persona
- **THEN** la corrida se corta en ese punto; ninguno de los dos tramos alcanza el umbral y
  no se muestra ningún pico de rotación

#### Scenario: El pico de rotación no expone métricas de gamificación

- **WHEN** el feed muestra un pico de rotación
- **THEN** la fila no incluye el algoritmo, porcentajes, barras de progreso, contadores de
  racha, emojis de fuego ni exclamaciones — solo el rótulo "En rotación", el objetivo
  enlazado y la cantidad neutra de registros de la semana

#### Scenario: El pico de rotación en el rastro reciente omite el nombre del propio usuario

- **WHEN** el bloque de rastro reciente del propio usuario contiene una corrida que
  califica como pico de rotación
- **THEN** la fila "En rotación · {título} · N registros esta semana" se muestra sin
  repetir el `@username` del propio usuario, igual que el resto de ese bloque

### Requirement: Barrido de álbum en el feed

Cuando una corrida de escuchas, favoritos y/o valoraciones consecutivas del mismo autor —tal
como la define el párrafo "Agrupación de actividad" del requirement "Jerarquía de
presentación del feed"— está compuesta por canciones del **mismo álbum**, con el `kind`
alternando libremente entre escucha, favorito y valoración, ese tramo SHALL tratarse como si
fuera un **barrido de álbum**: la agrupación por tipo que ya aplica a corridas contiguas
(rating/favorito/escucha) SHALL extenderse a este tramo, tratando cada tipo como si sus
entradas fueran contiguas entre sí, aunque en la lista cruda estén intercaladas con
entradas de otros tipos del mismo álbum. Este requirement refina —no contradice— la
presentación de una corrida colapsada descrita en "Jerarquía de presentación del feed"; NO
SHALL introducir una fila ni una presentación nuevas — reusa exactamente la fila de grupo
genérica que ya existe para cada tipo.

**Alcance del tramo.** El `kind` de cada entrada del tramo SHALL ser escucha, favorito o
valoración de una canción con álbum resuelto; una nota de escucha (tier 1) NUNCA SHALL
formar parte del tramo, igual que corta cualquier otra corrida. Comentarios, reseñas y
cualquier objetivo que no sea una canción de ese álbum tampoco SHALL formar parte del tramo.

**Agrupación independiente por tipo.** Dentro del tramo, las entradas SHALL repartirse en un
grupo por `kind` (escucha, favorito, valoración); cada grupo SHALL evaluarse de forma
independiente contra el umbral de la agrupación genérica (`GROUP_MIN`). Una canción con
favorito Y valoración dentro del mismo tramo SHALL participar en el grupo de favoritos y en
el de valoraciones por separado — NO SHALL haber un umbral combinado entre tipos. Un grupo
de escuchas que resulte ser todo del mismo tema SHALL seguir evaluándose primero como pico
de rotación, mismo criterio de precedencia que ya aplica fuera de un tramo de álbum. Un tipo
cuyo recuento no alcanza `GROUP_MIN` NO SHALL agruparse y SHALL mostrarse como entradas
sueltas, sin impedir que los demás tipos del mismo tramo sí se agrupen.

**Cortes.** El tramo SHALL respetar las mismas reglas de corte que una corrida: una entrada
tier 1 (comentario, reseña, nota de escucha, evento de lista), una entrada de otro autor, o
una canción de un álbum **distinto y conocido**, cortan el tramo. Una entrada cuyo álbum no
está resuelto (dato ausente) NO SHALL cortar el tramo por sí sola si el resto de la
condición de continuidad (mismo autor, candidata válida) se cumple. Un favorito agregado y
luego quitado de una canción del mismo álbum, intercalado entre escuchas o valoraciones que
de otro modo formarían su propio grupo, NO SHALL cortar el tramo ni impedir que ese otro
tipo alcance su umbral. El tramo SHALL derivarse únicamente de entradas **consecutivas** de
la página cargada; NO SHALL consultar una fuente de datos adicional ni contar entradas fuera
de ese tramo.

**Presentación.** Cada grupo formado dentro de un tramo de álbum SHALL usar exactamente la
misma presentación que un `FeedEntryGroup` genérico (fila subordinada sin celda de
carátula, verbo según el tipo, hasta 4 títulos enlazados + "y N más", fecha relativa de la
entrada más reciente del grupo). NO SHALL mencionar el álbum ni enlazar a su página — la
agrupación genérica nunca lo hizo. En `/me/feed` y en el preview de feed de seguidos SHALL
nombrar al autor; en el rastro reciente del propio usuario SHALL omitirlo, igual que el
resto de la presentación.

**Tono.** La agrupación de un tramo de álbum SHALL heredar el mismo registro neutro que la
agrupación genérica: sin algoritmo, sin porcentaje, sin barra de progreso, sin contador de
tipo "racha", sin emojis de fuego ni exclamaciones de logro.

**Alcance.** Este requirement SHALL aplicarse en las tres superficies que usan la
presentación por tier: `/me/feed`, el preview del feed de seguidos de Inicio y el bloque de
rastro reciente del propio usuario. El umbral SHALL ser el mismo `GROUP_MIN` con nombre que
ya usa la agrupación genérica.

#### Scenario: 3 canciones del mismo álbum valoradas seguidas se presentan como barrido

- **WHEN** un seguido valora 3 canciones distintas del mismo álbum, de forma consecutiva y
  sin otra actividad entre medio
- **THEN** el feed muestra la fila de grupo genérica "valoró 3 canciones" con las 3
  canciones enlazadas — mismo resultado que produciría la agrupación contigua ya existente

#### Scenario: Escucha y valoración intercaladas por canción también forman el barrido

- **WHEN** un seguido escucha y valora, canción por canción, 3 o más canciones distintas del
  mismo álbum de forma consecutiva (escucha, valoración, escucha, valoración...)
- **THEN** el feed muestra dos filas de grupo separadas — "valoró N canciones" y "registró N
  escuchas" — en vez de filas sueltas alternadas por cambiar de `kind` en cada entrada

#### Scenario: Solo 2 canciones valoradas no alcanza el umbral

- **WHEN** un seguido valora 2 canciones distintas del mismo álbum, de forma consecutiva
- **THEN** no se forma ningún grupo de valoraciones (el umbral es 3) y esas valoraciones se
  muestran como filas individuales

#### Scenario: Una escucha de paso no cuenta para el umbral pero tampoco corta el barrido

- **WHEN** dentro de un tramo de valoraciones del mismo álbum aparece una escucha (sin
  valoración ni favorito) de otra canción del mismo álbum
- **THEN** esa escucha se evalúa dentro de su propio grupo de escuchas, sin sumar al umbral
  de valoraciones ni cortar el tramo para los demás tipos

#### Scenario: Canciones de dos álbumes distintos no se mezclan en un mismo barrido

- **WHEN** un seguido valora 2 canciones de un álbum y, de forma consecutiva, 3 canciones de
  un álbum distinto
- **THEN** el feed no forma un grupo para el primer álbum (no alcanza el umbral) y sí para
  el segundo, sin fundir ambos grupos de canciones en una sola fila

#### Scenario: Un comentario entre medio corta el barrido

- **WHEN** entre valoraciones de canciones del mismo álbum de un seguido aparece un
  comentario de esa persona
- **THEN** el tramo no se colapsa a través del comentario; el comentario se muestra como su
  propia entrada y cada lado se evalúa por separado

#### Scenario: No se mezcla entre autores distintos

- **WHEN** dos autores distintos valoran canciones del mismo álbum de forma consecutiva en
  el feed
- **THEN** el tramo no cruza autores; cada uno se evalúa con su propio tramo

#### Scenario: El barrido no expone métricas de gamificación

- **WHEN** el feed muestra un grupo formado dentro de un tramo de álbum
- **THEN** la fila no incluye el algoritmo, porcentajes, barras de progreso, contadores de
  racha, emojis de fuego ni exclamaciones — el mismo registro neutro que ya usa cualquier
  fila de grupo genérica

#### Scenario: El barrido en el rastro reciente omite el nombre del propio usuario

- **WHEN** el bloque de rastro reciente del propio usuario contiene un grupo formado dentro
  de un tramo de álbum
- **THEN** la fila se muestra sin repetir el `@username` del propio usuario, igual que el
  resto de ese bloque

#### Scenario: Marcar como favorito 3 canciones del mismo álbum también forma el barrido

- **WHEN** un seguido marca como favorito 3 canciones distintas del mismo álbum, de forma
  consecutiva y sin ninguna valoración de por medio
- **THEN** el feed muestra la fila de grupo "marcó 3 favoritos", igual que si esas 3
  canciones hubieran estado consecutivas en la lista cruda

#### Scenario: Un favorito de paso no rompe un barrido de valoraciones que ya calificaría

- **WHEN** un seguido valora una canción, marca como favorito y luego quita el favorito de
  otra canción del mismo álbum, y valora una tercera canción, todo de forma consecutiva
- **THEN** el feed muestra la fila de grupo "valoró 3 canciones"; el favorito intercalado no
  le quita al grupo de valoraciones la chance de alcanzar el umbral, y se muestra como su
  propia entrada suelta

#### Scenario: Favorito y valoración de la misma canción cuentan una sola vez

- **WHEN** un seguido marca como favorito y también valora la misma canción del álbum
- **THEN** esa canción participa en el grupo de favoritos y en el de valoraciones por
  separado, cada uno evaluado con su propio umbral — no se duplica dentro de un mismo grupo
  ni existe un umbral combinado entre tipos

