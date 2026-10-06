## MODIFIED Requirements

### Requirement: Feed de actividad de usuarios seguidos

El sistema SHALL exponer, para un usuario autenticado, un feed de actividad v1 compuesto por
las actividades visibles de los usuarios a los que sigue con relación aceptada: escuchas
(`listen_entry`), favoritos, eventos de listas (creación o actualización de metadatos),
ratings vigentes, comentarios, **reseñas de álbum vigentes**, **Caminos creados y
completados**, **altas en la colección física** y **altas en "En tu búsqueda"** (wishlist). El feed SHALL ordenar las
actividades de la más reciente a la más antigua con paginación
(`{ entries, page, pageSize, hasNext }`) y SHALL aplicar la misma regla de visibilidad de
actividades ajenas que el perfil: cada actividad solo aparece si es visible para el lector
según audiencia, visibilidad del perfil del autor y bloqueos. Sin sesión, la petición SHALL
responder `401` con código `AUTH_REQUIRED`.

El sistema SHALL aceptar tres parámetros de filtro opcionales, combinables entre sí y
aplicados sobre la composición completa (no solo sobre la página ya cargada): `kind`
(acotar a un único tipo de actividad entre `listen`, `favorite`, `list`, `rating`,
`comment`, `review`, `collection`, `wanted` o `camino`), `authorId` (acotar a un único autor, que SHALL pertenecer a los
seguidos con relación aceptada del lector), y `q` (coincidencia parcial, sin distinguir
mayúsculas ni acentos exactos, sobre el título del objetivo de cada entrada — nombre de
artista, álbum o canción, o el título del Camino; el texto de comentarios, notas de escucha y cuerpo de reseñas NO
SHALL considerarse en la búsqueda). Sin ninguno de estos parámetros, el comportamiento
SHALL ser idéntico al de una consulta sin filtros. Un `kind` fuera del enum cerrado, o un
`authorId` que no pertenezca a los seguidos aceptados del lector, SHALL responder `400` con
código `VALIDATION_ERROR`.

#### Scenario: Feed de un usuario con seguidos
- **WHEN** un usuario autenticado que sigue a otros con relación aceptada consulta su feed
- **THEN** ve las escuchas, favoritos, eventos de listas, ratings, comentarios, reseñas,
  eventos de Camino y altas de colección y de wishlist visibles de esos seguidos, ordenados de la más reciente a la más antigua y paginados

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

#### Scenario: Filtro por tipo colección, wishlist o Camino
- **WHEN** el lector consulta su feed con `kind=collection`, `kind=wanted` o `kind=camino`
- **THEN** solo aparecen entradas de ese tipo de sus seguidos (para `camino`, tanto las de
  creación como las de completado), con las mismas reglas de visibilidad que el feed sin filtrar

#### Scenario: Búsqueda por el título de un Camino
- **WHEN** el lector busca con `q` un texto que coincide con el título de un Camino de un seguido
- **THEN** las entradas de ese Camino aparecen en el resultado

### Requirement: Alcance del feed v1

El feed v1 SHALL contener escuchas del diario, favoritos, eventos de listas publicadas,
ratings vigentes, comentarios, reseñas de álbum vigentes, la creación y el completado de un
Camino, las altas en la colección física y en la wishlist ("En tu búsqueda") y, como **tier 4**,
los eventos de empezar a seguir a un usuario y de empezar a seguir a un artista; SHALL NOT contener un
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

**Camino.** Crear un Camino (`kind = 'custom_journey'`) SHALL generar una entrada con la fecha
de creación; editar, archivar o desarchivar un Camino NO SHALL generar entrada. Completar un
Camino SHALL generar una entrada **derivada en lectura**, sin tabla de eventos: un Camino está
completo cuando tiene al menos un álbum y todos sus álbumes tienen al menos una escucha del dueño
(mismo criterio de progreso que la página del Camino), y la fecha de la entrada SHALL ser el
instante en que quedó cubierto el último álbum — el mayor, entre los álbumes, de la fecha de la
primera escucha del dueño y la fecha de alta del álbum en el Camino. Si el Camino deja de estar
completo (se agrega un álbum sin escuchar o se quita una escucha), la entrada de completado SHALL
dejar de aparecer. Ambas entradas SHALL aparecer solo si el Camino tiene audiencia `followers` o
`public`, no está oculto por moderación ni archivado, y sin bloqueo entre lector y autor. Trackear
un Camino o una lista ajena NO SHALL generar entradas (es privado del que trackea). Un Recorrido
de artista (`artist_journey`) NO SHALL generar entradas.

**Colección física y wishlist.** Agregar un disco a la colección física o a la wishlist SHALL
generar una entrada por cada alta, con la fecha de alta, el álbum como objetivo y el formato
cuando existe, solo si su audiencia es `followers` o `public` y sin bloqueo entre lector y autor.
La nota de la entrada NO SHALL mostrarse en el feed. Editar o quitar una entrada NO SHALL generar
una entrada nueva; quitarla SHALL hacer desaparecer la suya.

Las listas ocultas por moderación NO SHALL generar eventos de lista.

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

#### Scenario: Crear un Camino visible genera entrada
- **WHEN** un seguido crea un Camino con audiencia `followers`
- **THEN** el feed del lector muestra una entrada "creó un Camino" con el título enlazado a la
  página del Camino y la fecha de creación

#### Scenario: Un Camino privado o archivado no genera entradas
- **WHEN** un seguido tiene un Camino con audiencia `private`, u otro archivado
- **THEN** ninguno de los dos genera entradas de creación ni de completado

#### Scenario: Completar un Camino genera entrada con la fecha del último álbum cubierto
- **WHEN** un seguido tiene un Camino visible de 3 álbumes y registra la primera escucha del
  último que le faltaba
- **THEN** el feed muestra una entrada "completó un Camino" con la fecha de esa escucha

#### Scenario: Agregar un álbum sin escuchar retira la entrada de completado
- **WHEN** un seguido agrega un álbum que todavía no escuchó a un Camino ya completo
- **THEN** la entrada de completado de ese Camino deja de aparecer

#### Scenario: Un Camino vacío no está completo
- **WHEN** un seguido crea un Camino sin álbumes
- **THEN** el feed muestra la entrada de creación pero ninguna de completado

#### Scenario: Trackear un Camino ajeno no genera entrada
- **WHEN** un seguido activa el seguimiento de progreso sobre el Camino de otra persona
- **THEN** ese gesto no genera ninguna entrada en el feed

#### Scenario: Un Recorrido de artista no genera entrada
- **WHEN** un seguido activa un Recorrido de artista
- **THEN** el feed no muestra ninguna entrada por ese Recorrido

#### Scenario: Alta en la colección con audiencia visible
- **WHEN** un seguido agrega un vinilo de un álbum a su colección con audiencia `followers`
- **THEN** el feed muestra una entrada "sumó a su colección" con el álbum, su artista, la
  carátula y el formato, sin la nota

#### Scenario: Alta privada en la colección o en la wishlist
- **WHEN** un seguido agrega un disco a su colección o a su wishlist con audiencia `private`
- **THEN** esa alta no aparece en el feed

#### Scenario: Alta en la wishlist con audiencia visible
- **WHEN** un seguido agrega un álbum a "En tu búsqueda" con audiencia `public`
- **THEN** el feed muestra una entrada "busca" con el álbum, su artista y el formato o
  "cualquier formato"

#### Scenario: Lista oculta por moderación
- **WHEN** una lista de un seguido queda oculta por moderación
- **THEN** su evento de lista deja de aparecer en el feed

## ADDED Requirements

### Requirement: Presentación del feed por tiers de intención

La presentación de una lista vertical cronológica de entradas de feed SHALL renderizar
cada entrada según su **tier de intención**, no con un formato único. Esta presentación
SHALL usarse en `/me/feed`, en el preview del feed de seguidos de Inicio y en el bloque
de rastro reciente del propio usuario. Los bloques de descubrimiento de Inicio que usan
un layout compacto o de grilla (actividad de la comunidad, listas públicas recientes) NO
están cubiertos por este requirement y conservan su presentación propia.

**Diferenciación visual por tipo.** Cada `kind` (escucha, favorito, evento de lista,
rating, comentario, reseña, Camino, colección, wishlist, seguir a un usuario, seguir a un
artista) SHALL mostrarse con un
glifo mono de 14px junto al verbo de la línea de metadato, reforzando el tipo de entrada sin
ser nunca la única señal — el texto del verbo SHALL acompañar siempre al glifo, mismo
criterio de accesibilidad que los íconos de reacción de escucha. "Seguir a un usuario" y
"seguir a un artista" SHALL compartir el mismo glifo (misma acción, "empezar a seguir",
distinta solo en el objetivo y el verbo). El rating SHALL quedar exento: sus estrellas
(ver `rating-display`) ya cumplen ese rol y no SHALL sumar un glifo adicional. El rating
SHALL mostrarse con la fila de cinco estrellas de `rating-display`, acompañada del número
(`4,5`, con la convención del idioma) o, cuando el autor puso puntaje detallado (1–100), del
puntaje `86/100` en lugar del número de estrellas (nunca ambos); en la corrida plegada el valor
SHALL mostrarse en forma compacta, `★ 4,5` o `★ 86/100` cuando hay puntaje; NO SHALL usarse un medidor de
barras ni otro símbolo propio del feed para la nota. Una reseña SHALL
distinguirse además con su propio tratamiento: un rótulo "Reseña" en el segundo color de
acento del sistema, su título (cuando existe) mostrado como titular en vez de como metadato
secundario, y un borde izquierdo propio en ese color — el mismo tratamiento editorial
reservado que ya usa una lista oficial en la superficie pública de listas. Este segundo
acento SHALL reservarse exclusivamente a la reseña dentro del feed.

**Tiers de intención.** Cada entrada SHALL clasificarse en uno de cuatro tiers según su
tipo y su objetivo:

- **Tier 1 — Expresivo:** comentario · escucha con nota escrita no vacía · **reseña de
  álbum** · evento de lista · evento de Camino (creado o completado) · fila fusionada de
  opinión (ver "Fusión de opinión en el feed"). Comentario, nota de escucha y reseña SHALL mostrarse como una
  **cita** — un borde izquierdo de acento neutro con el texto indentado, NUNCA como una
  caja o panel con fondo propio ni escalón de temperatura (la reseña usa el acento propio
  descrito en "Diferenciación visual por tipo" en vez del acento neutro). El evento de
  lista y el evento de Camino son tier 1 pero SHALL mostrarse como fila de título, no como
  cita; el evento de Camino SHALL enlazar a la página de lectura del Camino. Dentro de la
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
  artista** · escucha sin nota · reacción · **alta en la colección física** · **alta en la
  wishlist**. Colección y wishlist SHALL abrir con la celda de carátula del álbum y mostrar el
  formato junto al verbo cuando existe. SHALL ocupar una sola fila mínima de baseline;
  si una escucha tiene reacción, la reacción SHALL mostrarse en esa misma fila. Corridas de
  3 o más entradas consecutivas del mismo tipo y autor SHALL colapsarse en una única fila.
- **Tier 4 — Ambiente:** **seguir usuario** · **seguir artista**. **Seguir a un usuario y seguir a un artista SHALL activarse en el feed
  principal**: cada uno SHALL ocupar una sola fila mínima, sin celda de carátula ni objetivo
  de catálogo (el "objetivo" es la persona o el artista seguido, enlazado a su perfil o
  página), con el autor, el verbo y el objetivo seguido en una única línea. Corridas de 3 o
  más entradas consecutivas del mismo tipo ("seguir usuario" o "seguir artista") y autor
  SHALL colapsarse en una única fila, mismo criterio que tiers 2/3, sin mezclar ambos tipos
  en una misma corrida.

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
valoración (marcas en el color de acento) acompañada SIEMPRE de un valor numérico: el puntaje
detallado `86/100` cuando el autor lo puso o, si no, el número de estrellas; la etiqueta
accesible SHALL incluir el puntaje cuando se muestra. El color de acento SHALL usarse en reposo únicamente para esta representación del
rating, salvo el segundo acento reservado a la reseña (ver "Diferenciación visual por tipo").

**Fecha.** La fecha SHALL mostrarse en forma relativa ("hace 2 días") y SHALL conservar
la fecha absoluta como valor accesible del elemento de tiempo. Dentro de una misma
página, los bloques de actividad de feed NO SHALL mezclar fecha relativa y absoluta.

**Agrupación de actividad.** Una corrida es una secuencia de entradas consecutivas del
mismo tier (2, 3 o 4), del mismo `kind` y del mismo autor (colección y wishlist son tipos
distintos y no se mezclan). Cuando una corrida alcanza 3 o
más entradas, SHALL plegarse en una única fila que nombra al autor, la cantidad y lista los
títulos o personas enlazadas, con un único marcador de tiempo. Las entradas tier 1
(comentarios, notas de escucha, reseñas, eventos de lista, eventos de Camino y filas fusionadas
de opinión) NUNCA SHALL colapsarse y SHALL
cortar la corrida.

**Rastro reciente del propio usuario.** El bloque de rastro reciente SHALL diferenciarse
visualmente del preview de feed de seguidos por composición: SHALL NOT repetir el nombre
del propio usuario en cada fila y SHALL NOT usar la celda de carátula/disco; en su lugar
SHALL usar un tratamiento de margen (un riel o hairline izquierdo continuo). SHALL
conservar el orden cronológico y NO SHALL convertirse en un resumen estadístico. Este
bloque también SHALL incluir las entradas de "seguir a un usuario" y de "seguir a un
artista" del propio usuario, con la misma fila mínima sin celda, y sus altas de colección
y de wishlist y sus eventos de Camino, sin filtro de audiencia (es contenido propio).

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
  valoración en el color de acento y, al lado, el score detallado (`86/100`) si existe o el
  valor numérico de estrellas si no

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

#### Scenario: Un alta de colección se muestra con celda de carátula
- **WHEN** un seguido agrega un disco a su colección física con audiencia visible
- **THEN** el feed principal muestra una fila con la carátula del álbum, el verbo "sumó a su
  colección" con el formato, el título del álbum y su artista enlazados

#### Scenario: Una corrida de altas de colección se pliega
- **WHEN** un seguido agrega 4 discos a su colección de forma consecutiva, sin otra actividad
  entre medio
- **THEN** el feed muestra una única fila plegada que nombra al autor, la cantidad y lista los
  álbumes enlazados, con un solo marcador de tiempo

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
  metadato, salvo el rating, que no lo necesita porque ya se reconoce por sus estrellas

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

#### Scenario: El feed muestra el puntaje detallado
- **WHEN** un seguido valoró un álbum con 4,5 estrellas y un puntaje detallado de 86
- **THEN** su entrada en el feed muestra la fila de estrellas con `86/100` (sin `4,5` ni
  `4,5 · 86`) y la etiqueta accesible dice "4,5 de 5 estrellas, 86 de 100"

#### Scenario: Valoración sin puntaje detallado
- **WHEN** un seguido valoró un álbum con 4,5 estrellas sin puntaje detallado
- **THEN** su entrada en el feed muestra la fila de estrellas con `4,5`

#### Scenario: Puntaje en la corrida plegada
- **WHEN** el feed pliega 3 valoraciones de canción de un seguido, una con puntaje 86
- **THEN** esa valoración se muestra como `★ 86/100` y las otras como `★ 4,5`

#### Scenario: Evento de Camino como fila de título
- **WHEN** un seguido completa un Camino visible
- **THEN** el feed muestra una fila con el glifo de Camino, el verbo "completó un Camino" y
  el título del Camino enlazado a su página de lectura


### Requirement: Fusión de opinión en el feed

Cuando en la lista cronológica aparecen **consecutivas** una valoración, una reseña y/o un
comentario del **mismo autor** sobre el **mismo objetivo** (mismo tipo e identificador), la
presentación SHALL fusionarlas en una única fila de opinión, con a lo sumo una entrada de cada
tipo: un segundo comentario sobre el mismo objetivo SHALL quedar como fila propia. La fila
fusionada SHALL mostrar la celda de carátula, un verbo compuesto que nombra los gestos incluidos
("Valoró y reseñó", "Valoró y comentó", "Reseñó y comentó", "Valoró, reseñó y comentó"), el
objetivo, las estrellas con el puntaje cuando existe, el mismo tratamiento que una entrada de
reseña (título como titular y cuerpo como cita con el acento de reseña) cuando la incluye y el comentario como cita; la fecha SHALL ser la más reciente de las
entradas fusionadas. La fila fusionada SHALL ser tier 1: nunca se pliega y corta corridas. La
fusión SHALL hacerse solo en la presentación (el contrato de la API, el filtro por tipo y la
paginación no cambian) y NO SHALL reordenar entradas: si otra entrada se interpone, las entradas
quedan separadas.

#### Scenario: Valoración y reseña del mismo álbum se fusionan
- **WHEN** un seguido valora un álbum con 4,5 estrellas y puntaje 86 y enseguida publica su
  reseña
- **THEN** el feed muestra una sola fila "Valoró y reseñó" con las estrellas y `86/100`, el
  título de la reseña y su cuerpo como cita

#### Scenario: Valoración, reseña y comentario se fusionan en una fila
- **WHEN** un seguido valora, reseña y comenta el mismo álbum de forma consecutiva
- **THEN** el feed muestra una sola fila "Valoró, reseñó y comentó" con la nota, la reseña y el
  comentario

#### Scenario: Objetivos distintos no se fusionan
- **WHEN** un seguido valora un álbum y enseguida comenta otro
- **THEN** el feed muestra dos filas separadas

#### Scenario: Otra entrada entre medio impide la fusión
- **WHEN** entre la valoración y la reseña de un seguido sobre el mismo álbum aparece la
  actividad de otra persona
- **THEN** la valoración y la reseña se muestran como filas separadas

#### Scenario: Dos comentarios no se fusionan entre sí
- **WHEN** un seguido valora un álbum y luego deja dos comentarios sobre él, consecutivos
- **THEN** el comentario contiguo a la valoración se fusiona con ella y el otro comentario
  queda como fila propia

#### Scenario: La fusión no altera el filtro por tipo
- **WHEN** el lector filtra su feed por `kind=rating`
- **THEN** solo ve valoraciones, sin filas fusionadas

## REMOVED Requirements

### Requirement: Jerarquía de presentación del feed
**Reason**: Dos de sus escenarios dejan de ser ciertos ("Los eventos ambiente (tier 4) no
aparecen en el feed en esta versión" y "El feed no muestra el puntaje detallado"): la colección
entra al feed como tier 3 y el feed muestra el puntaje detallado.
**Migration**: Reemplazado por "Presentación del feed por tiers de intención", con el mismo contenido actualizado (tiers,
anatomía de fila, rating con puntaje, colección y wishlist en tier 3, eventos de Camino).
