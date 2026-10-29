## ADDED Requirements

### Requirement: Vistas de conexiones de un perfil

Las vistas Seguidos y Seguidores de un perfil (`/users/{username}/connections/{following|followers}`) SHALL seguir la
misma regla de acceso que el resto del perfil: visibles si el perfil es público o el visitante es su dueño o un
seguidor aprobado. Cada vista SHALL mostrar migas hacia el perfil, el avatar y el nombre del perfil, un título con la
pestaña activa y, con acceso, la cifra de personas de cada pestaña (solo cuentas activas y relaciones aceptadas). La
pestaña del navegador SHALL nombrar la vista y el perfil.

La vista SHALL mostrar a todas las personas: las primeras 50 al cargar y las siguientes con "Mostrar más", que indica
cuántas faltan. Las páginas siguientes SHALL pedirse por cursor, de modo que quitar a alguien no haga saltar a nadie.

Sin acceso a un perfil privado, la vista SHALL decirlo y, con sesión y sin bloqueo, ofrecer pedir seguir.

#### Scenario: Cabecera y cifras

- **WHEN** un visitante abre los seguidores de Ana, que tiene 12 seguidores y sigue a 3 cuentas
- **THEN** ve las migas hacia el perfil de Ana, su avatar, el título "Seguidores" y las pestañas "Seguidos 3" y
  "Seguidores 12", y la pestaña del navegador dice "Seguidores · Ana"

#### Scenario: Más de 50 personas

- **WHEN** Ana tiene 80 seguidores
- **THEN** la vista muestra 50 y "Mostrar 30 más", que trae las 30 restantes sin repetir ni saltar a nadie

#### Scenario: Perfil privado sin acceso

- **WHEN** un usuario con sesión que no sigue a una cuenta privada abre sus seguidores
- **THEN** ve que el perfil es privado y el botón para solicitar seguirlo, sin cifras ni listado

### Requirement: Fila de una conexión

Cada persona listada SHALL ocupar una fila con su avatar, nombre y @usuario, enlazada a su perfil, y a lo sumo una
acción visible según la relación del visitante con ella: seguir (o solicitarlo) si no la sigue, aprobar o rechazar si
le pidió seguirlo; si ya la sigue, si la solicitud está enviada, si es el propio visitante o si hay bloqueo, un estado
en texto. Sin sesión, la fila SHALL NOT mostrar acciones. Dejar de seguir y cancelar una solicitud SHALL estar en un
menú de acciones de la fila, nombrado con la persona; en los Seguidores propios ese menú SHALL ofrecer también
eliminar al seguidor.

#### Scenario: Fila de alguien que ya sigue

- **WHEN** el visitante ve en una lista a una persona que ya sigue
- **THEN** la fila dice "Siguiendo" y "Dejar de seguir" está en el menú "Acciones para «persona»", no como botón

#### Scenario: Visitante sin sesión

- **WHEN** alguien sin sesión abre los seguidores de un perfil público
- **THEN** ve las filas sin botones de seguir

### Requirement: Quitar con confirmación y Deshacer

Eliminar un seguidor SHALL pedir confirmación. Al eliminar un seguidor o dejar de seguir desde una vista de conexiones,
la fila SHALL desaparecer y un aviso SHALL ofrecer Deshacer durante unos segundos. Deshacer SHALL devolver la fila a su
lugar sin que la relación haya cambiado en ningún momento: la operación se envía al expirar el aviso, al hacer otra
acción igual o al salir de la vista. Si la operación falla, la fila SHALL volver y el aviso SHALL decirlo.

#### Scenario: Eliminar un seguidor y deshacer

- **WHEN** el dueño elige "Eliminar seguidor…" en una fila de sus Seguidores, confirma y luego pulsa Deshacer
- **THEN** la fila vuelve a su lugar, la persona sigue siendo su seguidora con la fecha original y no recibe ninguna
  notificación nueva

#### Scenario: Dejar de seguir sin deshacer

- **WHEN** el usuario elige "Dejar de seguir" en una fila y deja que el aviso expire
- **THEN** deja de seguir a esa persona y la fila no vuelve al recargar
