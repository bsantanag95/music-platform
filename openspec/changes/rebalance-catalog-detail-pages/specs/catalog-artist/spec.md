## ADDED Requirements

### Requirement: Página de artista discografía-forward

La página de detalle de artista SHALL presentar la **discografía agrupada inmediatamente
después del encabezado del artista**, antes de la sección de integrantes/membresías y antes
de cualquier área de opinión de la comunidad. El artista se lee primero por su obra. Las
acciones de catálogo (registrar escucha, marcar favorito, agregar a lista) SHALL ubicarse
junto a la discografía o inmediatamente después de ella, no por encima.

#### Scenario: La discografía va primero

- **WHEN** una persona abre la página de un artista con discografía
- **THEN** ve la discografía agrupada justo debajo del encabezado, antes de las membresías
  y de las notas de la comunidad

#### Scenario: Artista sin discografía ingerida aún

- **WHEN** la discografía todavía se está resolviendo o está vacía
- **THEN** el resto de la página (encabezado, membresías, notas) se compone sin un hueco
  roto donde iría la discografía

### Requirement: Opinión sobre el artista como nota, sin rating

La página de artista SHALL NOT ofrecer un control de **rating de estrellas** ni mostrar un
**agregado de estrellas** para el artista. El área de comunidad del artista SHALL limitarse
a notas conversacionales cortas (comentarios), presentadas con encabezado y texto de ayuda
de "nota / contexto / empezá por aquí" — no como reseña ni veredicto. El modelo de datos
SHALL seguir aceptando ratings de artista (no se elimina la capacidad ni los datos
existentes); solo la página deja de exponerlos.

#### Scenario: No hay estrellas en la página de artista

- **WHEN** un usuario autenticado abre la página de un artista
- **THEN** puede dejar una nota corta, pero no encuentra un control de estrellas ni un
  promedio de estrellas del artista

#### Scenario: Un rating de artista anterior no se pierde

- **WHEN** existe en la base un rating de artista creado antes de este cambio
- **THEN** ese dato se conserva intacto aunque la página ya no lo muestre

#### Scenario: Las notas se leen como contexto

- **WHEN** un artista tiene notas de la comunidad
- **THEN** se presentan como notas cortas de contexto ("empezá por aquí"), diferenciadas de
  una reseña con rating
