# profile-connections Specification

## Purpose
Define las vistas de conexiones de un perfil (`/users/{username}/connections/{following|followers|mutual}`): quién
puede verlas (la misma regla de acceso que el resto del perfil), su cabecera con cifras, la paginación completa y la
gestión de la propia red desde cada fila (dejar de seguir, cancelar una solicitud, eliminar un seguidor) con
confirmación y Deshacer, sin efectos en el servidor hasta que vence el aviso.
## Requirements
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
acción visible según la relación del visitante con ella: seguir (o solicitarlo) si no la sigue, "Seguir de vuelta" si
ella sigue al visitante y él no a ella, aprobar o rechazar si le pidió seguirlo; si la solicitud está enviada o hay
bloqueo, un estado en texto. La fila SHALL llevar una insignia con la relación entre la persona y el visitante: "Mutuo"
si se siguen los dos, "Lo sigues" si solo el visitante la sigue, "Te sigue" si solo ella sigue al visitante y "Tú" si
es el propio visitante; la insignia SHALL NOT repetir lo que la vista ya dice (en los Seguidores propios no hay "Te
sigue"; en los Seguidos propios no hay "Lo sigues"). Sin sesión, la fila SHALL NOT mostrar acciones ni insignias.
Dejar de seguir y cancelar una solicitud SHALL estar en un menú de acciones de la fila, nombrado con la persona; en los
Seguidores propios ese menú SHALL ofrecer también eliminar al seguidor.

#### Scenario: Fila de alguien que ya sigue

- **WHEN** el visitante ve en la lista de otra persona a alguien que él sigue y que también lo sigue
- **THEN** la fila lleva la insignia "Mutuo" y "Dejar de seguir" está en el menú "Acciones para «persona»", no como
  botón

#### Scenario: Visitante sin sesión

- **WHEN** alguien sin sesión abre los seguidores de un perfil público
- **THEN** ve las filas sin botones de seguir ni insignias

#### Scenario: Seguir de vuelta

- **WHEN** el dueño ve en sus Seguidores a alguien que no sigue
- **THEN** la fila ofrece "Seguir de vuelta" como acción principal y no lleva la insignia "Te sigue"

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

### Requirement: Búsqueda, orden y segmentos de las conexiones

Las vistas Seguidos y Seguidores SHALL permitir buscar por nombre o @usuario, sin distinguir acentos ni mayúsculas, y
ordenar por Recientes (cuándo empezó el seguimiento) o por Nombre (el nombre que se muestra). El orden por defecto
SHALL ser Recientes, salvo en los Seguidos de un perfil ajeno, que SHALL ir por Nombre. Búsqueda y orden SHALL operar
sobre todas las personas, no solo sobre las cargadas, y SHALL reflejarse en la URL.

Cuando el visitante es el dueño, la vista SHALL ofrecer los segmentos Todos, Mutuos y "No sigues de vuelta" (en
Seguidores) o "No te siguen" (en Seguidos), cada uno con su cifra.

#### Scenario: Buscar entre muchos seguidores

- **WHEN** el dueño tiene 200 seguidores, ha cargado 50 y busca "jose"
- **THEN** ve a todas las personas cuyo nombre o @usuario contiene "josé" o "jose", aunque no estuvieran cargadas

#### Scenario: Orden por defecto

- **WHEN** un visitante abre los Seguidos de un perfil ajeno sin parámetros
- **THEN** la lista va por nombre; en los Seguidores del mismo perfil va por los más recientes

#### Scenario: No sigues de vuelta

- **WHEN** el dueño elige el segmento "No sigues de vuelta" en sus Seguidores
- **THEN** ve solo a las personas que lo siguen y a las que él no sigue, cada una con "Seguir de vuelta"

### Requirement: Aviso de solicitudes pendientes

Los Seguidores propios SHALL avisar cuando el dueño tiene solicitudes de seguimiento pendientes, con cuántas son y un
enlace para revisarlas.

#### Scenario: Cuenta privada con solicitudes

- **WHEN** el dueño de una cuenta privada con 2 solicitudes pendientes abre sus Seguidores
- **THEN** ve "Tienes 2 solicitudes de seguimiento pendientes" con un enlace a revisarlas

### Requirement: Contexto de cada conexión

Cada fila de Seguidos y Seguidores SHALL decir desde cuándo existe la relación listada, en mes y año: "Te sigue desde"
en los Seguidores propios, "La sigues desde" en los Seguidos propios y "Desde" en los de otro perfil.

Con sesión, la fila SHALL indicar cuántos discos tiene en común la persona con el visitante (álbumes que ambos tienen
en favoritos o valoraron con 4 estrellas o más) cuando son al menos 3. Solo SHALL contar lo que esa persona deja ver al
visitante: sus favoritos según su audiencia y su perfil, y sus valoraciones solo si el visitante la sigue. La cifra
SHALL NOT mostrarse para el propio visitante, sin sesión ni con bloqueo.

#### Scenario: Desde cuándo te sigue

- **WHEN** el dueño abre sus Seguidores y Leo lo sigue desde octubre de 2026
- **THEN** la fila de Leo dice "Te sigue desde oct 2026"

#### Scenario: Discos en común con umbral

- **WHEN** el visitante y Mia tienen 8 álbumes en común entre favoritos y valoraciones de 4★ o más, y con Noa solo 2
- **THEN** la fila de Mia dice "8 discos en común" y la de Noa no dice nada de discos

#### Scenario: Lo que la otra persona no deja ver

- **WHEN** Mia tiene un perfil privado que el visitante no sigue
- **THEN** sus favoritos y valoraciones no cuentan para la cifra de discos en común

### Requirement: Panel lateral de conexiones

En una pantalla ancha, la vista SHALL mostrar al costado, cuando tiene contenido: en los Seguidores propios, "Para
seguir de vuelta" con hasta 5 personas que siguen al dueño y a las que él no sigue, con el botón para seguirlas y un
enlace a verlas todas; en un perfil ajeno, con sesión, "En común con <nombre>" con cuántos seguidores tienen en común y
un enlace a la pestaña "Seguidos en común". Sin contenido, la vista SHALL NOT mostrar el panel ni ensancharse.

#### Scenario: Para seguir de vuelta

- **WHEN** el dueño, en una pantalla ancha, abre sus Seguidores y 7 personas lo siguen sin que él las siga
- **THEN** ve al costado "Para seguir de vuelta" con 5 de ellas y un enlace a ver las 7

#### Scenario: Sin contenido

- **WHEN** el dueño sigue de vuelta a todos sus seguidores
- **THEN** la vista no muestra panel lateral y conserva su ancho

