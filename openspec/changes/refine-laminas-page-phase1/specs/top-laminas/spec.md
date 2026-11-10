## MODIFIED Requirements

### Requirement: Editor
`/me/laminas` SHALL listar las Láminas propias y `/me/laminas/<id>` SHALL permitir buscar y quitar ítems, ordenarlos con controles operables con
teclado y toque, y cambiar título, formato, audiencia y notas. Bajar a un formato con menos lugares SHALL avisar qué ítems se quitan antes de
guardar. Subir, bajar y quitar un ítem SHALL ofrecerse en un menú por fila (sin «Subir» en el primero ni «Bajar» en el último), de modo que a
375 px el título se lea entero o en dos líneas. Cada ítem con valoración SHALL mostrar su nota en una sola forma: el puntaje detallado si
existe y, si no, las estrellas, con el color de su tramo de la escala de la casa; nunca un número derivado de las estrellas.

#### Scenario: Ordenar con teclado
- **WHEN** una persona sube un ítem con el teclado
- **THEN** cambia de puesto y el orden se guarda

#### Scenario: Bajar de formato
- **WHEN** una persona pasa de Top 10 a Top 5 con 8 ítems
- **THEN** ve qué 3 ítems se quitarían y puede cancelar

#### Scenario: Título legible en un teléfono
- **WHEN** una persona abre el editor de un Top 5 a 375 px
- **THEN** cada fila muestra el título completo o en dos líneas, la nota y un solo botón de acciones

#### Scenario: Una sola forma para la nota
- **WHEN** un ítem tiene 96 de puntaje detallado y otro solo 4.5 estrellas
- **THEN** el editor muestra «96» y «4.5★», sin «/100»

## ADDED Requirements

### Requirement: Controles comunes a las altas
Las altas de una Lámina y de una tier list SHALL usar los mismos nombres y controles para lo mismo: «Qué incluye» con «Discos» y «Canciones»,
y segmentos (no selectores nativos) para el tipo, el formato y la fuente. Las casillas SHALL seguir el estilo oscuro de la app. El texto de
ejemplo del título SHALL corresponder al formato y al tipo elegidos, y el botón de crear SHALL avisar mientras guarda. En pantallas angostas,
las fuentes SHALL ir en dos columnas sin dejar una opción suelta en otra fila. La vista previa de una fuente SHALL mostrar la nota igual que
el editor.

#### Scenario: Mismos nombres
- **WHEN** una persona abre las dos altas en `/me/laminas`
- **THEN** ambas dicen «Qué incluye» y ofrecen «Discos» y «Canciones» como segmentos

#### Scenario: Texto de ejemplo según el formato
- **WHEN** una persona elige Top 5 de discos a mano en 2026
- **THEN** el título vacío sugiere «Mis 5 discos de 2026»
