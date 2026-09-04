# Home Page

## Purpose

Página de Inicio de la aplicación, diferenciada según haya sesión activa o no.
Muestra actividad reciente de la comunidad, listas públicas, y contenido personalizado
para usuarios autenticados.

## Requirements

### Requirement: Contenido de Inicio diferenciado por sesión

El sistema SHALL componer el contenido de `/[locale]` según haya una sesión activa o no.

Sin sesión, la página SHALL mostrar la propuesta de valor (tagline), el hero visual con
llamada a la acción para registrarse o iniciar sesión, y el carrusel de funcionalidades,
y SHALL NOT mostrar accesos rápidos de usuario, saludo, ni ningún bloque de contenido
propio (feed de seguidos, rastro reciente, retomar lista).

Con sesión activa, la página SHALL mostrar, en este orden: un saludo breve al usuario;
un preview del feed de seguidos como bloque principal o, si el usuario no sigue a nadie,
un bloque de onboarding en su lugar; un bloque con la actividad reciente del propio
usuario si existe; un acceso para retomar su lista editada más recientemente si tiene al
menos una lista; y accesos rápidos a diario, favoritos, listas, colección y buscador. La
página con sesión SHALL NOT mostrar la tagline de propuesta de valor, el hero visual del
visitante anónimo, el carrusel de funcionalidades, ninguna llamada a la acción de
registro o inicio de sesión, ni el buscador del hero (esa entrada queda cubierta por la
búsqueda persistente del Header y por el acceso rápido "buscar").

El saludo y los bloques de contenido propio SHALL NOT incluir conteos de progreso,
elementos pendientes de valorar, rachas ni medallas de completitud.

#### Scenario: Visitante sin sesión
- **WHEN** un visitante sin sesión abre `/[locale]`
- **THEN** ve tagline, hero visual con llamada a la acción de registro/login y el
  carrusel de funcionalidades, y no ve saludo, accesos rápidos de usuario, preview de
  feed, rastro reciente ni el acceso para retomar una lista

#### Scenario: Usuario con sesión y al menos un seguido
- **WHEN** un usuario autenticado que sigue a al menos otra persona con relación aceptada
  abre `/[locale]`
- **THEN** ve un saludo breve, un preview del feed de seguidos con link a `/me/feed`
  como bloque principal, y los accesos rápidos, y no ve la tagline de propuesta de
  valor, el hero anónimo, el carrusel de funcionalidades ni el buscador del hero

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

### Requirement: Rastro reciente del propio usuario en Inicio

El sistema SHALL mostrar en Inicio, solo para usuarios con sesión activa, un bloque con
las escuchas, valoraciones y comentarios más recientes registrados por el propio usuario,
ordenados por fecha descendente. El bloque SHALL NOT paginar — muestra un número fijo de
entradas — y SHALL NOT aplicar filtros de audiencia, porque es contenido del propio usuario.
El bloque SHALL NOT mostrarse si el usuario no tiene ninguna entrada de esos tipos.

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
con las listas más recientes cuya audiencia sea pública y cuyo propietario tenga perfil
público, sin importar si el visitante sigue a ese propietario. Si hay sesión activa, SHALL
excluir listas de propietarios con quienes exista un bloqueo en cualquier dirección. El
bloque SHALL NOT paginar — muestra un número fijo de listas.

#### Scenario: Lista pública de perfil público visible para cualquiera
- **WHEN** un usuario con perfil público crea o actualiza una lista con audiencia pública
- **THEN** esa lista aparece en el bloque de listas públicas recientes tanto para un
  visitante sin sesión como para uno con sesión que no lo sigue

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
- **WHEN** no hay listas públicas recientes de perfiles públicos
- **THEN** el bloque de listas públicas recientes no se muestra en la página
