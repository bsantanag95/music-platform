## MODIFIED Requirements

### Requirement: Zonas de la página de artista

La página de artista SHALL organizarse, de arriba hacia abajo, en: breadcrumb; cabecera con
la foto, la identidad (antetítulo de tipo, nombre, descripción), la ficha, el
resumen de la biografía, el bloque de comunidad y el panel "Tu relación"; la barra de
pestañas; el contenido de la pestaña activa; y las notas de la comunidad. Los integrantes o
grupos SHALL mostrarse en su pestaña (capability `artist-lineup-view`), no debajo de las
pestañas. En escritorio el panel "Tu relación" SHALL ocupar una columna lateral solo a
la altura de la cabecera, de modo que las pestañas y su contenido usen el ancho completo.

#### Scenario: Escritorio

- **WHEN** una persona abre un artista en un viewport de escritorio
- **THEN** la cabecera muestra foto, identidad, ficha y resumen junto al panel
  "Tu relación", y la discografía ocupa el ancho completo bajo las pestañas

#### Scenario: Móvil

- **WHEN** una persona abre un artista en un viewport móvil
- **THEN** las zonas se apilan en este orden: foto chica junto al tipo, el nombre y la
  descripción; ficha; resumen de la biografía; panel "Tu relación"; bloque de
  comunidad; pestañas; contenido de la pestaña; notas, sin desbordamiento horizontal de la
  página

### Requirement: Pestañas del artista

La página SHALL ofrecer las pestañas Discografía, Integrantes (grupos) o Bandas (personas) y
Biografía, en ese orden. Discografía SHALL ser la pestaña activa al llegar a la página sin
pestaña explícita. La pestaña Integrantes o Bandas SHALL ocultarse cuando no hay nada que
listar (capability `artist-lineup-view`). La pestaña Biografía SHALL ocultarse cuando el
artista no tiene resumen de Wikipedia en ningún idioma, y su URL directa SHALL responder 404 en
ese caso.

#### Scenario: Llegada a la página

- **WHEN** una persona abre `/{locale}/artist/{id}`
- **THEN** la pestaña activa es Discografía

#### Scenario: Artista sin biografía

- **WHEN** un artista no tiene resumen de Wikipedia
- **THEN** la barra de pestañas no muestra Biografía y `/{locale}/artist/{id}/biography`
  responde 404

#### Scenario: Grupo con integrantes

- **WHEN** una persona abre un grupo con integrantes y resumen de Wikipedia
- **THEN** la barra muestra Discografía · Integrantes · Biografía

#### Scenario: Persona con bandas

- **WHEN** una persona abre a un solista que es integrante de un grupo
- **THEN** la barra muestra Bandas entre Discografía y Biografía

## REMOVED Requirements

### Requirement: Integrantes y notas fuera de las pestañas

**Reason**: los integrantes y los grupos pasan a su propia pestaña (Integrantes o Bandas), con
sub-vistas y otras afiliaciones, en lugar de una lista debajo de cualquier pestaña.

**Migration**: la lista se reemplaza por la capability `artist-lineup-view`; las notas de la
comunidad siguen al final de la página según el requirement "Notas de la comunidad al final".

## ADDED Requirements

### Requirement: Notas de la comunidad al final

Las notas de la comunidad SHALL mostrarse al final de la página, después del contenido de la
pestaña, con cualquier pestaña activa.

#### Scenario: Notas con la pestaña Integrantes activa

- **WHEN** la pestaña activa es Integrantes
- **THEN** las notas de la comunidad se ven debajo de la alineación
