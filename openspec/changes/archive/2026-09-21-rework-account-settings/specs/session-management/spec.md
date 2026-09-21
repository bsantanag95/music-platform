## ADDED Requirements

### Requirement: Etiqueta de dispositivo y última actividad de la sesión

Al crear una sesión el sistema SHALL guardar una etiqueta legible del dispositivo (por ejemplo
"Chrome · Windows"), derivada del `User-Agent` de la petición, o ninguna cuando no pueda derivarse (la
interfaz la muestra entonces como «Dispositivo desconocido», localizado). El sistema SHALL NOT guardar
el `User-Agent` completo ni la dirección IP. El sistema
SHALL registrar la última actividad de cada sesión, actualizándola como mucho una vez cada 10
minutos. Las sesiones creadas antes de esta capacidad SHALL seguir siendo válidas, mostradas como
"Dispositivo desconocido" y sin última actividad.

#### Scenario: Etiqueta al iniciar sesión

- **WHEN** una persona inicia sesión desde Firefox en Linux
- **THEN** la sesión guarda la etiqueta "Firefox · Linux" y ningún otro dato del navegador

#### Scenario: User-Agent irreconocible

- **WHEN** la petición trae un `User-Agent` vacío o desconocido
- **THEN** la sesión se crea sin etiqueta y se lista como «Dispositivo desconocido»

#### Scenario: Actividad sin escrituras excesivas

- **WHEN** una sesión hace 20 peticiones en 5 minutos
- **THEN** su última actividad se actualiza como mucho una vez

#### Scenario: Sesión anterior a la capacidad

- **WHEN** existe una sesión creada antes de esta capacidad
- **THEN** sigue siendo válida y se lista como "Dispositivo desconocido"

### Requirement: Listar las sesiones propias

El sistema SHALL ofrecer a un usuario autenticado la lista de sus sesiones vigentes, cada una con su
etiqueta de dispositivo, fecha de inicio y última actividad, marcando cuál es la sesión actual, con la
actual primero y el resto por actividad más reciente. La lista SHALL NOT incluir tokens ni hashes, y
SHALL contener solo sesiones de esa persona. La pantalla Cuenta y seguridad SHALL mostrarla.

#### Scenario: Ver dispositivos

- **WHEN** la persona tiene tres sesiones vigentes y abre Cuenta y seguridad
- **THEN** ve tres filas con dispositivo, fecha de inicio y última actividad, y la sesión actual
  marcada como "Esta sesión"

#### Scenario: Sin datos de otras personas

- **WHEN** otra persona tiene sesiones vigentes
- **THEN** ninguna aparece en la lista

### Requirement: Cerrar una sesión

El sistema SHALL permitir cerrar una sesión propia que no sea la actual: la sesión deja de ser válida
de inmediato y desaparece de la lista. SHALL rechazar cerrar la sesión actual por esta vía (para eso
está cerrar sesión) y SHALL responder como no encontrada cuando el identificador no pertenezca a la
persona. El cierre de todas las sesiones existente SHALL conservarse, con la confirmación previa.

#### Scenario: Cerrar otro dispositivo

- **WHEN** la persona pulsa "Cerrar" en la fila de Safari · iPhone
- **THEN** esa sesión deja de ser válida y la fila desaparece

#### Scenario: Cerrar la sesión de otra persona

- **WHEN** un cliente pide cerrar el identificador de una sesión que no es suya
- **THEN** la API responde no encontrado y esa sesión sigue válida

#### Scenario: Cerrar la sesión actual desde la lista

- **WHEN** un cliente pide cerrar la sesión actual por este endpoint
- **THEN** la API lo rechaza con un error de validación y la sesión sigue válida
