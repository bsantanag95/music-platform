## MODIFIED Requirements

### Requirement: Alcance del feed v1

El feed v1 SHALL contener escuchas del diario, favoritos, eventos de listas publicadas,
ratings vigentes y comentarios, y SHALL NOT contener un historial de valoraciones pasadas
por objetivo. Un evento de lista SHALL generarse por la creación de una lista o por la
actualización de sus metadatos (título, descripción o audiencia), no por cada ítem
agregado o quitado. Un rating SHALL aparecer en el feed una única vez por usuario y
objetivo, reflejando siempre el valor vigente y su fecha de última actualización; una
nueva valoración sobre el mismo objetivo SHALL reemplazar la entrada anterior en el feed en
lugar de agregar una entrada adicional. Cada comentario SHALL generar su propia entrada de
feed, sin deduplicar por autor u objetivo. Ratings y comentarios no tienen audiencia
propia: a efectos del feed SHALL tratarse como audiencia `public`, sujeta igualmente a la
regla de visibilidad de perfil del autor y de bloqueos. Cada entrada SHALL mostrarse con el
autor (username y displayName), el tipo de actividad, la fecha y el objetivo. El objetivo
SHALL exponerse con su título y, cuando es un álbum o una canción, con el nombre de su
artista principal; para objetivos de tipo artista o lista el nombre de artista SHALL ser
nulo. Este campo de artista es una ampliación aditiva del payload y no altera la
composición, la deduplicación ni las reglas de visibilidad del feed.

#### Scenario: Solo escuchas, favoritos, listas, ratings y comentarios
- **WHEN** un seguido realiza una actividad de un tipo no contemplado por el feed
- **THEN** ese evento no genera ninguna entrada en el feed

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

#### Scenario: Varios comentarios sobre el mismo objetivo
- **WHEN** un seguido publica más de un comentario sobre el mismo artista, álbum o canción
- **THEN** el feed muestra una entrada por cada comentario, cada una con su propia fecha

#### Scenario: Rating o comentario de un perfil privado sin relación aprobada
- **WHEN** un usuario valora o comenta y su perfil es privado, y el lector no tiene una
  relación de seguimiento aceptada con ese perfil
- **THEN** esa entrada de rating o comentario no aparece en el feed del lector, aunque en
  la vista de catálogo siga siendo visible para cualquiera

#### Scenario: Rating o comentario con bloqueo entre autor y lector
- **WHEN** existe un bloqueo en cualquier dirección entre el lector y el autor de un rating
  o comentario
- **THEN** esa entrada no aparece en el feed del lector

## ADDED Requirements

### Requirement: Jerarquía de presentación del feed

La presentación de una lista vertical cronológica de entradas de feed SHALL renderizar
cada entrada según su peso de contenido, no con un formato único. Esta presentación
SHALL usarse en `/me/feed`, en el preview del feed de seguidos de Inicio y en el bloque
de rastro reciente del propio usuario. Los bloques de descubrimiento de Inicio que usan
un layout compacto o de grilla (actividad de la comunidad, listas públicas recientes) NO
están cubiertos por este requirement y conservan su presentación propia.

**Peso de entrada.** Una entrada SHALL considerarse **con texto** cuando es un comentario,
o una escucha con nota escrita no vacía; el resto (favorito, evento de lista, rating, y
escucha sin nota) SHALL considerarse **de sola presencia**. Una entrada con texto SHALL
mostrar su texto completo sobre una superficie visualmente diferenciada del fondo (un
escalón de temperatura más claro, sin sombra). Una entrada de sola presencia SHALL
ocupar una sola fila de baseline. Si una escucha de sola presencia tiene reacción, la
reacción SHALL mostrarse en esa misma fila.

**Anatomía de fila.** En `/me/feed` y en el preview de feed de seguidos, cada fila SHALL
abrir con una celda cuadrada fija a la izquierda que muestra la carátula del objetivo
cuando existe y el disco de vinilo (círculos concéntricos) cuando no; la ausencia de
carátula NUNCA SHALL dejar un hueco ni romper la alineación. El título del objetivo
SHALL ser el elemento visual dominante de la fila y SHALL exponer una afordancia de
enlace que no dependa del estado `:hover`. El autor, el verbo de acción, la audiencia
(cuando aplique) y la fecha SHALL ir en una línea de metadato secundaria. Para objetivos
de álbum y canción, el nombre del artista SHALL mostrarse junto al título.

**Rating.** Una entrada de rating SHALL renderizarse con una representación visual de la
valoración (marcas en el color de acento) acompañada SIEMPRE del valor numérico; cuando
existe un score detallado, SHALL mostrarse junto al valor de estrellas. El color de
acento SHALL usarse en reposo únicamente para esta representación del rating.

**Fecha.** La fecha SHALL mostrarse en forma relativa ("hace 2 días") y SHALL conservar
la fecha absoluta como valor accesible del elemento de tiempo. Dentro de una misma
página, los bloques de actividad de feed NO SHALL mezclar fecha relativa y absoluta.

**Agrupación de actividad ambiente.** Cuando 3 o más entradas consecutivas del mismo tipo
de sola presencia (escuchas sin nota, o favoritos) y del mismo autor aparecen seguidas,
SHALL plegarse en una única fila que nombra al autor, la cantidad y lista los títulos
enlazados. Los comentarios y las escuchas con nota NUNCA SHALL colapsarse. La fila
agrupada SHALL llevar un único marcador de tiempo.

**Rastro reciente del propio usuario.** El bloque de rastro reciente SHALL diferenciarse
visualmente del preview de feed de seguidos por composición: SHALL NOT repetir el nombre
del propio usuario en cada fila y SHALL NOT usar la celda de carátula/disco; en su lugar
SHALL usar un tratamiento de margen (un riel o hairline izquierdo continuo). SHALL
conservar el orden cronológico y NO SHALL convertirse en un resumen estadístico.

**Solo lectura.** Una lista cubierta por este requirement SHALL NOT ofrecer acciones sobre
las entradas (reaccionar, responder, editar). La navegación al perfil del autor y al
objetivo musical SHALL seguir disponible.

#### Scenario: Comentario se muestra como bloque con texto sobre superficie diferenciada

- **WHEN** el feed incluye un comentario de un seguido
- **THEN** el cuerpo completo del comentario se muestra sobre una superficie más clara que
  el fondo, con el autor, el objetivo y la fecha relativa, y sin sombra

#### Scenario: Escucha con nota escrita se muestra como bloque con texto

- **WHEN** el feed incluye una escucha cuya nota (`body`) no está vacía
- **THEN** la entrada se muestra como un bloque con la nota visible, no como una línea

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

#### Scenario: El rastro reciente no muestra el nombre del propio usuario

- **WHEN** un usuario con sesión abre `/[locale]` y su bloque de rastro reciente tiene
  varias entradas
- **THEN** ninguna fila repite su `@username`, el bloque no usa la celda de carátula/disco
  y se distingue del preview de feed de seguidos por un tratamiento de margen izquierdo

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
