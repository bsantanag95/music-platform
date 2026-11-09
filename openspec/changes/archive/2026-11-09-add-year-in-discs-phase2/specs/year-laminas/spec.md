## ADDED Requirements

### Requirement: Top 5 del año
El año SHALL mostrar un Top 5 de discos escuchados ese año. Sin elección del dueño, SHALL prellenarse con los discos del año que el dueño valoró, de mejor a
peor nota y a igual nota por escuchas del año, completado con los más escuchados sin nota. El dueño SHALL poder elegir y ordenar de 1 a 5 discos, todos
escuchados ese año y no ocultos; otro disco SHALL responder `400` con `VALIDATION_ERROR`. Un disco guardado que deja de tener escuchas ese año o se oculta
SHALL dejar de aparecer, y el Top 5 SHALL completarse con el prellenado.

#### Scenario: Prellenado por nota
- **WHEN** el dueño valoró con 95 un disco escuchado una vez y con 80 otro escuchado diez veces
- **THEN** el de 95 va primero

#### Scenario: Elegir un disco de otro año
- **WHEN** el dueño intenta poner en su Top 5 de 2026 un disco que solo escuchó en 2025
- **THEN** la respuesta es `400` con `VALIDATION_ERROR`

#### Scenario: Volver al prellenado
- **WHEN** el dueño borra su Top 5 guardado
- **THEN** el año muestra el prellenado

### Requirement: Ocultar discos del año
El dueño SHALL poder ocultar un disco con escuchas en ese año y volver a mostrarlo. Un disco oculto SHALL NOT aparecer en el calendario, el Top 5 ni la
imagen, y sus escuchas SHALL NOT contar en las cifras (escuchas, discos, discos nuevos, artistas descubiertos). Ocultar SHALL NOT cambiar el diario. El
dueño SHALL ver sus ocultos aparte; nadie más SHALL saber que existen.

#### Scenario: Ocultar un disco
- **WHEN** el dueño oculta un disco que escuchó tres veces en marzo
- **THEN** marzo ya no lo muestra, las escuchas del año bajan en tres y un anónimo no ve rastro de él

#### Scenario: Volver a mostrar
- **WHEN** el dueño vuelve a mostrar ese disco
- **THEN** reaparece en marzo y en las cifras

#### Scenario: Disco sin escuchas ese año
- **WHEN** el dueño intenta ocultar un disco que no escuchó ese año
- **THEN** la respuesta es `400` con `VALIDATION_ERROR`

### Requirement: Edición del año en su página
Para el dueño, la página del año SHALL permitir cambiar y ordenar el Top 5 con controles operables con teclado y toque, ocultar un disco desde el
calendario y volver a mostrar los ocultos. Nadie más SHALL ver esos controles.

#### Scenario: Ordenar con teclado
- **WHEN** el dueño sube con el teclado el tercer disco de su Top 5
- **THEN** pasa al segundo lugar y se guarda
