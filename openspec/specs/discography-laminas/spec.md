# discography-laminas Specification

## Purpose
Mostrar lo que una persona valoró de la discografía principal de un artista como una Lámina derivada: página, curva de la carrera y progreso discreto. La ven el dueño y sus seguidores; una marca reversible por artista la abre a quien pueda ver el perfil (`docs/05-features/sharing.md` §4.1, ADR 0053).
## Requirements
### Requirement: Página de discografía de una persona
`/users/<u>/artist/<id>` SHALL mostrar los discos de la sección principal del artista, más las secciones que su dueño eligió, que la persona valoró, en orden cronológico, con su nota y una curva de la
carrera. La nota SHALL ser la detallada si existe y, si no, las estrellas, mostradas como estrellas: el sistema SHALL NOT mostrar un número inventado. La página
SHALL existir desde 3 discos valorados, o desde el umbral de la vista Por canción, y SHALL reflejar siempre las notas vigentes. Para el dueño SHALL existir
siempre, también sin valoraciones, y SHALL decirle cuántos discos le faltan si no llega a ninguna de las dos.

#### Scenario: Con cinco discos valorados
- **WHEN** una seguidora abre la página de una persona con 5 discos valorados de un artista
- **THEN** ve esos 5 discos por año, con su nota, y la curva

#### Scenario: Solo estrellas
- **WHEN** un disco tiene 4 estrellas y ningún puntaje detallado
- **THEN** la página muestra las estrellas y no un número

#### Scenario: Pocos discos
- **WHEN** una seguidora abre la página de una persona con 2 discos valorados
- **THEN** la respuesta es `404`

#### Scenario: Pocos discos, el dueño
- **WHEN** el dueño abre su página con 2 discos valorados
- **THEN** ve que le falta 1

#### Scenario: Nota nueva
- **WHEN** el dueño valora otro disco del artista
- **THEN** la página lo incluye sin ningún otro gesto

#### Scenario: Secciones elegidas
- **WHEN** el dueño suma En vivo y valoró 2 discos en vivo
- **THEN** la vista Por disco los incluye en su lugar cronológico

#### Scenario: Dueño sin valoraciones
- **WHEN** una persona abre su discografía de un artista del que no valoró nada
- **THEN** la página existe para ella y le ofrece valorar lo que falta

### Requirement: Quién ve una discografía
Una discografía SHALL verse como cualquier valoración: su dueño y sus seguidores aceptados. Otro visitante SHALL verla solo si el dueño la hizo pública y ese
visitante puede ver su perfil. La página SHALL responder `404` en cualquier otro caso, sin revelar el motivo. La marca SHALL abrir solo esta página y su imagen:
SHALL NOT volver públicas esas valoraciones en otro lugar.

#### Scenario: Anónimo sin marca
- **WHEN** un visitante sin sesión abre una discografía sin marca
- **THEN** la respuesta es `404`

#### Scenario: Anónimo con marca
- **WHEN** un visitante sin sesión abre una discografía con marca, de un perfil público
- **THEN** la ve

#### Scenario: Perfil privado con marca
- **WHEN** quien no sigue a un perfil privado abre una discografía con marca
- **THEN** la respuesta es `404`

#### Scenario: Bloqueo
- **WHEN** una persona bloqueada abre una discografía con marca
- **THEN** la respuesta es `404`

#### Scenario: La marca no abre otras páginas
- **WHEN** un anónimo abre la página de relación de un disco de esa discografía, sin marca propia
- **THEN** no ve la nota

### Requirement: Marca de discografía compartida
La marca SHALL guardarse por persona y artista, SHALL crearla solo su dueño con el gesto "Hacer pública y compartir" y SHALL poder quitarla en cualquier momento.
Antes del gesto, la hoja SHALL avisar que las notas futuras de ese artista también se verán y que el progreso quedará a la vista. Al borrarse la cuenta o el
artista, la marca SHALL borrarse en cascada.

#### Scenario: Aviso antes del gesto
- **WHEN** el dueño abre Compartir en una discografía sin marca
- **THEN** ve el aviso y el botón "Hacer pública y compartir"

#### Scenario: Quitar la marca
- **WHEN** el dueño quita la marca
- **THEN** un anónimo recibe `404` y las valoraciones no cambian

### Requirement: Progreso de la discografía
La cabecera SHALL mostrar el progreso de forma discreta: nunca "X de Y" ni un porcentaje a la vista. Con un Recorrido no archivado y con selección SHALL mostrar la
barra de avance del Recorrido, anunciada por tramos para un lector de pantalla; sin Recorrido, cuántos discos valoró, sin total. SHALL NOT exponer qué se escuchó
ni cuándo.

#### Scenario: Con Recorrido
- **WHEN** la persona tiene un Recorrido con la mitad de su selección escuchada
- **THEN** la cabecera muestra la barra, sin ningún número, y un lector de pantalla anuncia "a la mitad"

#### Scenario: Sin Recorrido
- **WHEN** la persona no tiene Recorrido de ese artista y valoró 7 discos
- **THEN** la cabecera dice 7 discos valorados, sin el total de la discografía

#### Scenario: Recorrido archivado
- **WHEN** el Recorrido está archivado
- **THEN** la cabecera usa los discos valorados

### Requirement: Entradas a la discografía
`/me/laminas` SHALL listar hasta 12 artistas con 3 discos valorados o más, de mayor a menor cantidad. La página del artista SHALL enlazar a la discografía propia a
quien tiene 3 discos valorados de ese artista.

#### Scenario: Con artistas suficientes
- **WHEN** una persona con 4 discos valorados de un artista abre `/me/laminas`
- **THEN** ve ese artista y llega a su página

#### Scenario: Sin artistas suficientes
- **WHEN** una persona no tiene 3 discos valorados de ningún artista
- **THEN** `/me/laminas` no muestra la sección

### Requirement: Vista Por canción
La discografía SHALL ofrecer una vista Por canción: una columna por disco, en orden cronológico, y una fila por número de pista de su edición representativa, con
la nota de cada canción en su celda y la nota del disco arriba. Una pista sin valorar SHALL ser una celda vacía, nunca un 0. Entran los discos de las secciones
mostradas con alguna valoración, del disco o de sus canciones. La vista SHALL ofrecerse desde 10 canciones valoradas repartidas en al menos 2 discos; con menos,
la página SHALL mostrar solo la vista Por disco. La grilla SHALL leerse como tabla para un lector de pantalla.

#### Scenario: Con suficientes canciones
- **WHEN** una persona valoró 12 canciones de 3 discos
- **THEN** la vista Por canción está disponible y cada canción valorada aparece en su celda

#### Scenario: Pocas canciones
- **WHEN** una persona valoró 8 canciones
- **THEN** la página no ofrece la vista Por canción

#### Scenario: Disco solo con canciones
- **WHEN** un disco no tiene nota pero tiene canciones valoradas
- **THEN** aparece en la vista Por canción, sin nota arriba, y no en la vista Por disco

#### Scenario: Pista sin valorar
- **WHEN** una pista no tiene nota
- **THEN** su celda queda vacía, con borde

### Requirement: Preferencias del dueño
El dueño SHALL poder elegir, por artista, si suma las secciones En vivo y Recopilatorios y qué vista se muestra por defecto. La página y la imagen compartida SHALL
mostrar lo que eligió. Un visitante SHALL poder cambiar de vista en la página sin guardar nada. Si la vista elegida es Por canción y no llega al umbral, la página y
la imagen SHALL mostrar la vista Por disco. Las preferencias SHALL guardarse aunque la discografía no esté compartida y SHALL conservarse al quitar la marca.

#### Scenario: Vista por defecto
- **WHEN** el dueño elige Por canción y un anónimo abre su discografía compartida
- **THEN** ve la vista Por canción y la imagen también la muestra

#### Scenario: Cambiar de vista como visitante
- **WHEN** una seguidora pasa a Por disco
- **THEN** la página cambia y las preferencias del dueño no

#### Scenario: Sección inválida
- **WHEN** se piden las preferencias con la sección `singles`
- **THEN** la API responde `400` con `VALIDATION_ERROR`

### Requirement: Lámina de álbum
`/users/<u>/artist/<id>?disco=<album>` SHALL mostrar las pistas de ese disco como barras con su nota, desde 3 canciones valoradas, con las mismas reglas de quién
mira que la discografía. Para el dueño SHALL existir con cualquier disco mostrado, también sin canciones valoradas, con lo que le falta. El disco SHALL estar entre los mostrados; si no, o si no llega al umbral para un visitante, la respuesta SHALL ser `404`.

#### Scenario: Álbum con canciones valoradas
- **WHEN** una seguidora abre un disco con 5 canciones valoradas
- **THEN** ve sus pistas con la nota de cada una y las demás vacías

#### Scenario: Disco ajeno
- **WHEN** alguien abre `?disco=` con un disco de otro artista
- **THEN** la respuesta es `404`

#### Scenario: Con la marca
- **WHEN** un anónimo abre la Lámina de álbum de una discografía compartida
- **THEN** la ve, sin una marca aparte

#### Scenario: Dueño sin canciones valoradas
- **WHEN** el dueño abre la Lámina de un álbum del que no valoró ninguna canción
- **THEN** la ve con sus pistas, cada una con sus estrellas, y lo que le falta para que se vea

### Requirement: Valora lo que falta
`?valorar=1` en la discografía propia SHALL listar los discos de las secciones mostradas que no tienen nota, en orden cronológico, cada uno con el control de
estrellas de siempre. Cada elección SHALL guardarse al instante con la API de valoraciones, sin un envío aparte. En la Lámina de un álbum, el dueño SHALL ver ese
control en cada canción sin nota. Para un visitante, el parámetro SHALL ignorarse. La discografía propia SHALL enlazar a este modo mientras queden discos sin nota.

#### Scenario: Valorar un disco
- **WHEN** el dueño elige 4 estrellas en un disco de la lista
- **THEN** se guarda la valoración y el disco aparece en su discografía al volver

#### Scenario: Visitante con el parámetro
- **WHEN** una seguidora abre la discografía con `?valorar=1`
- **THEN** ve la discografía como siempre, sin controles

#### Scenario: Canciones del álbum
- **WHEN** el dueño abre la Lámina de un álbum con canciones sin nota
- **THEN** cada una tiene sus estrellas y las valoradas muestran su nota

### Requirement: Arma la tuya en una discografía
La discografía de otra persona SHALL ofrecer "Arma la tuya" a quien no es su dueño. Con sesión SHALL llevar a `/users/<yo>/artist/<id>?valorar=1`. Sin sesión SHALL
llevar al registro, con enlace al login, con la intención `discografia=<id>`; después de registrarse o de iniciar sesión, con contraseña o con Google, la persona SHALL
llegar a su discografía de ese artista en el modo para valorar. El destino SHALL armarse en el código con el usuario autenticado; un valor que no sea un identificador
SHALL descartarse.

#### Scenario: Visitante anónimo
- **WHEN** una persona sin sesión abre una discografía compartida
- **THEN** ve el llamado que lleva al registro con `discografia=<id>`

#### Scenario: Registro con la intención
- **WHEN** una persona se registra desde `/auth/register?discografia=<id>`
- **THEN** llega a `/<locale>/users/<su-usuario>/artist/<id>?valorar=1`, no a `/welcome`

#### Scenario: Dueño
- **WHEN** el dueño abre su discografía
- **THEN** no ve el llamado

