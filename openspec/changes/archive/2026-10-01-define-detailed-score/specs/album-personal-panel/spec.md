## REMOVED Requirements

### Requirement: Puntaje detallado en diálogo
**Reason**: el diálogo ya no exige estrellas previas ni limita el campo a la banda de las estrellas vigentes: se puede puntuar primero con el número y las estrellas se derivan (ver el nuevo requisito "Puntaje detallado con o sin estrellas previas").
**Migration**: usar "Puntaje detallado con o sin estrellas previas".

## ADDED Requirements

### Requirement: Puntaje detallado con o sin estrellas previas
Junto a las estrellas, el panel SHALL ofrecer una acción compacta que muestra el puntaje
detallado vigente como `86/100` (o un indicador de "agregar" si no hay) y abre un diálogo
modal para puntuar de 1 a 100, con o sin estrellas previas, y, cuando ya hay una valoración,
con destacar/quitar de destacadas y borrar la valoración. La acción SHALL estar siempre
habilitada. Mientras se escribe, el diálogo SHALL mostrar en vivo la equivalencia en
estrellas ("86 → 4,5★") y, si las estrellas vigentes son distintas, avisar de forma
accesible de qué valor a cuál cambiarán. Guardar SHALL enviar solo el puntaje; las estrellas
SHALL ser las que devuelve el servidor. El diálogo SHALL cerrarse con Escape y devolver el
foco a la acción que lo abrió. La misma acción y el mismo diálogo SHALL usarse en el panel de
la canción.

#### Scenario: Puntuar sin estrellas previas
- **WHEN** un usuario que no valoró el álbum abre el diálogo y escribe 86
- **THEN** el diálogo muestra "86 → 4,5★", y al guardar el panel muestra 4,5 estrellas y
  `86/100`

#### Scenario: El puntaje cambia las estrellas vigentes
- **WHEN** un usuario con 4★ escribe 86 en el diálogo
- **THEN** el diálogo avisa que sus estrellas cambiarán de 4 a 4,5, y al guardar el panel
  muestra 4,5 estrellas y `86/100`

#### Scenario: Valor fuera de 1–100
- **WHEN** el usuario escribe 0, 101 o un número no entero
- **THEN** el diálogo no permite guardar y marca el campo como inválido

#### Scenario: Borrar la valoración
- **WHEN** un usuario confirma "Borrar nota" en el diálogo
- **THEN** se borran estrellas y puntaje detallado y las estrellas del panel quedan vacías

#### Scenario: Acciones de la valoración sin valoración
- **WHEN** un usuario sin valoración abre el diálogo
- **THEN** no se ofrecen "Destacar" ni "Borrar nota"
