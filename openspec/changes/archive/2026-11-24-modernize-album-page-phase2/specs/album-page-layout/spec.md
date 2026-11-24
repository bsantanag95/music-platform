## ADDED Requirements

### Requirement: Columna «En este disco» en Canciones

La pestaña Canciones SHALL mostrar junto a la lista de canciones (debajo de ella en viewports angostos) una columna «En este disco»
con, en este orden: la **formación** (los integrantes del artista principal acreditados en el disco, cada uno con sus roles de
intérprete traducidos y enlazado), la **producción** (productores primero, luego ingeniería y mezcla, hasta cuatro personas, con un
acceso a la pestaña Créditos) y las **ediciones** contadas por familia de formato (CD, vinilo, casete, digital, otros) con un acceso
«Ver las N ediciones» a la pestaña Ediciones. Cada bloque SHALL omitirse sin datos; el de ediciones SHALL mostrarse solo con más de una
edición, y una familia en 0 SHALL omitirse. Sin ningún bloque, la lista SHALL ocupar todo el ancho.

#### Scenario: Disco con formación, producción y ediciones

- **WHEN** una persona abre The Number of the Beast en escritorio
- **THEN** junto a la lista ve la formación (Bruce Dickinson, voz principal; Dave Murray, guitarra eléctrica; …), Martin Birch en
  producción y «CD 28 · Vinilo 15 …» con «Ver las 51 ediciones»

#### Scenario: Teléfono

- **WHEN** una persona abre el mismo disco en 390 px
- **THEN** la columna aparece debajo de la lista de canciones, sin desbordamiento horizontal

#### Scenario: Sin datos

- **WHEN** un disco no tiene créditos ni más de una edición
- **THEN** la lista de canciones ocupa todo el ancho y no hay columna
