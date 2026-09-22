## MODIFIED Requirements

### Requirement: Campos de identidad extendida

El sistema SHALL permitir que un usuario autenticado registre una bio (máximo 200
caracteres), pronombres (una opción de una lista cerrada o un texto libre «Otro» de máximo 40),
un país de una lista cerrada, una ciudad o región en texto libre (máximo 80) y una zona
horaria. Los pronombres, el país y la ciudad o región se rigen además por `profile-personal-info`. La zona horaria SHALL ser un identificador de zona válido (por ejemplo
`America/Santiago`) elegido de una lista, y el sistema SHALL rechazar cualquier otro valor con un
error de validación localizado. Como la lista tiene cientos de zonas, el editor SHALL ofrecerla con un
buscador que filtra mientras se escribe (sin distinguir mayúsculas ni tildes) y que se puede usar con
teclado. Todos los campos SHALL ser opcionales y SHALL poder vaciarse. El
sistema SHALL recortar espacios sobrantes y SHALL rechazar valores que excedan sus límites con un
error de validación localizado, sin modificar los datos. Los valores de zona horaria guardados antes
de esta regla que no sean una zona válida SHALL descartarse (quedan vacíos).

#### Scenario: Guardar bio y pronombres

- **WHEN** el dueño guarda una bio de 120 caracteres y elige los pronombres «Elle» de la lista
- **THEN** el perfil persiste ambos valores y los muestra en la identidad extendida de un perfil
  al que quien mira tiene acceso

#### Scenario: Vaciar un campo

- **WHEN** el dueño guarda una bio vacía sobre una bio existente
- **THEN** el perfil deja de mostrar la bio y no muestra un hueco

#### Scenario: Valor demasiado largo

- **WHEN** el dueño envía una bio de 201 caracteres
- **THEN** la API responde con un error de validación y la bio anterior no cambia

#### Scenario: Zona horaria válida

- **WHEN** el dueño elige `America/Santiago` como zona horaria
- **THEN** el valor se guarda tal cual

#### Scenario: Zona horaria inválida

- **WHEN** un cliente envía `hora de mi casa` o `Mars/Olympus` como zona horaria
- **THEN** la API responde con un error de validación y la zona anterior no cambia

#### Scenario: Buscar una zona en el selector

- **WHEN** el dueño abre el selector de zona horaria y escribe "santiago" (o "buenos aires", sin
  distinguir mayúsculas ni tildes)
- **THEN** la lista se reduce a las zonas que contienen todas las palabras escritas, con las zonas cuya
  ciudad empieza por la búsqueda primero, y se anuncia cuántas coinciden

#### Scenario: Búsqueda sin coincidencias

- **WHEN** lo escrito no coincide con ninguna zona
- **THEN** el selector lo dice con un mensaje y no ofrece opciones

#### Scenario: Zona horaria libre anterior

- **WHEN** se aplica este cambio sobre un perfil cuya zona horaria era un texto que no es una zona
  válida
- **THEN** la zona queda vacía y el editor la muestra sin elegir
