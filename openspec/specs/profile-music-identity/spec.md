# profile-music-identity Specification

## Purpose
TBD - created by archiving change rework-account-settings. Update Purpose after archive.
## Requirements
### Requirement: Me defino como

El sistema SHALL permitir que una persona elija hasta 3 roles de una lista cerrada: oyente
(`listener`), coleccionista (`collector`), músico (`musician`), DJ (`dj`), crítico (`critic`) y
selector de radio (`radio-host`). El campo SHALL ser opcional y vaciable, sin repetidos, y el
sistema SHALL rechazar un valor fuera de la lista o un cuarto rol con un error de validación
localizado, sin modificar los datos. Los roles describen cómo la persona se relaciona con la música y
SHALL NOT otorgar permisos, insignias ni métricas.

#### Scenario: Elegir roles

- **WHEN** la persona guarda `collector` y `dj`
- **THEN** el perfil muestra "Coleccionista · DJ" en la ficha de la Placa

#### Scenario: Cuarto rol

- **WHEN** un cliente envía cuatro roles
- **THEN** la API responde con un error de validación y los roles anteriores no cambian

#### Scenario: Rol desconocido

- **WHEN** un cliente envía `admin` como rol
- **THEN** la API responde con un error de validación

### Requirement: Géneros que me mueven

El sistema SHALL permitir que una persona elija hasta 5 géneros de una lista cerrada: `rock`,
`punk`, `post-punk`, `indie`, `shoegaze`, `metal`, `hip-hop`, `electronic`, `ambient`, `jazz`,
`soul-funk`, `folk`, `blues`, `classical`, `pop`, `latin`, `reggae`, `experimental`, `country` y
`bossa-nova`. El campo SHALL ser opcional, vaciable y sin repetidos; el sistema SHALL rechazar un
valor fuera de la lista o un sexto género. No SHALL existir texto libre.

#### Scenario: Elegir géneros

- **WHEN** la persona guarda `post-punk`, `jazz` y `shoegaze`
- **THEN** la ficha de la Placa muestra los tres géneros con su nombre localizado

#### Scenario: Sexto género

- **WHEN** un cliente envía seis géneros
- **THEN** la API responde con un error de validación y los géneros anteriores no cambian

#### Scenario: Género fuera de la lista

- **WHEN** un cliente envía un género que no está en la lista
- **THEN** la API responde con un error de validación

### Requirement: Cómo escucho

El sistema SHALL permitir que una persona elija los formatos en que escucha, de una lista cerrada:
vinilo (`vinyl`), CD (`cd`), casete (`cassette`), streaming (`streaming`) y archivos digitales
(`digital`), sin repetidos. El campo SHALL ser opcional y vaciable, y el sistema SHALL rechazar un
valor fuera de la lista con un error de validación.

#### Scenario: Elegir formatos

- **WHEN** la persona guarda `vinyl` y `streaming`
- **THEN** la ficha de la Placa muestra "Vinilo · Streaming" en la fila "Escucho en"

#### Scenario: Formato desconocido

- **WHEN** un cliente envía `8-track`
- **THEN** la API responde con un error de validación

### Requirement: Preguntas del perfil

El sistema SHALL permitir que una persona responda hasta 3 preguntas de una lista cerrada de 8:
el primer disco que compré (`first-record`), lo que pongo un domingo (`sunday-record`), una canción
que defiendo (`defended-song`), un placer culposo (`guilty-pleasure`), mi primer concierto
(`first-concert`), un disco para una isla desierta (`desert-island-record`), lo que pongo cuando
estoy triste (`sad-day-record`) y un disco para un viaje (`road-trip-record`). Cada respuesta SHALL
ser texto de una línea de hasta 100 caracteres, sin saltos de línea, recortada de espacios
sobrantes; una pregunta no puede responderse dos veces. El orden lo define la persona. El sistema
SHALL rechazar una pregunta fuera de la lista, una respuesta vacía o demasiado larga, o una cuarta
pregunta, con un error de validación localizado y sin modificar los datos. Guardar SHALL reemplazar
el conjunto completo de forma atómica.

#### Scenario: Responder dos preguntas

- **WHEN** la persona responde `first-record` con "Un casete de Los Prisioneros" y `sunday-record`
  con "Kind of Blue, sin apuro"
- **THEN** ambas respuestas aparecen en la ficha de la Placa en ese orden

#### Scenario: Respuesta demasiado larga

- **WHEN** un cliente envía una respuesta de 101 caracteres
- **THEN** la API responde con un error de validación y el conjunto anterior no cambia

#### Scenario: Pregunta repetida

- **WHEN** un cliente envía dos respuestas para la misma pregunta
- **THEN** la API responde con un error de validación

#### Scenario: Cuarta pregunta

- **WHEN** un cliente envía cuatro preguntas
- **THEN** la API responde con un error de validación y el conjunto anterior no cambia

#### Scenario: Quitar una pregunta

- **WHEN** la persona guarda el conjunto sin una de las preguntas
- **THEN** esa respuesta desaparece de la ficha y no deja hueco

### Requirement: Ficha de la Placa

La Placa SHALL mostrar una ficha ("de disco") debajo de los enlaces, con las etiquetas en tipografía
de datos y los valores a su lado: "Soy" (roles), "Géneros", "Escucho en" y una fila por cada pregunta
respondida con su etiqueta corta. La ficha SHALL omitir cada fila vacía y SHALL omitirse por completo
cuando la persona no completó ninguna, sin dejar hueco ni divisor. La ficha SHALL mostrarse
únicamente en la Placa de un perfil accesible (público, seguidor aprobado o dueño) y SHALL NOT
mostrarse en la tarjeta de un perfil privado sin acceso. Ninguna fila SHALL exponer números de
actividad ni logros.

#### Scenario: Perfil completo

- **WHEN** un visitante abre el perfil de alguien con roles, géneros, formatos y dos preguntas
- **THEN** la Placa muestra la ficha con "Soy", "Géneros", "Escucho en" y las dos preguntas

#### Scenario: Perfil sin datos nuevos

- **WHEN** un visitante abre el perfil de alguien que no completó ninguno de estos campos
- **THEN** la Placa se ve como antes, sin ficha ni espacio vacío

#### Scenario: Fila parcial

- **WHEN** la persona solo completó los géneros
- **THEN** la ficha muestra únicamente la fila "Géneros"

#### Scenario: Perfil privado sin acceso

- **WHEN** un visitante sin acceso abre un perfil privado
- **THEN** la tarjeta del perfil privado no muestra la ficha

### Requirement: Editar la identidad musical

La persona SHALL poder editar roles, géneros, formatos y preguntas desde la pantalla Perfil de Ajustes
y desde el modo edición de su propio perfil, con los mismos editores en ambos lugares, cada uno con
estados de carga, éxito y error recuperable, y con el panel lateral de edición del modo edición. Los
editores SHALL mostrar el contador de elegidos sobre el máximo, impedir elegir más allá del máximo, y
SHALL renderizarse únicamente en vistas del dueño. Sin completar, ninguna de estas secciones SHALL
tener efecto visible en el perfil.

#### Scenario: Editar desde Ajustes

- **WHEN** la persona elige géneros en la pantalla Perfil y guarda
- **THEN** el cambio se persiste y su perfil los muestra

#### Scenario: Editar desde el modo edición

- **WHEN** la persona activa el modo edición y abre el bloque de la ficha en el panel lateral
- **THEN** ve los mismos editores y el cambio se refleja en la Placa sin recargar

#### Scenario: Máximo alcanzado

- **WHEN** la persona ya eligió 5 géneros
- **THEN** los géneros restantes no se pueden elegir hasta quitar uno

#### Scenario: Error recuperable

- **WHEN** falla una petición de guardado
- **THEN** el editor muestra un error localizado, conserva lo elegido y permite reintentar

#### Scenario: Un visitante no ve los editores

- **WHEN** un visitante que no es el dueño abre el perfil
- **THEN** no ve ningún control de edición de la identidad musical

### Requirement: Hora local en el perfil

Cuando la persona haya elegido una zona horaria válida y activado "mostrar mi hora local", la Placa
SHALL mostrar la hora actual en esa zona con la etiqueta "hora local" junto a la ubicación, calculada
al renderizar la página. Sin zona válida o con la opción desactivada, la Placa SHALL NOT mostrar la
hora. La opción SHALL estar desactivada por defecto.

#### Scenario: Hora local visible

- **WHEN** una persona con zona `America/Santiago` y la opción activada tiene su perfil abierto
- **THEN** la Placa muestra la hora actual de Santiago con la etiqueta "hora local"

#### Scenario: Opción desactivada

- **WHEN** la persona tiene zona pero no activó la opción
- **THEN** la Placa no muestra ninguna hora

#### Scenario: Activar sin zona

- **WHEN** la persona activa la opción sin haber elegido una zona
- **THEN** el editor pide elegir una zona y el perfil no muestra hora

