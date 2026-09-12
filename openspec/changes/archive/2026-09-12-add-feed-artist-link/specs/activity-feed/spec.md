## MODIFIED Requirements

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
