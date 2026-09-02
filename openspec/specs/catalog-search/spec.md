# catalog-search

Búsqueda pública de artistas en el catálogo navegable.

## Requirements

### Requirement: Búsqueda pública de artistas
La aplicación SHALL permitir que una persona busque un artista por nombre desde `/buscar` y SHALL invocar el cliente `searchCatalog` únicamente cuando la entrada contenga texto no vacío después de quitar espacios extremos.

#### Scenario: Búsqueda válida
- **WHEN** la persona introduce `Pink Floyd` y envía el formulario
- **THEN** la aplicación invoca `searchCatalog` con el nombre normalizado

#### Scenario: Entrada vacía
- **WHEN** la persona envía el formulario sin texto o únicamente con espacios
- **THEN** la aplicación no realiza ninguna solicitud y muestra validación local

### Requirement: Navegación al artista encontrado
Cuando la búsqueda devuelve un artista válido, la aplicación SHALL navegar a `/artista/<artist.id>` usando el UUID propio devuelto por la API.

#### Scenario: Artista encontrado
- **WHEN** `searchCatalog` devuelve un artista con `id` válido
- **THEN** la aplicación redirige al perfil correspondiente sin requerir que la persona escriba la URL

### Requirement: Estados de búsqueda
La interfaz SHALL mostrar un estado de carga mientras la búsqueda está pendiente y SHALL deshabilitar el envío durante esa operación. SHALL mostrar un mensaje neutro de consulta durante la carga y SHALL mostrar el aviso de primera importación únicamente cuando la solicitud supere el umbral de duración definido (~3s).

#### Scenario: Búsqueda en progreso
- **WHEN** la solicitud todavía no terminó
- **THEN** el botón de búsqueda queda deshabilitado y la interfaz muestra un mensaje contextual de carga neutro, sin afirmar que ocurre una primera importación

#### Scenario: Búsqueda lenta por primera importación
- **WHEN** la solicitud supera el umbral de duración (~3s) sin terminar
- **THEN** la interfaz muestra además el aviso de que puede tratarse de una primera importación

#### Scenario: Artista ya cacheado
- **WHEN** la solicitud termina antes de superar el umbral de duración
- **THEN** nunca se muestra el aviso de primera importación

### Requirement: Resultado inexistente
La interfaz SHALL tratar `ARTIST_NOT_FOUND` como un estado vacío y SHALL mostrar un mensaje propio del frontend, sin exponer directamente el texto de error del backend.

#### Scenario: Artista inexistente
- **WHEN** `searchCatalog` falla con `ARTIST_NOT_FOUND`
- **THEN** se muestra un estado vacío indicando que no se encontró el artista y no se ofrece un error técnico genérico

### Requirement: Error recuperable
La interfaz SHALL mostrar un estado de error recuperable para `INTERNAL_ERROR` y otros fallos inesperados, con una acción para reintentar la búsqueda.

#### Scenario: Fallo del servicio
- **WHEN** `searchCatalog` falla con `INTERNAL_ERROR`
- **THEN** se muestra un estado de error con un mensaje propio y una acción de reintento

### Requirement: Accesibilidad del formulario
El formulario SHALL exponer un label asociado al campo, estados de error mediante atributos ARIA y feedback de carga o resultado que pueda ser percibido por tecnologías asistivas.

#### Scenario: Campo etiquetado
- **WHEN** una persona navega el formulario con teclado o lector de pantalla
- **THEN** el campo de búsqueda tiene un label asociado y el mensaje de validación se relaciona con él

### Requirement: Autoejecución de búsqueda a partir de un query param

`/search` SHALL leer un parámetro de consulta `q` opcional en la URL y, si está presente y no
vacío tras normalizarlo, SHALL pasarlo como valor inicial a `SearchForm`. `SearchForm` SHALL
autoejecutar la búsqueda con ese valor una única vez al montar, reusando la misma lógica que
un envío manual del formulario (mismos estados de carga, aviso de importación lenta, no
encontrado y error). Si el parámetro `q` está ausente o vacío, `SearchForm` SHALL comportarse
como hasta ahora, sin autoejecutar ninguna búsqueda.

#### Scenario: Llega con una consulta en la URL
- **WHEN** una persona abre `/search?q=Radiohead`
- **THEN** `SearchForm` inicia con el campo prellenado con "Radiohead" y ejecuta la búsqueda
  automáticamente, sin requerir que la persona vuelva a enviar el formulario

#### Scenario: Autoejecución única
- **WHEN** `SearchForm` ya autoejecutó la búsqueda inicial a partir de `q`
- **THEN** no vuelve a autoejecutarla en renders posteriores del mismo montaje

#### Scenario: Sin consulta en la URL
- **WHEN** una persona abre `/search` sin parámetro `q`
- **THEN** `SearchForm` se comporta igual que antes de este cambio: campo vacío, sin
  autoejecutar ninguna búsqueda
