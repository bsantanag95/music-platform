## ADDED Requirements

### Requirement: Lo último que escuchaste en Inicio

El sistema SHALL mostrar en Inicio, solo con sesión y solo si la persona tiene al menos una
escucha, un estante «Lo último que escuchaste» con hasta 8 objetivos distintos que la persona
anotó como escucha, del más reciente al más antiguo, contando para cada objetivo solo su escucha
más reciente. Cada elemento SHALL mostrar la carátula (o la imagen de reserva), el título, el
artista cuando aplica, la fecha relativa de esa escucha y, si la persona valoró el objetivo, su
valoración en la forma compacta de `rating-display`; si no lo valoró, el contexto de la escucha.
Cada elemento SHALL enlazar a su entidad, y el estante SHALL ofrecer un acceso al diario. El
estante SHALL NOT filtrar por audiencia, porque es contenido propio. Por debajo de `lg`, el
estante SHALL desplazarse en horizontal en vez de apilarse.

#### Scenario: Escuchas repetidas del mismo disco
- **WHEN** una persona escuchó «Hysteria» hoy y hace una semana, y «Pyromania» ayer
- **THEN** el estante muestra «Hysteria» primero y una sola vez, seguido de «Pyromania»

#### Scenario: Escucha valorada y sin valorar
- **WHEN** la persona valoró «Too Fast for Love» con 77/100 y no valoró «Dr. Feelgood»
- **THEN** «Too Fast for Love» muestra `★ 77/100` y «Dr. Feelgood» muestra el contexto de su
  escucha, por ejemplo «Primera escucha»

#### Scenario: Escucha privada
- **WHEN** la persona tiene una escucha con audiencia privada
- **THEN** esa escucha aparece en su estante

#### Scenario: Sin escuchas
- **WHEN** una persona sin escuchas abre Inicio
- **THEN** el estante no se muestra

### Requirement: Actividad de quienes sigues en Inicio

Con sesión y al menos una persona seguida con relación aceptada, Inicio SHALL mostrar la
actividad reciente de quienes sigue (con las mismas reglas de audiencia y bloqueo que
`/me/feed`) como hasta 7 tarjetas, la primera a lo ancho. SHALL ir en tarjetas: escuchas,
valoraciones, reseñas, comentarios y favoritos de álbum; varias escuchas consecutivas de una misma
persona SHALL unirse en una sola tarjeta. Los seguimientos, los eventos de lista y de lista para
completar, las altas en la colección, los pendientes y los favoritos de canción o artista del mismo
tramo SHALL NOT ocupar tarjetas: SHALL resumirse en una línea por persona que nombre cada tipo de
evento con su cantidad. Las valoraciones SHALL usar la forma compacta de `rating-display`. Al
final, el bloque SHALL ofrecer un acceso a `/me/feed`, y SHALL NOT cargar más entradas dentro de
Inicio ni desplazarlas dentro de un contenedor de altura fija.

Si la persona no sigue a nadie, ese lugar SHALL mostrar la actividad reciente de la comunidad
(ver Requirement: Actividad reciente de la comunidad) en tarjetas, con un encabezado que lo
indique y una invitación a buscar gente para seguir, y la actividad de la comunidad SHALL NOT
repetirse más abajo en la misma página.

#### Scenario: Tarjetas y resumen
- **WHEN** las entradas más recientes de quienes sigue son una reseña de Ana, seis listas para
  completar creadas por Luis y una valoración de Luis
- **THEN** la reseña y la valoración aparecen como tarjetas y debajo hay una línea «Luis armó 6
  listas para completar»

#### Scenario: Racha de escuchas
- **WHEN** Ana registró cuatro escuchas seguidas sin otra entrada de tarjeta entre ellas
- **THEN** se muestran en una sola tarjeta con sus carátulas, no en cuatro

#### Scenario: Ver más actividad
- **WHEN** la persona activa «Ver más actividad»
- **THEN** la aplicación abre `/me/feed`

#### Scenario: Sin seguidos
- **WHEN** una persona que no sigue a nadie abre Inicio y hay actividad reciente de la comunidad
- **THEN** en el lugar del feed ve «Lo que se escucha en la comunidad» en tarjetas con un enlace a
  buscar gente, y la actividad de la comunidad no aparece de nuevo más abajo

#### Scenario: Seguidos sin actividad
- **WHEN** las personas que sigue no tienen actividad visible
- **THEN** el bloque muestra un texto vacío y el acceso a `/me/feed`, sin tarjetas

## MODIFIED Requirements

### Requirement: Contenido de Inicio diferenciado por sesión

El sistema SHALL componer el contenido de `/[locale]` según haya una sesión activa o no.

Sin sesión, la página SHALL mostrar la propuesta de valor (tagline), el hero visual con
llamada a la acción para registrarse o iniciar sesión, y el bloque de funcionalidades,
y SHALL NOT mostrar accesos rápidos de usuario, saludo, ni ningún bloque de contenido
propio (feed de seguidos, rastro reciente, retomar lista). La propuesta de valor del hero
SHALL presentar el producto como el diario de lo que una persona escucha —registrar cada
álbum sin tener que opinar y valorarlo con estrellas o con un puntaje de 1 a 100 cuando
quiera— y el descubrimiento como algo que pasa por lo que escuchan otras personas, no por un
algoritmo. El hero sin sesión
SHALL incluir un buscador del catálogo con el mismo selector de tipo, las mismas
sugerencias y la misma navegación que la búsqueda del Header. El hero sin sesión SHALL
mostrar una entrada de ejemplo fija —un álbum con estrellas, puntaje detallado de 1 a 100
y contexto de escucha— rotulada visiblemente como ejemplo, que SHALL NOT mostrar datos ni
nombres de usuarios reales. Las llamadas a la acción del hero SHALL enlazar directamente
al registro y al inicio de sesión, sin un diálogo intermedio. Debajo del hero, la
página sin sesión SHALL mostrar un **bloque editorial de álbumes** compuesto por, cuando
cada uno tiene contenido: las colecciones curadas de la superficie de descubrimiento —solo
cuando esa superficie está habilitada— y los álbumes mejor valorados por la comunidad. Cada
parte de ese bloque SHALL colapsar de forma independiente cuando no tiene contenido, y el
bloque entero SHALL desaparecer cuando ninguna parte tiene contenido.

Con sesión activa, la página SHALL mostrar, en este orden: una cabecera con un saludo
breve al usuario como antetítulo, el titular «¿Qué escuchaste hoy?» como encabezado
principal de la página, un campo para registrar una escucha (ver Requirement: Registrar
una escucha desde Inicio), los accesos rápidos a diario, favoritos, listas, colección y
progreso, y la tarjeta «Última vez» (ver Requirement: Última vez en la cabecera de
Inicio) o, para una cuenta sin actividad, la variante de bienvenida (ver Requirement:
Cabecera de Inicio para una cuenta sin actividad); el estante «Lo último que escuchaste»
si tiene escuchas (ver Requirement: Lo último que escuchaste en Inicio); la actividad de
quienes sigue en tarjetas o, si no sigue a nadie, la actividad de la comunidad en ese lugar
(ver Requirement: Actividad de quienes sigues en Inicio); y un acceso para retomar su lista
editada más recientemente si tiene al menos una lista. Ningún bloque de Inicio SHALL
desplazar su contenido dentro de un contenedor de altura fija. La página con sesión SHALL NOT mostrar la tagline de propuesta de valor, el
hero visual del visitante anónimo, el bloque de funcionalidades, ninguna llamada a la
acción de registro o inicio de sesión, ni el buscador del hero (esa entrada queda
cubierta por la búsqueda persistente del Header). El campo para registrar una escucha
SHALL NOT funcionar como buscador del catálogo: no navega a `/search` ni a la entidad
elegida. El
bloque editorial de álbumes descrito para la vista sin sesión NO SHALL mostrarse en la
vista con sesión.

El saludo y los bloques de contenido propio SHALL NOT incluir conteos de progreso,
elementos pendientes de valorar, rachas ni medallas de completitud.

#### Scenario: Visitante sin sesión
- **WHEN** un visitante sin sesión abre `/[locale]`
- **THEN** ve tagline, hero visual con llamada a la acción de registro/login y el
  bloque de funcionalidades, y no ve saludo, accesos rápidos de usuario, preview de
  feed, rastro reciente ni el acceso para retomar una lista

#### Scenario: Propuesta de valor del hero
- **WHEN** un visitante sin sesión abre `/[locale]`
- **THEN** el titular del hero presenta el producto como el diario de lo que escucha y de lo
  que escuchan otras personas, y la bajada explica que registrar no exige opinar y que la
  valoración con estrellas o de 1 a 100 es opcional

#### Scenario: Buscador en el hero sin sesión
- **WHEN** un visitante sin sesión escribe un artista en el buscador del hero y envía la
  consulta sin elegir una sugerencia
- **THEN** la aplicación navega a `/search?type=artist&q=<consulta>`, igual que desde el
  Header, y elegir una sugerencia abre directamente la entidad sugerida

#### Scenario: Entrada de ejemplo en el hero
- **WHEN** un visitante sin sesión abre `/[locale]`
- **THEN** ve en el hero una entrada con un álbum, sus estrellas, un puntaje de 1 a 100 y
  un contexto de escucha, con un rótulo visible de ejemplo y sin el nombre de ningún
  usuario real

#### Scenario: Acciones directas de registro e inicio de sesión
- **WHEN** un visitante sin sesión activa la acción principal del hero
- **THEN** la aplicación abre `/auth/register` sin mostrar antes un diálogo, y el enlace
  secundario del hero abre `/auth/login`

#### Scenario: Bloque editorial de álbumes en el landing anónimo
- **WHEN** un visitante sin sesión abre `/[locale]` y hay colecciones curadas (con el
  descubrimiento habilitado) o álbumes con suficientes valoraciones de la comunidad
- **THEN** ve, debajo del hero y encima de los bloques de la comunidad, un bloque con esas
  colecciones y/o el riel de álbumes mejor valorados

#### Scenario: Bloque editorial de álbumes sin contenido
- **WHEN** un visitante sin sesión abre `/[locale]` y no hay colecciones aplicables ni
  suficientes álbumes valorados
- **THEN** el bloque editorial de álbumes no se renderiza y el resto de la página se
  compone sin espacios vacíos

#### Scenario: Descubrimiento deshabilitado
- **WHEN** la superficie de descubrimiento está deshabilitada y un visitante sin sesión
  abre `/[locale]`
- **THEN** el bloque editorial no muestra colecciones curadas; puede mostrar el riel de
  álbumes mejor valorados si hay contenido

#### Scenario: Usuario con sesión y al menos un seguido
- **WHEN** un usuario autenticado que sigue a al menos otra persona con relación aceptada
  abre `/[locale]`
- **THEN** ve el saludo como antetítulo, el titular «¿Qué escuchaste hoy?», el campo para
  registrar una escucha, los accesos rápidos, y la actividad de quienes sigue en tarjetas
  con un acceso a `/me/feed`, y no ve la tagline de propuesta de valor, el
  hero anónimo, el bloque de funcionalidades, el buscador del hero ni el bloque editorial
  de álbumes del landing anónimo

#### Scenario: Usuario con sesión sin seguidos
- **WHEN** un usuario autenticado que no sigue a nadie abre `/[locale]`
- **THEN** en el lugar de la actividad de quienes sigue ve la actividad reciente de la
  comunidad en tarjetas con una invitación a buscar gente para seguir, no un feed vacío,
  y no ve el buscador del hero

#### Scenario: Usuario con sesión sin actividad propia ni listas
- **WHEN** un usuario autenticado que nunca registró escuchas, valoraciones ni
  comentarios y no tiene listas abre `/[locale]`
- **THEN** no ve el estante «Lo último que escuchaste» ni el acceso para retomar una lista, ve la
  cabecera en su variante de bienvenida, y el resto de la página (onboarding, accesos
  rápidos, bloques de descubrimiento) se compone sin espacios vacíos

## REMOVED Requirements

### Requirement: Rastro reciente del propio usuario en Inicio
**Reason**: El estante «Lo último que escuchaste» lo reemplaza en Inicio (decisión del rediseño del Inicio con sesión, 2026-11-17): el
rastro mezclaba eventos de poco valor y vivía en una caja con scroll interno.
**Migration**: El rastro completo sigue en `/me/diary`, en el perfil propio y en la pestaña «Tú» de `/activity`; `GET
/api/me/recent-activity` no cambia. Ver Requirement: Lo último que escuchaste en Inicio.

### Requirement: Carga incremental en los bloques de Inicio
**Reason**: Inicio deja de usar contenedores de altura fija con scroll interno, que atrapaban el gesto en el teléfono.
**Migration**: La actividad de quienes sigue muestra un tramo fijo en tarjetas con un acceso a `/me/feed`, donde sigue la carga por
páginas. Ver Requirement: Actividad de quienes sigues en Inicio.
