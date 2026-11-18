## ADDED Requirements

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

### Requirement: Aviso persistente de email pendiente en Inicio autenticado

Inicio SHALL mostrar un aviso compacto y no bloqueante a las personas autenticadas cuyo `email_verified_at` sea nulo, con una acción para reenviar el enlace de verificación. El aviso SHALL presentarse como una línea dentro de la cabecera de Inicio, debajo del campo para registrar una escucha, no como una caja aparte entre bloques. El aviso SHALL desaparecer cuando el email esté verificado y SHALL NOT interferir con el saludo, los accesos rápidos, el onboarding social ni el contenido de Inicio.

#### Scenario: Usuario sin verificar abre Inicio

- **WHEN** una persona autenticada cuyo email no está verificado abre Inicio
- **THEN** ve el aviso de email pendiente como una línea dentro de la cabecera y puede usar el resto de la página y la acción de reenvío

#### Scenario: Usuario verificado abre Inicio

- **WHEN** una persona autenticada cuyo email está verificado abre Inicio
- **THEN** no ve el aviso de email pendiente
