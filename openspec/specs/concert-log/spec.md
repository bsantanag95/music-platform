# concert-log Specification

## Purpose
Registrar los conciertos a los que fue una persona como un recuerdo propio (no un concierto verificado, ADR 0056): alta desde el artista o desde Mis conciertos, edición y baja, audiencia por registro, la página Mis conciertos por año y la lectura en el perfil.
## Requirements
### Requirement: Registrar un concierto

El sistema SHALL permitir a un usuario autenticado registrar un concierto al que fue, sobre un artista del catálogo,
mediante `POST /api/me/concerts`. Cada registro SHALL tener el artista y la fecha con al menos el año (`YYYY`,
`YYYY-MM` o `YYYY-MM-DD`), y de forma opcional país (código ISO de dos letras), ciudad, recinto y gira (texto de hasta
100 caracteres cada uno), el enlace al setlist en setlist.fm, una nota de hasta 140 caracteres y la audiencia. La
operación SHALL crear siempre un registro nuevo: el mismo artista puede tener varios registros, aun con la misma fecha.
La fecha SHALL NOT ser posterior a hoy. Estas reglas SHALL vivir también como `CHECK` en la base.

#### Scenario: Registro mínimo

- **WHEN** un usuario registra un concierto de un artista con fecha `2019`
- **THEN** el sistema crea el registro con el año y sin los demás datos

#### Scenario: Registro completo

- **WHEN** un usuario registra fecha `2023-03-20`, país `BR`, ciudad "São Paulo", recinto "Autódromo de Interlagos",
  gira "World Tour" y una nota
- **THEN** el sistema guarda todos los datos tal como se escribieron

#### Scenario: Dos conciertos de la misma gira

- **WHEN** un usuario registra dos conciertos del mismo artista con la misma fecha
- **THEN** se crean dos registros

#### Scenario: Fecha inválida o futura

- **WHEN** la petición trae la fecha `2019-13` o una fecha posterior a hoy
- **THEN** la API responde `400` con código `VALIDATION_ERROR` y no crea nada

#### Scenario: Artista inexistente

- **WHEN** la petición apunta a un artista que no existe
- **THEN** la API responde `404` con código `ARTIST_NOT_FOUND` y no crea nada

#### Scenario: Sesión requerida

- **WHEN** una petición sin sesión intenta registrar un concierto
- **THEN** la API responde `401` con código `AUTH_REQUIRED`

### Requirement: Enlace al setlist en setlist.fm

El enlace opcional SHALL aceptarse solo si es una URL `https` de `setlist.fm` o `www.setlist.fm` con ruta de setlist
(`/setlist/…`). El sistema SHALL guardarlo tal como lo pegó la persona, SHALL NOT consultar setlist.fm ni leer datos de
él, y SHALL mostrarlo como enlace externo que abre en una pestaña nueva.

#### Scenario: Enlace válido

- **WHEN** el usuario pega `https://www.setlist.fm/setlist/the-strokes/2023/autodromo-de-interlagos-sao-paulo-brazil-1b2c3d4.html`
- **THEN** el registro lo guarda y lo muestra como "Setlist ↗"

#### Scenario: Enlace de otro sitio

- **WHEN** el usuario pega una URL de otro dominio o una página de artista de setlist.fm (`/setlists/…`)
- **THEN** la API responde `400` con código `VALIDATION_ERROR`

### Requirement: Editar y quitar un concierto propio

El dueño SHALL poder editar cualquier dato de un registro propio (incluido el artista) mediante
`PATCH /api/me/concerts/{id}` y quitarlo mediante `DELETE /api/me/concerts/{id}`, con las mismas validaciones del
alta. Un registro ajeno o inexistente SHALL responder `404` con código `CONCERT_NOT_FOUND`, sin revelar si existe.

#### Scenario: Corregir la fecha

- **WHEN** el dueño cambia la fecha de `2019` a `2019-11-02`
- **THEN** el registro queda con la fecha nueva y conserva los demás datos

#### Scenario: Registro ajeno

- **WHEN** un usuario intenta editar o quitar un registro de otra persona
- **THEN** la API responde `404` con código `CONCERT_NOT_FOUND` y no modifica nada

### Requirement: Audiencia del concierto

Cada registro SHALL tener audiencia `private`, `followers` o `public`. Sin valor explícito SHALL resolverse con la
audiencia por defecto del usuario y, si no la tiene, `followers` (capability `default-audience`). Un registro `private`
SHALL ser visible solo para su dueño.

#### Scenario: Audiencia por defecto del tipo

- **WHEN** un usuario sin audiencia por defecto registra un concierto sin indicar audiencia
- **THEN** el registro nace `followers`

#### Scenario: Registro privado

- **WHEN** un visitante mira el perfil de alguien con un concierto `private`
- **THEN** ese concierto no aparece en ninguna superficie ajena

### Requirement: Página Mis conciertos

El usuario autenticado SHALL tener la página **Mis conciertos** (`/{locale}/me/concerts`) con sus registros agrupados
por año, del más reciente al más antiguo; dentro de un año, por fecha descendente, con los de fecha parcial después de
los de fecha completa del mismo mes o año. Cada fila SHALL mostrar el artista (enlazado), la fecha con su precisión, el
recinto, la ciudad y el país, la gira, la nota, el enlace al setlist si existe y la audiencia, con acciones para
editar, cambiar la audiencia y quitar (con confirmación). Arriba SHALL mostrar el total de conciertos, de artistas
distintos y de países, y un botón "Registrar concierto" que abre el formulario con un buscador de artistas. La página
SHALL aceptar `?artista=<id>` para mostrar solo los de un artista, con forma de quitar el filtro. Sin registros SHALL
mostrar un estado vacío que explique cómo registrar desde la página de un artista.

#### Scenario: Agrupado por año

- **WHEN** un usuario tiene conciertos en 2024, 2019 y 2019-11-02
- **THEN** ve el grupo 2024 primero y luego 2019, con 2019-11-02 antes que el registro de solo año 2019

#### Scenario: Filtrar por artista

- **WHEN** el usuario llega desde "Lo viste 3 veces" en un artista
- **THEN** la página muestra solo esos 3 registros y un enlace para ver todos

#### Scenario: Registrar sin pasar por el artista

- **WHEN** el usuario pulsa "Registrar concierto", busca "Soda Stereo" y guarda con el año 2007
- **THEN** el registro aparece en el grupo 2007

#### Scenario: Sin sesión

- **WHEN** una persona sin sesión abre `/me/concerts`
- **THEN** se la lleva a iniciar sesión, como en las demás páginas personales

### Requirement: Conciertos en el perfil

El perfil de un usuario SHALL mostrar un riel **Conciertos** con hasta 6 registros visibles para el visitante, del más
reciente al más antiguo, y el total, con enlace a `/{locale}/users/{username}/concerts`, que SHALL mostrar los mismos
registros visibles agrupados por año, en modo lectura (sin editar ni quitar). La visibilidad SHALL seguir la misma
matriz que la colección física (bloqueos, perfil privado, relación de seguimiento y audiencia de cada registro). La
lectura ajena SHALL exponerse en `GET /api/users/{username}/concerts`, que SHALL responder una lista vacía si el
visitante no tiene permiso, sin revelar si hay registros, y `404` con `USER_NOT_FOUND` si el usuario no existe. Para un
visitante sin registros visibles el riel SHALL NOT mostrarse; para el dueño sin registros SHALL mostrar el estado vacío
propio de los rieles.

#### Scenario: Perfil público

- **WHEN** un visitante anónimo abre un perfil público con 2 conciertos `public` y 1 `followers`
- **THEN** el riel muestra 2 conciertos

#### Scenario: Seguidor

- **WHEN** un seguidor abre ese mismo perfil
- **THEN** el riel muestra los 3

#### Scenario: Bloqueo

- **WHEN** una persona bloqueada consulta `/api/users/{username}/concerts`
- **THEN** recibe una lista vacía

### Requirement: Conciertos en la exportación y la eliminación de la cuenta

La exportación de datos de la cuenta SHALL incluir todos los conciertos del usuario con todos sus campos. Eliminar la
cuenta SHALL borrar sus conciertos en cascada. Eliminar un artista del catálogo SHALL borrar en cascada los registros
que lo referencian.

#### Scenario: Exportación

- **WHEN** un usuario con 4 conciertos exporta sus datos
- **THEN** el archivo incluye los 4 con fecha, lugar, gira, enlace, nota y audiencia

#### Scenario: Cuenta eliminada

- **WHEN** un usuario elimina su cuenta
- **THEN** no queda ningún registro de concierto suyo

