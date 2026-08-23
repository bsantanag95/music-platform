# favorites Specification

## Purpose

Señal de interés liviana de Fase 5: marca simple (toggle) sobre artista, álbum (release
group) o canción (recording), sin escala numérica, con audiencia propia e independiente de
escucha, rating y comentario. Incluye superficie propia, vista pública en perfiles y la
acción contextual en las páginas de catálogo.

## ADDED Requirements

### Requirement: Marcar y desmarcar un favorito
El sistema SHALL permitir a un usuario autenticado marcar o quitar un favorito sobre un
artista, un álbum o una canción de forma idempotente. Marcar un objetivo que ya es favorito
SHALL NOT producir un error ni duplicar la marca; quitar un favorito que no existe SHALL
también ser idempotente. Un usuario SHALL tener a lo sumo un favorito por objetivo.

#### Scenario: Marcar un favorito
- **WHEN** un usuario autenticado marca como favorito un artista, álbum o canción válido
- **THEN** el sistema crea el favorito y lo refleja en la superficie propia

#### Scenario: Marcar un objetivo ya favorito
- **WHEN** el usuario marca un objetivo que ya tenía como favorito
- **THEN** la operación es idempotente, no crea duplicados y responde con el favorito existente

#### Scenario: Quitar un favorito
- **WHEN** el usuario quita el favorito de un objetivo que tenía marcado
- **THEN** el favorito se elimina y desaparece de la superficie propia

#### Scenario: Quitar un favorito inexistente
- **WHEN** el usuario quita el favorito de un objetivo que no tenía marcado
- **THEN** la operación es idempotente y no produce error

#### Scenario: Objetivo inválido o inexistente
- **WHEN** el sistema recibe un favorito cuyo objetivo no existe o no es uno de los tres tipos
  permitidos
- **THEN** la API responde un error de validación y no crea ni modifica ningún favorito

#### Scenario: Sesión requerida
- **WHEN** una request sin sesión intenta marcar o quitar un favorito
- **THEN** la API responde `401` con código `AUTH_REQUIRED` y no modifica ningún favorito

### Requirement: Audiencia del favorito
El sistema SHALL permitir configurar la audiencia de cada favorito entre `private`,
`followers` y `public`. Un favorito nuevo SHALL usar `followers` por defecto y el usuario
SHALL poder cambiarla después de publicarlo. Un favorito de `audience` `private` SHALL ser
visible solo para su dueño.

#### Scenario: Audiencia por defecto
- **WHEN** un usuario crea un favorito sin especificar audiencia
- **THEN** el favorito queda con audiencia `followers`

#### Scenario: Cambiar la audiencia de un favorito propio
- **WHEN** el usuario cambia la audiencia de un favorito propio a `public`
- **THEN** el favorito queda público y visible en las superficies que lo permitan

#### Scenario: Favorito privado
- **WHEN** el usuario consulta un favorito de audiencia `private` que no es suyo
- **THEN** ese favorito no aparece en ninguna superficie ajena

### Requirement: Lista de favoritos propios
El sistema SHALL permitir al usuario autenticado listar sus propios favoritos en orden
cronológico descendente con paginación, incluyendo el objetivo y la audiencia de cada uno.

#### Scenario: Listar favoritos propios
- **WHEN** un usuario autenticado abre su página de favoritos
- **THEN** ve sus favoritos ordenados del más reciente al más antiguo, paginados

#### Scenario: Sin favoritos
- **WHEN** un usuario sin favoritos abre su página de favoritos
- **THEN** ve un estado vacío localizado y no un error técnico

### Requirement: Favoritos ajenos en el perfil
El sistema SHALL exponer la lectura paginada de los favoritos de un usuario por `username`,
filtrando por la matriz de visibilidad existente (bloqueos, perfil privado y relación de
seguimiento). Si el visitante no tiene permiso, la respuesta SHALL ser una lista vacía y SHALL
NOT revelar si el usuario tiene favoritos. Si el `username` no existe, la respuesta SHALL ser
`404` con código `USER_NOT_FOUND`.

#### Scenario: Favoritos visibles de un perfil público
- **WHEN** un visitante consulta los favoritos de un perfil público
- **THEN** recibe únicamente los favoritos de audiencia `public`

#### Scenario: Seguidor aprobado de un perfil
- **WHEN** un seguidor aprobado consulta los favoritos de un perfil
- **THEN** recibe los favoritos de audiencia `public` y `followers`

#### Scenario: Perfil privado sin relación aprobada
- **WHEN** un visitante sin relación aprobada consulta los favoritos de un perfil privado
- **THEN** recibe una lista vacía sin indicar si el usuario tiene favoritos

#### Scenario: Bloqueo en cualquier dirección
- **WHEN** el visitante bloqueó al dueño o fue bloqueado por él
- **THEN** el visitante no ve ningún favorito del dueño

#### Scenario: Usuario inexistente
- **WHEN** se consultan los favoritos de un `username` que no existe
- **THEN** la API responde `404` con código `USER_NOT_FOUND`

#### Scenario: Paginación inválida
- **WHEN** se envía una paginación fuera de rango
- **THEN** la API responde `400` con código `VALIDATION_ERROR` y no ejecuta la lectura

### Requirement: Acción de favorito en las páginas de catálogo
El sistema SHALL ofrecer en las páginas de artista, álbum y canción una acción autenticada
para marcar o quitar el favorito, con estados de carga, éxito, error y sesión requerida, y que
SHALL NOT bloquear la carga del contenido musical.

#### Scenario: Acción sin sesión
- **WHEN** un visitante no autenticado pulsa marcar como favorito en una página de catálogo
- **THEN** se le solicita iniciar sesión y no se crea ningún favorito

#### Scenario: Alternar el favorito
- **WHEN** un usuario autenticado pulsa el botón de favorito en una página de catálogo
- **THEN** el favorito se marca o se quita y el estado de la UI se actualiza con confirmación
  accesible

### Requirement: Independencia del favorito
El sistema SHALL tratar el favorito como una señal independiente: marcarlo o quitarlo SHALL
NOT crear, modificar ni eliminar escuchas, ratings ni comentarios del mismo objetivo.

#### Scenario: Favorito sin efectos colaterales
- **WHEN** un usuario marca como favorito un objetivo que ya valoró y escuchó
- **THEN** la escucha, el rating y los comentarios existentes no cambian