# artist-page-layout Specification

## Purpose
Organizar la página de artista como ficha de biblioteca y biografía: cabecera, pestañas enlazables Discografía, Integrantes o Bandas y Biografía, y comentarios de la comunidad al final, con su orden en móvil.
## Requirements
### Requirement: Zonas de la página de artista

La página de artista SHALL organizarse, de arriba hacia abajo, en: la portada a todo el ancho con la miga de pan y Compartir, el
retrato, la identidad (nombre y descripción), la ficha y, sin sesión, el botón «Seguir a {artista}»; con sesión, el panel «Tu
relación» en una franja a todo el ancho del contenido justo debajo de la portada; la barra de pestañas; el contenido de la pestaña
activa; y los comentarios de la comunidad. El contenido SHALL usar el mismo ancho máximo que el resto del sitio (88rem). Los
integrantes o grupos SHALL mostrarse en su pestaña (capability `artist-lineup-view`), no debajo de las pestañas. La portada SHALL
NOT estirarse por el alto del panel.

#### Scenario: Escritorio

- **WHEN** una persona abre un artista en un viewport de escritorio
- **THEN** la portada muestra retrato, identidad y ficha (y «Seguir a {artista}» sin sesión), y la discografía ocupa el ancho
  completo bajo las pestañas

#### Scenario: Móvil

- **WHEN** una persona abre un artista en un viewport móvil
- **THEN** las zonas se apilan en este orden: retrato; nombre y descripción; ficha; acción principal o panel; pestañas; contenido
  de la pestaña; comentarios, sin desbordamiento horizontal de la página

#### Scenario: Con sesión

- **WHEN** un usuario autenticado abre un artista en escritorio
- **THEN** el nombre queda a la altura de siempre de la portada y el panel «Tu relación» aparece debajo de ella, antes de las
  pestañas

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

### Requirement: Pestañas enlazables

Cada pestaña SHALL tener una URL propia locale-aware, de modo que abrir esa URL muestre la
página con la pestaña activa, que el historial del navegador recorra los cambios de pestaña
y que el contenido se entregue renderizado desde el servidor. Cambiar de pestaña SHALL NOT
volver a sincronizar la discografía ni recargar la cabecera.

#### Scenario: Enlace directo a Biografía

- **WHEN** una persona abre la URL de la pestaña Biografía de un artista
- **THEN** la página se muestra con la pestaña Biografía activa y la cabecera completa

#### Scenario: Botón atrás

- **WHEN** una persona pasa de Discografía a Biografía y pulsa "atrás"
- **THEN** vuelve a la pestaña Discografía del mismo artista

### Requirement: Comentarios de la comunidad al final

Los comentarios de la comunidad (capability `artist-comment-topics`) SHALL mostrarse al final de
la página, después del contenido de la pestaña, con cualquier pestaña activa.

#### Scenario: Comentarios con la pestaña Integrantes activa

- **WHEN** la pestaña activa es Integrantes
- **THEN** los comentarios de la comunidad se ven debajo de la alineación

### Requirement: Pestañas fijas

La barra de pestañas del artista SHALL quedar fija bajo el encabezado del sitio al bajar por la página, con fondo opaco,
en cualquier viewport, de modo que se pueda cambiar de pestaña sin volver arriba. El ancla de las pestañas SHALL quedar
debajo del encabezado al llevarla a la vista.

#### Scenario: Cambiar de pestaña desde abajo

- **WHEN** una persona está a mitad de la discografía
- **THEN** ve la barra Discografía · Integrantes · Biografía arriba y puede cambiar de pestaña sin desplazarse

### Requirement: Pestaña Premios en la barra

La barra de pestañas del artista SHALL incluir **Premios** después de Biografía cuando el artista tiene alguna
nominación (capability `artist-awards-tab`), con su propia URL y el mismo comportamiento que las demás pestañas.

#### Scenario: Orden de las pestañas

- **WHEN** una persona abre un grupo con integrantes, biografía y premios
- **THEN** las pestañas son Discografía · Integrantes · Biografía · Premios

### Requirement: Pestaña Conciertos en la barra

La barra de pestañas del artista SHALL incluir **Conciertos** como última pestaña (después de Biografía y Premios) cuando
el artista es un grupo o una persona (capability `shared-concerts`), con su propia URL y el mismo comportamiento que las
demás pestañas. Mostrar la barra SHALL NOT consultar MusicBrainz.

#### Scenario: Orden de las pestañas

- **WHEN** una persona abre un grupo con integrantes, biografía y premios
- **THEN** las pestañas son Discografía · Integrantes · Biografía · Premios · Conciertos

#### Scenario: Artista de tipo varios

- **WHEN** una persona abre "Various Artists"
- **THEN** la barra no muestra Conciertos

