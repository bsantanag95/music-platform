## MODIFIED Requirements

### Requirement: Lista de listas propias
El sistema SHALL permitir al usuario autenticado listar sus propias listas con paginación,
incluyendo por cada lista su título, descripción, tipo de entidad, audiencia, **cantidad de
ítems (`itemCount`) y las primeras carátulas disponibles de sus ítems (`coverThumbs`, hasta
un máximo fijo)** para la representación visual de la tarjeta. La respuesta SHALL aceptar
parámetros opcionales de **búsqueda por texto sobre el título de la lista (`q`), filtro por
tipo de entidad (`entityType`) y orden (`sort`, entre recencia y alfabético)**, combinables y
aplicados en el servidor sobre el conjunto completo de listas propias, no solo sobre la página
cargada. Las **listas fijadas** por el propietario SHALL aparecer primero, y dentro de cada
grupo (fijadas y no fijadas) el orden SHALL respetar el `sort` solicitado. Sin ningún
parámetro, el comportamiento SHALL ser equivalente al listado paginado por recencia previo,
ampliado con `itemCount` y `coverThumbs`. En `/me/lists`, la búsqueda, el tipo y el orden elegidos SHALL reflejarse
en la URL (`q`, `type`, `sort`, solo cuando difieren del valor por defecto y sin crear entradas de historial) y la página
SHALL abrirse con esos filtros; un valor inválido SHALL ignorarse. Cada acción de una tarjeta propia SHALL nombrar la
lista en su nombre accesible. La respuesta SHALL incluir `counts`, cuántas listas propias hay de cada tipo de entidad
contadas sin `q` ni `entityType`, que la página usa como cifras de los segmentos de tipo y como total de la pestaña.

#### Scenario: Listar listas propias
- **WHEN** un usuario autenticado abre su página de listas
- **THEN** ve sus listas paginadas, con las fijadas primero y el resto ordenado por la más
  reciente, cada una con su conteo de ítems y sus carátulas disponibles

#### Scenario: Sin listas
- **WHEN** un usuario sin listas abre su página de listas
- **THEN** ve un estado vacío localizado y no un error técnico

#### Scenario: Buscar entre las listas propias
- **WHEN** el usuario filtra sus listas con `q` coincidiendo parcialmente con el título de
  alguna
- **THEN** solo aparecen sus listas cuyo título coincide, sin distinguir mayúsculas ni acentos
  exactos, con paginación válida

#### Scenario: Filtrar y ordenar las listas propias
- **WHEN** el usuario filtra por `entityType=release-group` y pide `sort=alpha`
- **THEN** solo aparecen sus listas de álbumes, ordenadas alfabéticamente, con las fijadas
  primero

#### Scenario: Conteo y carátulas de una lista sin ítems
- **WHEN** una lista propia no tiene ítems
- **THEN** su `itemCount` es `0` y su `coverThumbs` es una colección vacía, sin error

#### Scenario: Parámetros inválidos
- **WHEN** el usuario envía un `entityType` o un `sort` fuera de los valores permitidos, o una
  paginación fuera de rango
- **THEN** la API responde `400` con código `VALIDATION_ERROR` y no ejecuta la lectura

#### Scenario: Filtros que sobreviven a la recarga
- **WHEN** el usuario busca "aor", elige Canciones y recarga la página
- **THEN** la URL lleva `?q=aor&type=recording` y la página abre con esos filtros aplicados

#### Scenario: Cifras por tipo sin filtros
- **WHEN** el usuario tiene 7 listas de álbumes, 4 de artistas y 3 de canciones y busca "aor"
- **THEN** la respuesta trae `counts` 7 / 4 / 3 y la pestaña "Mis listas" muestra 14

### Requirement: Sección de listas con sub-navegación
El sistema SHALL presentar `/<locale>/me/lists` como una sección con navegación interna de
dos pestañas —**Mis listas** y **Guardadas**, cada una con su total— accesibles por teclado con
semántica de `tablist`/`tab`/`tabpanel`, seguidas de un enlace "Descubrir en Comunidad" a `/lists`. La pestaña activa
SHALL reflejarse en la URL mediante un parámetro (`?tab=`) para poder enlazarse y para sobrevivir a una recarga; un valor
de pestaña ausente o inválido SHALL resolver a "Mis listas", y `?tab=discover` SHALL redirigir a `/lists`. El encabezado
de la sección SHALL mostrar título, descripción y la acción "Nueva lista", visible en las dos pestañas, que abre un
diálogo con el formulario de creación (`?new=1` lo abre al cargar). Los totales SHALL actualizarse al crear, borrar o
dejar de guardar una lista, sin recargar. Sin sesión, la ruta SHALL comportarse como el resto de `/me/*` (redirección a
inicio de sesión).

#### Scenario: Abrir la sección sin parámetro de pestaña
- **WHEN** un usuario autenticado abre `/me/lists` sin `?tab=`
- **THEN** ve la pestaña "Mis listas" activa, "Guardadas" disponible y el enlace a Comunidad

#### Scenario: Enlace directo a una pestaña
- **WHEN** el usuario abre `/me/lists?tab=saved`
- **THEN** ve la pestaña "Guardadas" activa, y al recargar sigue en esa pestaña

#### Scenario: Valor de pestaña inválido
- **WHEN** el usuario abre `/me/lists?tab=cualquier-cosa`
- **THEN** ve la pestaña "Mis listas" activa, sin error

#### Scenario: Navegación entre pestañas por teclado
- **WHEN** el usuario tiene el foco en la lista de pestañas y usa las flechas
- **THEN** el foco se mueve entre pestañas y activa la enfocada, según el patrón `tablist`

#### Scenario: Descubrir redirige a Comunidad
- **WHEN** el usuario abre `/me/lists?tab=discover`
- **THEN** llega a `/lists`

#### Scenario: Nueva lista desde Guardadas
- **WHEN** el usuario está en "Guardadas", pulsa "Nueva lista" y crea "Discos de 2026"
- **THEN** el diálogo se cierra, pasa a "Mis listas", ve la lista nueva y el total de la pestaña sube en uno
