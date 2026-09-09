## MODIFIED Requirements

### Requirement: Contenido de Inicio diferenciado por sesión

El sistema SHALL componer el contenido de `/[locale]` según haya una sesión activa o no.

Sin sesión, la página SHALL mostrar la propuesta de valor (tagline), el hero visual con
llamada a la acción para registrarse o iniciar sesión, y el carrusel de funcionalidades,
y SHALL NOT mostrar accesos rápidos de usuario, saludo, ni ningún bloque de contenido
propio (feed de seguidos, rastro reciente, retomar lista). La propuesta de valor del hero
SHALL encuadrar el álbum como una obra —valorarla, reseñarla, volver a ella— y el
descubrimiento como algo que pasa por personas, no por un algoritmo. Debajo del hero, la
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
