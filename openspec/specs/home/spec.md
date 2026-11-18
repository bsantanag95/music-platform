# Home Page

## Purpose

Página de Inicio de la aplicación, diferenciada según haya sesión activa o no.
Muestra actividad reciente de la comunidad, listas públicas, y contenido personalizado
para usuarios autenticados.
## Requirements
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
Cabecera de Inicio para una cuenta sin actividad); un
preview del feed de seguidos como bloque principal o, si el usuario no sigue a nadie, un
bloque de onboarding en su lugar; un bloque con la actividad reciente del propio usuario
si existe; y un acceso para retomar su lista editada más recientemente si tiene al menos
una lista. La página con sesión SHALL NOT mostrar la tagline de propuesta de valor, el
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
  registrar una escucha, los accesos rápidos, y un preview del feed de seguidos con
  link a `/me/feed` como bloque principal, y no ve la tagline de propuesta de valor, el
  hero anónimo, el bloque de funcionalidades, el buscador del hero ni el bloque editorial
  de álbumes del landing anónimo

#### Scenario: Usuario con sesión sin seguidos
- **WHEN** un usuario autenticado que no sigue a nadie abre `/[locale]`
- **THEN** en el lugar del preview de feed ve un bloque de onboarding que lo invita a
  buscar gente y explorar el catálogo, no un feed vacío, y no ve el buscador del hero;
  registrar una escucha queda en el campo de la cabecera, no repetido en ese bloque

#### Scenario: Usuario con sesión sin actividad propia ni listas
- **WHEN** un usuario autenticado que nunca registró escuchas, valoraciones ni
  comentarios y no tiene listas abre `/[locale]`
- **THEN** no ve el bloque de rastro reciente ni el acceso para retomar una lista, ve la
  cabecera en su variante de bienvenida, y el resto de la página (onboarding, accesos
  rápidos, bloques de descubrimiento) se compone sin espacios vacíos

### Requirement: Rastro reciente del propio usuario en Inicio

El sistema SHALL mostrar en Inicio, solo para usuarios con sesión activa, un bloque con
las escuchas, valoraciones y comentarios más recientes registrados por el propio usuario,
ordenados por fecha descendente, dentro de un contenedor de altura fija con scroll
interno (ver Requirement: Carga incremental en los bloques de Inicio). El bloque SHALL
NOT aplicar filtros de audiencia, porque es contenido del propio usuario. El bloque SHALL
NOT mostrarse si el usuario no tiene ninguna entrada de esos tipos.

#### Scenario: Usuario con actividad propia reciente
- **WHEN** un usuario autenticado que registró escuchas, valoraciones o comentarios
  abre `/[locale]`
- **THEN** ve un bloque con sus entradas más recientes de esos tipos, cada una con link
  a la entidad correspondiente

#### Scenario: La actividad propia privada también aparece
- **WHEN** un usuario autenticado tiene una escucha o valoración con audiencia privada
- **THEN** esa entrada aparece igualmente en su bloque de rastro reciente, porque el
  bloque muestra contenido propio sin filtrar por audiencia

#### Scenario: Usuario sin actividad propia
- **WHEN** un usuario autenticado no tiene ninguna escucha, valoración ni comentario
- **THEN** el bloque de rastro reciente no se muestra en la página

### Requirement: Carga incremental en los bloques de Inicio

El sistema SHALL cargar inicialmente hasta 10 entradas en los bloques "Tu feed" y "Tu
rastro reciente" de Inicio, mostradas dentro de un contenedor con una altura fija que no
crece respecto a mostrar menos entradas: el contenido excedente SHALL desplazarse
mediante scroll dentro del contenedor, no expandir el bloque en la página. Al desplazar
el contenedor hasta su fondo, si existen más entradas, el sistema SHALL cargar
automáticamente la siguiente página y mostrar un indicador de carga circular mientras la
solicitud está en curso. El sistema SHALL NOT cargar más entradas de las que existen ni
mostrar el indicador de carga cuando ya no hay más páginas.

#### Scenario: Carga inicial de un bloque con más de 10 entradas disponibles
- **WHEN** un usuario autenticado tiene más de 10 entradas disponibles para "Tu feed" o
  "Tu rastro reciente"
- **THEN** el bloque muestra las primeras 10 dentro de un contenedor con scroll interno,
  sin crecer de tamaño respecto al bloque con menos entradas

#### Scenario: Scroll hasta el fondo dispara carga de más entradas
- **WHEN** el usuario desplaza el contenido de uno de estos bloques hasta el fondo del
  contenedor y existen más páginas de entradas
- **THEN** el sistema muestra un indicador de carga circular y agrega la siguiente
  página de entradas al final de la lista, sin recargar la página ni perder la posición
  de scroll ya alcanzada

#### Scenario: No hay más entradas para cargar
- **WHEN** el usuario llega al fondo del contenedor y ya se cargaron todas las entradas
  disponibles
- **THEN** el sistema no muestra el indicador de carga ni realiza más solicitudes

### Requirement: Retomar una lista propia desde Inicio

El sistema SHALL mostrar en Inicio, solo para usuarios con sesión activa que tengan al
menos una lista propia, un acceso directo a la lista propia con actividad más reciente,
con su título y un enlace a la vista de esa lista. El acceso SHALL NOT mostrarse si el
usuario no tiene ninguna lista.

#### Scenario: Usuario con al menos una lista
- **WHEN** un usuario autenticado que creó o editó al menos una lista abre `/[locale]`
- **THEN** ve un acceso directo a su lista con actividad más reciente, con enlace a esa
  lista

#### Scenario: Usuario sin listas
- **WHEN** un usuario autenticado no tiene ninguna lista
- **THEN** el acceso para retomar una lista no se muestra en la página

### Requirement: Actividad reciente de la comunidad

El sistema SHALL mostrar en Inicio, para cualquier visitante con o sin sesión, un bloque
con los ratings y comentarios públicos más recientes de usuarios con perfil público,
independientemente de si el visitante los sigue. El bloque SHALL excluir actividad de
autores con perfil privado. Si hay sesión activa, SHALL excluir además actividad de
autores con quienes exista un bloqueo en cualquier dirección. El bloque SHALL NOT incluir
escuchas, favoritos ni eventos de lista, y SHALL NOT paginar — muestra un número fijo de
entradas.

#### Scenario: Actividad de perfiles públicos visible para cualquiera
- **WHEN** existen ratings o comentarios recientes de usuarios con perfil público
- **THEN** el bloque de actividad de la comunidad los muestra tanto a un visitante sin
  sesión como a uno con sesión que no los sigue

#### Scenario: Perfil privado excluido
- **WHEN** un usuario con perfil privado publica un rating o comentario
- **THEN** esa entrada no aparece en el bloque de actividad de la comunidad de ningún
  visitante, siga o no a ese usuario

#### Scenario: Bloqueo excluye actividad para el usuario logueado
- **WHEN** un usuario autenticado tiene un bloqueo en cualquier dirección con el autor de
  un rating o comentario público reciente
- **THEN** esa entrada no aparece en su bloque de actividad de la comunidad

#### Scenario: Sin actividad reciente
- **WHEN** no hay ratings ni comentarios recientes de perfiles públicos
- **THEN** el bloque de actividad de la comunidad no se muestra en la página

### Requirement: Listas públicas recientes

El sistema SHALL mostrar en Inicio, para cualquier visitante con o sin sesión, un bloque
con las listas más recientes cuya audiencia sea pública, cuyo propietario tenga perfil
público y que tengan al menos un elemento, sin importar si el visitante sigue a ese
propietario. Si hay sesión activa, SHALL excluir listas de propietarios con quienes exista
un bloqueo en cualquier dirección. El bloque SHALL NOT paginar — muestra un número fijo de
listas — y SHALL descartar las listas vacías antes de aplicar ese número, de modo que no
ocupen lugar de listas con contenido.

#### Scenario: Lista pública de perfil público visible para cualquiera
- **WHEN** un usuario con perfil público crea o actualiza una lista con audiencia pública
  que tiene al menos un elemento
- **THEN** esa lista aparece en el bloque de listas públicas recientes tanto para un
  visitante sin sesión como para uno con sesión que no lo sigue

#### Scenario: Lista pública vacía excluida
- **WHEN** un usuario con perfil público crea una lista con audiencia pública y todavía
  no le agrega elementos
- **THEN** esa lista no aparece en el bloque de listas públicas recientes, y el bloque
  muestra en su lugar la siguiente lista pública con elementos si existe

#### Scenario: Lista de perfil privado excluida
- **WHEN** un usuario con perfil privado crea una lista con audiencia pública
- **THEN** esa lista no aparece en el bloque de listas públicas recientes de ningún
  visitante

#### Scenario: Lista no pública excluida
- **WHEN** un usuario con perfil público crea una lista con audiencia `private` o
  `followers`
- **THEN** esa lista no aparece en el bloque de listas públicas recientes

#### Scenario: Bloqueo excluye listas para el usuario logueado
- **WHEN** un usuario autenticado tiene un bloqueo en cualquier dirección con el
  propietario de una lista pública reciente
- **THEN** esa lista no aparece en su bloque de listas públicas recientes

#### Scenario: Sin listas públicas recientes
- **WHEN** no hay listas públicas recientes de perfiles públicos con al menos un elemento
- **THEN** el bloque de listas públicas recientes no se muestra en la página

### Requirement: Aviso persistente de email pendiente en Inicio autenticado

Inicio SHALL mostrar un aviso compacto y no bloqueante a las personas autenticadas cuyo `email_verified_at` sea nulo, con una acción para reenviar el enlace de verificación. El aviso SHALL presentarse como una línea dentro de la cabecera de Inicio, debajo del campo para registrar una escucha, no como una caja aparte entre bloques. El aviso SHALL desaparecer cuando el email esté verificado y SHALL NOT interferir con el saludo, los accesos rápidos, el onboarding social ni el contenido de Inicio.

#### Scenario: Usuario sin verificar abre Inicio

- **WHEN** una persona autenticada cuyo email no está verificado abre Inicio
- **THEN** ve el aviso de email pendiente como una línea dentro de la cabecera y puede usar el resto de la página y la acción de reenvío

#### Scenario: Usuario verificado abre Inicio

- **WHEN** una persona autenticada cuyo email está verificado abre Inicio
- **THEN** no ve el aviso de email pendiente

### Requirement: Comentarios populares por likes reales
"Comentarios populares" de Inicio SHALL agruparse por tipo de entidad (artistas, álbumes, canciones) y
ordenarse por el conteo real de likes (descendente), con desempate por longitud del texto y luego por
fecha. SHALL excluir comentarios ocultos por moderación, autores con perfil no público o cuenta
desactivada y, para un visitante autenticado, autores con bloqueo en cualquier dirección. La fila SHALL
mostrar la pill `♡ N` a la derecha del título solo si el conteo es de al menos 3; bajo el umbral no se
muestra cifra, pero el comentario puede aparecer por el desempate.

#### Scenario: Orden por likes
- **WHEN** hay dos comentarios de álbum, uno con 5 likes y otro más largo con 3
- **THEN** el de 5 likes aparece primero y ambos muestran su `♡ N`

#### Scenario: Bajo el umbral
- **WHEN** un comentario tiene 2 likes
- **THEN** su fila no muestra pill de likes

#### Scenario: Bloqueo
- **WHEN** el visitante bloqueó al autor de un comentario muy likeado
- **THEN** ese comentario no aparece para el visitante

### Requirement: Tema en los comentarios populares de artista
Cada comentario de artista de "Comentarios populares" SHALL mostrar su tema como etiqueta corta. Los
comentarios de álbum y de canción SHALL NOT mostrar tema. El tema SHALL NOT cambiar qué
comentarios se seleccionan ni su orden por likes.

#### Scenario: Comentario popular de artista
- **WHEN** "Comentarios populares" muestra un comentario de un artista del tema "Álbumes"
- **THEN** el comentario muestra la etiqueta "Álbumes"

#### Scenario: Comentario popular de álbum
- **WHEN** "Comentarios populares" muestra un comentario de un álbum
- **THEN** no muestra etiqueta de tema

### Requirement: Comentarios populares solo con comentarios raíz
"Comentarios populares" SHALL seleccionar y mostrar únicamente comentarios raíz. Una respuesta
SHALL NOT aparecer en esa sección aunque tenga más likes que otros comentarios.

#### Scenario: Respuesta muy likeada
- **WHEN** una respuesta acumula más likes que cualquier comentario raíz de su tipo
- **THEN** no aparece en "Comentarios populares"

#### Scenario: Raíz con respuestas
- **WHEN** un comentario raíz con respuestas está entre los más likeados
- **THEN** se muestra como hasta ahora, sin sus respuestas

### Requirement: Invitación de Tu año en discos
Del 1 de diciembre al 15 de enero, en la zona de la persona, Inicio y el diario SHALL mostrar a una persona con sesión una tarjeta de su año que cierra (el
en curso en diciembre, "hasta ahora"; el anterior en enero) que enlaza a su página del año, si tiene escuchas visibles ese año y no lo compartió. La tarjeta
SHALL poder descartarse para ese año, sin afectar al siguiente, y SHALL NOT aparecer a una persona sin sesión.

#### Scenario: Diciembre con escuchas
- **WHEN** Ana, con escuchas en 2026, abre Inicio el 3 de diciembre de 2026
- **THEN** ve "Tu 2026 en discos" con el enlace a su año

#### Scenario: Enero
- **WHEN** Ana abre el diario el 10 de enero de 2027
- **THEN** la tarjeta es de 2026

#### Scenario: Ya compartido o descartado
- **WHEN** Ana compartió su 2026 o descartó la tarjeta
- **THEN** no la ve más ese año

#### Scenario: Fuera de la ventana
- **WHEN** Ana abre Inicio el 20 de enero
- **THEN** no ve la tarjeta

### Requirement: Presentación del cuerpo de Inicio sin sesión

En la portada sin sesión, el sistema SHALL presentar las colecciones curadas como un
mosaico de hasta seis colecciones —una destacada de mayor tamaño y el resto en un tamaño
menor— con un enlace a todas las colecciones, y en pantallas angostas SHALL presentarlas
como un riel de desplazamiento horizontal en lugar de apilarlas a ancho completo. El
sistema SHALL presentar los álbumes mejor valorados como un riel horizontal que muestra
de cada álbum su carátula, su título, su artista principal y su promedio de estrellas. El
sistema SHALL presentar la actividad reciente de la comunidad como tarjetas que muestran
la carátula del objetivo, el autor, la valoración en la forma compacta que fija
`rating-display` para la actividad de la comunidad (`★ 86/100` si tiene puntaje
detallado, `★ 4,5` si no) y, cuando la entrada es un comentario o una reseña, un extracto
de su texto. La entrada de ejemplo del hero sin sesión SHALL mostrar la fila de estrellas
y el puntaje como `92/100` en un tono neutro, sin colorearlo según su valor.
Desde anchos de escritorio, la actividad SHALL ocupar la columna principal y los
comentarios populares y las listas públicas recientes SHALL ir en una columna lateral.
Estas presentaciones SHALL NOT aplicarse al Inicio con sesión ni a la página de
descubrimiento.

#### Scenario: Colecciones en mosaico en escritorio
- **WHEN** un visitante sin sesión abre `/[locale]` en una pantalla de 1440 px y hay
  ocho colecciones curadas
- **THEN** ve seis colecciones en un mosaico, una de ellas destacada, y un enlace a todas
  las colecciones

#### Scenario: Colecciones en riel en un teléfono
- **WHEN** un visitante sin sesión abre `/[locale]` en una pantalla de 390 px con
  colecciones curadas
- **THEN** las colecciones forman una sola fila que se desplaza en horizontal y no se
  apilan una debajo de otra

#### Scenario: Mejor valorados con artista y promedio
- **WHEN** un visitante sin sesión abre `/[locale]` y hay álbumes con suficientes
  valoraciones
- **THEN** cada álbum del riel muestra su artista principal y su promedio de estrellas

#### Scenario: Comentario de la comunidad como tarjeta
- **WHEN** la actividad reciente de la comunidad incluye un comentario público sobre un
  álbum
- **THEN** la portada sin sesión lo muestra como una tarjeta con la carátula del álbum,
  el autor y un extracto del comentario

#### Scenario: Valoración con puntaje en una tarjeta de la comunidad
- **WHEN** la actividad reciente de la comunidad incluye una valoración de 4,5 estrellas
  con puntaje 86
- **THEN** su tarjeta muestra `★ 86/100`, sin `4,5`

#### Scenario: Puntaje neutro en la entrada de ejemplo
- **WHEN** un visitante sin sesión ve la entrada de ejemplo del hero
- **THEN** ve la fila de estrellas y `92/100` con el mismo tono que cualquier otro
  puntaje

#### Scenario: El Inicio con sesión conserva su presentación
- **WHEN** un usuario autenticado abre `/[locale]`
- **THEN** la actividad de la comunidad y las listas públicas conservan su presentación
  en filas compactas y no aparece el mosaico de colecciones

### Requirement: Acceso a personas en Inicio sin sesión

La portada sin sesión SHALL ofrecer un acceso a la búsqueda de usuarios (`/users`) dentro
del bloque de la comunidad, y ese acceso SHALL mostrarse aunque no haya actividad reciente
de la comunidad.

#### Scenario: Acceso a personas con actividad
- **WHEN** un visitante sin sesión abre `/[locale]` y hay actividad reciente de la
  comunidad
- **THEN** ve en el bloque de la comunidad un acceso «Conoce a quienes escuchan» que abre
  `/users`

#### Scenario: Acceso a personas sin actividad
- **WHEN** un visitante sin sesión abre `/[locale]` y no hay actividad reciente de la
  comunidad, comentarios populares ni listas públicas
- **THEN** sigue viendo el acceso «Conoce a quienes escuchan» que abre `/users`

### Requirement: Bloque de funcionalidades de la portada sin sesión

La portada sin sesión SHALL presentar las funcionalidades del producto en un bloque que
muestra todas a la vez, sin carrusel ni controles de desplazamiento: tres demostraciones
—registrar una escucha en el diario con su contexto, valorar con estrellas y un puntaje
detallado de 1 a 100, y catalogar una copia de la colección física con sus atributos— y
el resto de las funcionalidades en una lista con su título y una línea de descripción. Las
demostraciones SHALL ser ilustraciones fijas que no muestran datos ni nombres de usuarios
reales, SHALL usar los mismos nombres de contexto de escucha y de atributos de la colección
que la aplicación, y SHALL NOT ser controles interactivos. La nota de la demostración
SHALL seguir la forma de `rating-display` (fila de estrellas y `92/100` en tono neutro).

#### Scenario: Todas las funcionalidades a la vista
- **WHEN** un visitante sin sesión llega al bloque de funcionalidades en una pantalla de
  1440 px
- **THEN** ve las tres demostraciones y las demás funcionalidades sin tener que desplazar
  ni pulsar flechas

#### Scenario: Demostraciones ilustrativas
- **WHEN** un visitante sin sesión ve la demostración de la colección física
- **THEN** los atributos que muestra usan los nombres que la aplicación da a esos atributos
  y la demostración no ofrece controles

### Requirement: Cierre de la portada sin sesión

La portada sin sesión SHALL terminar con un cierre que repite la invitación a crear una
cuenta con un enlace directo a `/auth/register` y, cuando la superficie de descubrimiento
está habilitada, un enlace secundario a `/explore`.

#### Scenario: Cierre con descubrimiento habilitado
- **WHEN** un visitante sin sesión llega al final de `/[locale]` con el descubrimiento
  habilitado
- **THEN** ve «Crear cuenta», que abre `/auth/register` sin diálogo, y un enlace a `/explore`

#### Scenario: Cierre con descubrimiento deshabilitado
- **WHEN** un visitante sin sesión llega al final de `/[locale]` con el descubrimiento
  deshabilitado
- **THEN** ve «Crear cuenta» y no ve un enlace a `/explore`

### Requirement: Registrar una escucha desde Inicio

La cabecera de Inicio con sesión SHALL incluir un campo para registrar una escucha, rotulado,
con un selector de tipo Álbum | Canción (álbum por defecto). Desde dos letras, el campo SHALL
sugerir objetivos con la misma búsqueda en dos fases del diálogo de acciones rápidas (ver
`header-quick-actions`, Requirement: Buscador de objetivos compartido), en una lista bajo el
campo navegable con el teclado (flechas, `Enter` elige la opción activa, `Escape` cierra la
lista), con los estados cargando, sin resultados y error. Elegir una sugerencia SHALL abrir el
diálogo de acciones rápidas en Escucha con ese objetivo ya elegido, que registra la escucha como
al elegirla dentro del diálogo. Al cerrar el diálogo, el foco SHALL volver al campo y el campo
SHALL quedar vacío. `Enter` sin una sugerencia activa SHALL NOT navegar ni registrar nada.

#### Scenario: Elegir una sugerencia registra la escucha
- **WHEN** una persona con sesión escribe "too fast" en el campo de Inicio y elige el álbum
  «Too Fast for Love» de las sugerencias
- **THEN** se abre el diálogo de acciones rápidas en Escucha con ese álbum, se crea una escucha
  con audiencia `private` y se ofrece ampliarla, como desde «+ Añadir»

#### Scenario: Buscar canciones
- **WHEN** una persona cambia el selector a Canción y escribe dos letras o más
- **THEN** las sugerencias son canciones y elegir una registra la escucha de esa canción

#### Scenario: Enter sin elegir
- **WHEN** una persona escribe en el campo y pulsa `Enter` sin una sugerencia activa
- **THEN** no se navega a `/search` ni se registra ninguna escucha

#### Scenario: Cerrar el diálogo
- **WHEN** una persona registra una escucha desde el campo y cierra el diálogo
- **THEN** el foco vuelve al campo, el campo queda vacío y la página refleja la escucha nueva

#### Scenario: Primer viewport en móvil
- **WHEN** una persona con sesión abre Inicio a 390 px de ancho
- **THEN** el campo para registrar una escucha es visible sin desplazar la página

### Requirement: Última vez en la cabecera de Inicio

Para una persona con al menos una escucha, valoración, comentario o reseña, la cabecera de
Inicio SHALL mostrar una tarjeta «Última vez» con la entrada más reciente de esos tipos: la
carátula, el título, el artista cuando aplica, la fecha relativa y, si la persona valoró ese
objetivo, su valoración en forma de fila (estrellas y, si existe, el puntaje de 1 a 100) según
`rating-display`. La tarjeta SHALL ofrecer dos acciones: «Lo volví a escuchar», que abre el
diálogo de acciones rápidas en Escucha con ese objetivo ya elegido y una confirmación antes de
registrar, y un enlace a la entidad rotulado según su tipo. La tarjeta SHALL NOT registrar nada
sin esa confirmación.

#### Scenario: Última escucha valorada
- **WHEN** la entrada más reciente de una persona es una escucha de un álbum que valoró con 4
  estrellas y 77/100
- **THEN** la tarjeta muestra la carátula, el título, el artista, la fecha relativa y la fila de
  4 estrellas con 77/100

#### Scenario: Última escucha sin valoración
- **WHEN** la persona no valoró el objetivo de su entrada más reciente
- **THEN** la tarjeta no muestra estrellas ni puntaje

#### Scenario: Volver a escuchar pide confirmación
- **WHEN** una persona activa «Lo volví a escuchar»
- **THEN** se abre el diálogo con el objetivo ya elegido y el foco en «Registrar escucha», y no se
  crea ninguna escucha hasta que la persona confirma

#### Scenario: Cancelar la confirmación
- **WHEN** una persona abre «Lo volví a escuchar» y cierra el diálogo sin confirmar
- **THEN** no se crea ninguna escucha y el foco vuelve a «Lo volví a escuchar»

### Requirement: Cabecera de Inicio para una cuenta sin actividad

Para una persona con sesión sin escuchas, valoraciones, comentarios ni reseñas, la cabecera de
Inicio SHALL mostrar una bienvenida como antetítulo, el mismo titular y el mismo campo para
registrar una escucha, una línea que explique que el Inicio se llena con lo que la persona anota
y con la gente que sigue, y enlaces en prosa a buscar gente para seguir y, solo si su onboarding
está pendiente, a completar su perfil musical. En lugar de la tarjeta «Última vez», SHALL mostrar
una composición decorativa de carátulas, oculta para tecnologías de asistencia. La página SHALL
NOT mostrar además un enlace suelto al onboarding fuera de la cabecera, ni repetir en otro bloque
la invitación a registrar la primera escucha. La cabecera SHALL NOT mostrar pasos numerados con
marcas de completado ni conteos.

#### Scenario: Cuenta recién creada
- **WHEN** una persona que acaba de registrarse, sin actividad y con el onboarding pendiente,
  abre Inicio
- **THEN** ve la bienvenida, el titular «¿Qué escuchaste hoy?», el campo, la línea explicativa y
  los enlaces a buscar gente y a completar su perfil musical, y no ve la tarjeta «Última vez»

#### Scenario: Onboarding ya hecho
- **WHEN** una persona sin actividad que ya completó o descartó el onboarding abre Inicio
- **THEN** la cabecera no muestra el enlace a completar el perfil musical

#### Scenario: Primera escucha registrada
- **WHEN** una persona sin actividad registra su primera escucha desde el campo y vuelve a cargar
  Inicio
- **THEN** la cabecera muestra el saludo y la tarjeta «Última vez» en lugar de la bienvenida

