## MODIFIED Requirements

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

## ADDED Requirements

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
