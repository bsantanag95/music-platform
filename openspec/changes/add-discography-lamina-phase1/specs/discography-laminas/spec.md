## ADDED Requirements

### Requirement: Página de discografía de una persona
`/users/<u>/artist/<id>` SHALL mostrar los discos de la sección principal del artista que la persona valoró, en orden cronológico, con su nota y una curva de la
carrera. La nota SHALL ser la detallada si existe y, si no, las estrellas, mostradas como estrellas: el sistema SHALL NOT mostrar un número inventado. La página
SHALL existir desde 3 discos valorados y SHALL reflejar siempre las notas vigentes. El dueño SHALL ver cuántos discos le faltan si aún no llega a 3.

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
