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
La interfaz SHALL mostrar un estado de carga mientras la búsqueda está pendiente, SHALL deshabilitar el envío durante esa operación y SHALL comunicar que una primera importación puede tardar.

#### Scenario: Búsqueda en progreso
- **WHEN** la solicitud todavía no terminó
- **THEN** el botón de búsqueda queda deshabilitado y la interfaz muestra un mensaje contextual de carga

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
