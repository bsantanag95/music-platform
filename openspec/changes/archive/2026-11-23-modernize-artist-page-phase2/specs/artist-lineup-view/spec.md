## ADDED Requirements

### Requirement: Línea de tiempo de la alineación

La pestaña Integrantes de un grupo SHALL mostrar, encima del filtro de sub-vistas y en las sub-vistas Completa, Actual (o Última
alineación) y Antiguos, la línea de tiempo «La banda a lo largo del tiempo»: una fila por integrante actual y antiguo (sin músicos
de apoyo) con un tramo por cada período de cada rol, distinguiendo la voz de los instrumentos, sobre un eje de años desde la
formación del grupo hasta hoy o hasta su separación. La línea de tiempo SHALL NOT inventar fechas: un período sin año de inicio
SHALL dibujarse desde la formación con el inicio marcado como desconocido, un período terminado sin año de fin SHALL dibujarse con
el fin marcado como desconocido, y un período sin ningún año SHALL NOT dibujarse. Cada fila SHALL tener un texto equivalente para
lectores de pantalla con sus roles y años. La línea de tiempo SHALL omitirse cuando menos de dos integrantes tienen un período con
algún año, y SHALL NOT mostrarse en la sub-vista Apoyo. La página SHALL NOT desbordar en horizontal en 390 px.

#### Scenario: Grupo con historia fechada

- **WHEN** una persona abre la pestaña Integrantes de Iron Maiden
- **THEN** ve «La banda a lo largo del tiempo» con una fila por cada integrante actual y antiguo, la voz distinguida de los
  instrumentos y un eje de 1975 a hoy, y debajo la alineación de siempre

#### Scenario: Período sin año de fin

- **WHEN** un integrante tiene un período terminado que solo tiene año de inicio
- **THEN** su tramo empieza en ese año, termina con el fin marcado como desconocido y el texto accesible dice «1978–?»

#### Scenario: Pocos datos

- **WHEN** solo un integrante del grupo tiene períodos con año
- **THEN** la pestaña no muestra la línea de tiempo

#### Scenario: Sub-vista Apoyo

- **WHEN** una persona abre la sub-vista Apoyo
- **THEN** ve los músicos de apoyo sin la línea de tiempo

#### Scenario: Teléfono

- **WHEN** una persona abre la pestaña Integrantes en 390 px
- **THEN** la línea de tiempo cabe en el ancho sin desplazamiento horizontal de la página
