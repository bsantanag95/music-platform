## MODIFIED Requirements

### Requirement: Acción Recorrido

El chip **Completar discografía** ("Complete discography" en inglés) SHALL, tras elegir un artista, consultar
primero si la persona ya tiene un recorrido sobre él. Si ya existe, SHALL informarlo ("Ya estás completando
esta discografía") y enlazar a su gestión sin modificar nada. Si no existe, SHALL activarlo y confirmar con un
enlace a su gestión ("Ver progreso"), mostrando un estado de progreso mientras se activa. El chip SHALL NOT
llamarse "Recorrido".

#### Scenario: Activar un recorrido

- **WHEN** una persona elige un artista sin recorrido con el chip "Completar discografía"
- **THEN** se activa su recorrido y el diálogo enlaza a `/me/artist-journeys/{artistId}` con "Ver progreso"

#### Scenario: Ya tiene recorrido

- **WHEN** una persona elige un artista que ya tiene recorrido
- **THEN** el diálogo informa que ya está completando esa discografía, enlaza a su gestión y no activa nada

### Requirement: Acción Nuevo Camino

El chip **Nueva lista para completar** ("New list to complete" en inglés) SHALL pedir solo un título
(obligatorio) y crear el Camino **sin audiencia explícita**, de modo que se aplique la audiencia por defecto de
la persona. Al crearlo SHALL ofrecer **Ver lista** y **Agregar álbumes**; esta última SHALL llevar al chip
"A lista" con la búsqueda fijada a álbumes. El chip SHALL NOT llamarse "Nuevo Camino".

#### Scenario: Crear un Camino con la audiencia por defecto

- **WHEN** una persona con audiencia por defecto `private` crea una lista para completar desde el diálogo
- **THEN** el Camino se crea con audiencia `private`, sin que el diálogo la haya preguntado

#### Scenario: Título obligatorio

- **WHEN** una persona intenta crear una lista para completar sin título
- **THEN** no se crea y se indica que el título es obligatorio

#### Scenario: Agregar a un Camino recién creado

- **WHEN** una persona crea una lista para completar y activa "Agregar álbumes"
- **THEN** el diálogo pasa al chip "A lista" con la búsqueda fijada en álbumes
