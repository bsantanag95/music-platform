## MODIFIED Requirements

### Requirement: Zonas de la página de canción

La página de canción SHALL organizarse, de arriba hacia abajo, en: breadcrumb; cabecera con
la carátula del disco principal, el bloque de identidad (antetítulo, título, artistas), la
ficha técnica, el bloque de comunidad y el panel "Tu relación"; la tira de pistas; los
bloques Composición y Créditos de esta grabación; "Esta grabación aparece en"; "Otras
versiones de la canción"; y los comentarios. La página SHALL NOT tener pestañas. En
escritorio el panel "Tu relación" SHALL ocupar una columna lateral solo a la altura de la
cabecera, y el resto de las zonas SHALL usar el ancho completo. La carátula SHALL mostrarse
como máximo a 250 px de lado y, en móvil, a 96 px junto al bloque de identidad. Una zona sin
datos SHALL NOT renderizarse, salvo la cabecera, el panel y los comentarios.

#### Scenario: Escritorio

- **WHEN** una persona abre una canción en un viewport de escritorio
- **THEN** la cabecera muestra carátula, identidad, ficha y comunidad junto al panel "Tu
  relación", y debajo, a ancho completo, la tira de pistas, composición y créditos, los
  discos, las versiones y los comentarios

#### Scenario: Móvil

- **WHEN** una persona abre una canción en un viewport móvil
- **THEN** las zonas se apilan en este orden: carátula junto a la identidad, la ficha
  técnica, la franja de comunidad, el panel "Tu relación", la tira de pistas, composición,
  créditos, discos, versiones y comentarios, sin desbordamiento horizontal de la página

#### Scenario: Canción sin créditos ni versiones

- **WHEN** la grabación no tiene créditos de personal, autoría ni otras versiones
  registradas
- **THEN** la página no muestra esos bloques vacíos y los comentarios siguen al final
