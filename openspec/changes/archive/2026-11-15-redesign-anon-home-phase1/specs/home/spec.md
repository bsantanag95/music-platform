## MODIFIED Requirements

### Requirement: Contenido de Inicio diferenciado por sesión

El sistema SHALL componer el contenido de `/[locale]` según haya una sesión activa o no.

Sin sesión, la página SHALL mostrar la propuesta de valor (tagline), el hero visual con
llamada a la acción para registrarse o iniciar sesión, y el carrusel de funcionalidades,
y SHALL NOT mostrar accesos rápidos de usuario, saludo, ni ningún bloque de contenido
propio (feed de seguidos, rastro reciente, retomar lista). La propuesta de valor del hero
SHALL encuadrar el álbum como una obra —valorarla, reseñarla, volver a ella— y el
descubrimiento como algo que pasa por personas, no por un algoritmo. El hero sin sesión
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

Con sesión activa, la página SHALL mostrar, en este orden: un saludo breve al usuario;
los accesos rápidos a diario, favoritos, listas, colección, buscador y usuarios; un
preview del feed de seguidos como bloque principal o, si el usuario no sigue a nadie, un
bloque de onboarding en su lugar; un bloque con la actividad reciente del propio usuario
si existe; y un acceso para retomar su lista editada más recientemente si tiene al menos
una lista. La página con sesión SHALL NOT mostrar la tagline de propuesta de valor, el
hero visual del visitante anónimo, el carrusel de funcionalidades, ninguna llamada a la
acción de registro o inicio de sesión, ni el buscador del hero (esa entrada queda
cubierta por la búsqueda persistente del Header y por el acceso rápido "buscar"). El
bloque editorial de álbumes descrito para la vista sin sesión NO SHALL mostrarse en la
vista con sesión.

El saludo y los bloques de contenido propio SHALL NOT incluir conteos de progreso,
elementos pendientes de valorar, rachas ni medallas de completitud.

#### Scenario: Visitante sin sesión
- **WHEN** un visitante sin sesión abre `/[locale]`
- **THEN** ve tagline, hero visual con llamada a la acción de registro/login y el
  carrusel de funcionalidades, y no ve saludo, accesos rápidos de usuario, preview de
  feed, rastro reciente ni el acceso para retomar una lista

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
- **THEN** ve un saludo breve, los accesos rápidos, y un preview del feed de seguidos con
  link a `/me/feed` como bloque principal, y no ve la tagline de propuesta de valor, el
  hero anónimo, el carrusel de funcionalidades, el buscador del hero ni el bloque editorial
  de álbumes del landing anónimo

#### Scenario: Usuario con sesión sin seguidos
- **WHEN** un usuario autenticado que no sigue a nadie abre `/[locale]`
- **THEN** en el lugar del preview de feed ve un bloque de onboarding que lo invita a
  buscar gente, explorar listas públicas y registrar su primera escucha, no un feed
  vacío, y no ve el buscador del hero

#### Scenario: Usuario con sesión sin actividad propia ni listas
- **WHEN** un usuario autenticado que nunca registró escuchas, valoraciones ni
  comentarios y no tiene listas abre `/[locale]`
- **THEN** no ve el bloque de rastro reciente ni el acceso para retomar una lista, y el
  resto de la página (onboarding, accesos rápidos, bloques de descubrimiento) se
  compone sin espacios vacíos

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
