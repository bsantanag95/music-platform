## RENAMED Requirements

- FROM: `### Requirement: Opinión sobre el artista como nota, sin rating`
- TO: `### Requirement: Opinión sobre el artista como comentarios con tema, sin rating`

## MODIFIED Requirements

### Requirement: Opinión sobre el artista como comentarios con tema, sin rating

La página de artista SHALL NOT ofrecer un control de **rating de estrellas** ni mostrar un
**agregado de estrellas** para el artista. El área de comunidad del artista SHALL limitarse
a comentarios conversacionales cortos organizados por tema (capability `artist-comment-topics`),
presentados bajo el encabezado "Comentarios" — no como reseña ni veredicto. El modelo de datos
SHALL seguir aceptando ratings de artista (no se elimina la capacidad ni los datos
existentes); solo la página deja de exponerlos.

#### Scenario: No hay estrellas en la página de artista

- **WHEN** un usuario autenticado abre la página de un artista
- **THEN** puede dejar un comentario corto, pero no encuentra un control de estrellas ni un
  promedio de estrellas del artista

#### Scenario: Un rating de artista anterior no se pierde

- **WHEN** existe en la base un rating de artista creado antes de este cambio
- **THEN** ese dato se conserva intacto aunque la página ya no lo muestre

#### Scenario: Los comentarios se leen por tema

- **WHEN** un artista tiene comentarios de la comunidad
- **THEN** se presentan como comentarios cortos con su tema ("Para empezar", "Álbumes",
  "Canciones" o "General"), diferenciados de una reseña con rating

### Requirement: Página de artista discografía-forward

La página de detalle de artista SHALL presentar la **discografía inmediatamente después de
la cabecera del artista**, como pestaña activa por defecto, antes de la pestaña de
integrantes o bandas y antes de cualquier área de opinión de la comunidad. El artista se
lee primero por su obra. Las acciones de catálogo (seguir, registrar escucha, marcar
favorito, Pendiente, agregar a lista, recorrido) SHALL ubicarse en el panel "Tu relación" de
la cabecera (capability `artist-personal-panel`), no en una columna de botones aparte.

#### Scenario: La discografía va primero

- **WHEN** una persona abre la página de un artista con discografía
- **THEN** ve la discografía justo debajo de la cabecera, como primera pestaña, y los comentarios
  de la comunidad después

#### Scenario: Artista sin discografía ingerida aún

- **WHEN** la discografía todavía se está resolviendo o está vacía
- **THEN** el resto de la página (cabecera, pestañas, comentarios) se compone sin un hueco
  roto donde iría la discografía
