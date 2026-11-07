## ADDED Requirements

### Requirement: Lámina Top N
Una persona con sesión SHALL poder crear una Lámina Top N con título, formato (**Top 5**, **Top 10** o **Grilla 3×3**) y tipo de ítem (álbumes o
canciones). Una Lámina SHALL tener un solo tipo de ítem, sin repetidos, y como máximo los ítems de su formato. El orden de los ítems SHALL ser el
ranking.

#### Scenario: Crear un Top 5
- **WHEN** una persona crea un Top 5 de álbumes y agrega 5 discos
- **THEN** la Lámina los guarda en ese orden

#### Scenario: Pasar el tope
- **WHEN** una persona intenta agregar un sexto disco a un Top 5
- **THEN** la API responde `400` con `VALIDATION_ERROR` y no agrega nada

#### Scenario: Ítem repetido
- **WHEN** una persona agrega un disco que ya está
- **THEN** la Lámina no cambia

#### Scenario: Tipo equivocado
- **WHEN** una persona agrega una canción a una Lámina de álbumes
- **THEN** la API responde `400` con `VALIDATION_ERROR`

### Requirement: Fuera de las superficies de listas
Una Lámina SHALL NOT aparecer en listados, descubrimiento, guardados ni selectores de listas. Su audiencia, su moderación y su exportación SHALL
seguir las reglas de las listas.

#### Scenario: Mis listas
- **WHEN** una persona con una Lámina abre `/me/lists`
- **THEN** la Lámina no aparece

#### Scenario: Exportación
- **WHEN** una persona exporta sus datos
- **THEN** el archivo incluye sus Láminas con sus ítems

### Requirement: Editor
`/me/laminas` SHALL listar las Láminas propias y `/me/laminas/<id>` SHALL permitir buscar y quitar ítems, ordenarlos con controles operables con
teclado y toque, y cambiar título, formato, audiencia y notas. Bajar a un formato con menos lugares SHALL avisar qué ítems se quitan antes de
guardar.

#### Scenario: Ordenar con teclado
- **WHEN** una persona sube un ítem con el teclado
- **THEN** cambia de puesto y el orden se guarda

#### Scenario: Bajar de formato
- **WHEN** una persona pasa de Top 10 a Top 5 con 8 ítems
- **THEN** ve qué 3 ítems se quitarían y puede cancelar

### Requirement: Página pública
`/users/<usuario>/laminas/<id>` SHALL mostrar la Lámina con los puestos, título, dueño y enlaces a cada ítem, según su audiencia, sin sesión si es
pública. Una Lámina que el visitante no puede ver, oculta por moderación o de una cuenta desactivada SHALL responder `404`. Su dueño SHALL llegar a su
gestión.

#### Scenario: Lámina pública sin sesión
- **WHEN** un visitante sin sesión abre una Lámina pública
- **THEN** la ve completa, con el botón Compartir

#### Scenario: Lámina para seguidores
- **WHEN** un anónimo abre una Lámina para seguidores
- **THEN** la respuesta es `404`

### Requirement: Notas de una Lámina
Una Lámina SHALL nacer sin notas. Si su dueño las enciende, la Lámina SHALL mostrar a quien pueda verla la nota vigente de cada ítem, con su puntaje
detallado si existe y, si no, las estrellas; un ítem sin valorar SHALL ir sin nota. Apagarlas SHALL ocultarlas en la página y en la imagen.

#### Scenario: Sin notas
- **WHEN** un anónimo abre una Lámina con las notas apagadas de una persona que valoró esos discos
- **THEN** no ve ninguna nota, ni en la página ni en la imagen

#### Scenario: Con notas
- **WHEN** el dueño enciende las notas y valoró un disco con 86
- **THEN** la página y la imagen muestran 86

#### Scenario: Nota cambiada
- **WHEN** el dueño cambia su valoración de un disco de una Lámina con notas
- **THEN** la Lámina muestra la nota nueva y su imagen cambia de versión
