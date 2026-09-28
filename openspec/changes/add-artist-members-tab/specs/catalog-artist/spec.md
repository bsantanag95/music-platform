## MODIFIED Requirements

### Requirement: Sección de integrantes y membresías

El perfil SHALL presentar los integrantes de un grupo en su pestaña Integrantes y los grupos de una persona en su pestaña Bandas (capability `artist-lineup-view`), y SHALL NOT combinar la discografía de los grupos asociados con la discografía de una persona.

#### Scenario: Perfil de grupo con integrantes

- **WHEN** se visita un perfil de tipo `group` con filas `membership`
- **THEN** la pestaña Integrantes muestra los integrantes enlazados y la discografía del grupo se mantiene

#### Scenario: Perfil de persona con membresías

- **WHEN** se visita un perfil de tipo `person` con grupos relacionados
- **THEN** la discografía muestra solo los discos de la persona y sus grupos aparecen en la pestaña Bandas, enlazados a sus páginas

### Requirement: Página de artista discografía-forward

La página de detalle de artista SHALL presentar la **discografía inmediatamente después de
la cabecera del artista**, como pestaña activa por defecto, antes de la pestaña de
integrantes o bandas y antes de cualquier área de opinión de la comunidad. El artista se
lee primero por su obra. Las acciones de catálogo (seguir, registrar escucha, marcar
favorito, Pendiente, agregar a lista, recorrido) SHALL ubicarse en el panel "Tu relación" de
la cabecera (capability `artist-personal-panel`), no en una columna de botones aparte.

#### Scenario: La discografía va primero

- **WHEN** una persona abre la página de un artista con discografía
- **THEN** ve la discografía justo debajo de la cabecera, como primera pestaña, y las notas
  de la comunidad después

#### Scenario: Artista sin discografía ingerida aún

- **WHEN** la discografía todavía se está resolviendo o está vacía
- **THEN** el resto de la página (cabecera, pestañas, notas) se compone sin un hueco
  roto donde iría la discografía
