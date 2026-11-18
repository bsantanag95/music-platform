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
(ver Requirement: Actividad de quienes sigues en Inicio); un acceso para retomar su lista
con elementos editada más recientemente, si tiene una; para una cuenta sin escuchas,
valoraciones, comentarios ni reseñas, los álbumes mejor valorados por la comunidad; los
lanzamientos; las colecciones curadas de la superficie de descubrimiento, solo cuando esa
superficie está habilitada; y la comunidad (actividad, comentarios populares, listas públicas y
acceso a personas). Ningún bloque de Inicio SHALL
desplazar su contenido dentro de un contenedor de altura fija. La página con sesión SHALL NOT mostrar la tagline de propuesta de valor, el
hero visual del visitante anónimo, el bloque de funcionalidades, ninguna llamada a la
acción de registro o inicio de sesión, ni el buscador del hero (esa entrada queda
cubierta por la búsqueda persistente del Header). El campo para registrar una escucha
SHALL NOT funcionar como buscador del catálogo: no navega a `/search` ni a la entidad
elegida. Con sesión, los álbumes mejor valorados SHALL NOT mostrarse a una cuenta que ya tiene
escuchas, valoraciones, comentarios o reseñas.

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
  hero anónimo, el bloque de funcionalidades, el buscador del hero ni, si ya tiene
  actividad, los álbumes mejor valorados

#### Scenario: Usuario con sesión sin seguidos
- **WHEN** un usuario autenticado que no sigue a nadie abre `/[locale]`
- **THEN** en el lugar de la actividad de quienes sigue ve la actividad reciente de la
  comunidad en tarjetas con una invitación a buscar gente para seguir, no un feed vacío,
  y no ve el buscador del hero

#### Scenario: Cuenta sin actividad ve el catálogo curado
- **WHEN** una persona con sesión sin escuchas, valoraciones, comentarios ni reseñas abre
  `/[locale]` con la superficie de descubrimiento habilitada
- **THEN** ve los álbumes mejor valorados por la comunidad y las colecciones curadas, como un
  visitante sin sesión

#### Scenario: Usuario con sesión sin actividad propia ni listas
- **WHEN** un usuario autenticado que nunca registró escuchas, valoraciones ni
  comentarios y no tiene listas abre `/[locale]`
- **THEN** no ve el estante «Lo último que escuchaste» ni el acceso para retomar una lista, ve la
  cabecera en su variante de bienvenida, y el resto de la página (onboarding, accesos
  rápidos, bloques de descubrimiento) se compone sin espacios vacíos

### Requirement: Retomar una lista propia desde Inicio

El sistema SHALL mostrar en Inicio, solo para usuarios con sesión activa que tengan al
menos una lista propia con un elemento o más, un acceso directo a la lista propia con
elementos y actividad más reciente, con su título, su tipo, su cantidad de elementos y un
enlace a la vista de esa lista. Una lista sin elementos SHALL NOT proponerse, aunque sea la
editada más recientemente. El acceso SHALL NOT mostrarse si el usuario no tiene ninguna
lista con elementos.

#### Scenario: Usuario con al menos una lista
- **WHEN** un usuario autenticado que creó o editó al menos una lista abre `/[locale]`
- **THEN** ve un acceso directo a su lista con actividad más reciente, con enlace a esa
  lista

#### Scenario: La lista más reciente está vacía
- **WHEN** un usuario creó ayer una lista vacía y la semana pasada agregó un disco a otra lista
- **THEN** el acceso propone la lista con el disco, no la vacía

#### Scenario: Usuario sin listas
- **WHEN** un usuario autenticado no tiene ninguna lista, o solo listas vacías
- **THEN** el acceso para retomar una lista no se muestra en la página

### Requirement: Actividad reciente de la comunidad

El sistema SHALL mostrar en Inicio, para cualquier visitante con o sin sesión, un bloque
con los ratings y comentarios públicos más recientes de usuarios con perfil público,
independientemente de si el visitante los sigue. El bloque SHALL excluir actividad de
autores con perfil privado. Si hay sesión activa, SHALL excluir además actividad de
autores con quienes exista un bloqueo en cualquier dirección y SHALL excluir la actividad
de la propia persona, que Inicio ya muestra en sus bloques propios. El bloque SHALL NOT incluir
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

#### Scenario: Lo propio no aparece como comunidad
- **WHEN** una persona con sesión y perfil público valoró un álbum hace un momento
- **THEN** esa valoración no aparece en la actividad de la comunidad de su propio Inicio, y sí
  en la de otras personas

#### Scenario: Sin actividad reciente
- **WHEN** no hay ratings ni comentarios recientes de perfiles públicos
- **THEN** el bloque de actividad de la comunidad no se muestra en la página
