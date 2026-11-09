## ADDED Requirements

### Requirement: Imagen de un año en discos
El sistema SHALL generar la imagen de un año en Publicación (por defecto) e Historia con título, firma, el Top 5 numerado, el calendario de los doce meses
con el disco más escuchado de cada uno y las cifras distintas de cero, sin los discos ocultos. SHALL llevar hasta 10 carátulas distintas: primero las del
Top 5 y después la del disco de los meses con más escuchas; los demás meses SHALL mostrar el título de su disco, y un mes sin escuchas, vacío. Enlace SHALL
usar el marco común con las cuatro primeras del Top 5. Sin la marca del año, un anónimo SHALL recibir la imagen genérica.

#### Scenario: Más de 10 carátulas posibles
- **WHEN** se genera la imagen de un año con Top 5 y escuchas en los doce meses, todos con discos distintos
- **THEN** llevan carátula los 5 del Top y los discos de los 5 meses con más escuchas, y los otros 7 meses van con su título

#### Scenario: Disco oculto
- **WHEN** el dueño ocultó el disco más escuchado de marzo
- **THEN** la imagen muestra en marzo el siguiente, o el mes vacío
