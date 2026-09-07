## MODIFIED Requirements

### Requirement: Discografía agrupada

La aplicación SHALL mostrar los grupos de lanzamiento agrupados y etiquetados por las
categorías `studio`, `single_ep`, `compilation` y `live_other`, manteniendo el título
original de cada grupo. Dentro de cada categoría, las tarjetas SHALL ordenarse por el año
de lanzamiento canónico del `release_group` (`first_release_year`) de forma ascendente; los
grupos sin año conocido SHALL ordenarse al final de su categoría, con un orden estable
entre ellos. Cada tarjeta SHALL mostrar ese año cuando exista.

#### Scenario: Categorías con contenido

- **WHEN** el artista tiene grupos de lanzamiento en una o más categorías
- **THEN** cada grupo aparece bajo la sección traducida correspondiente, ordenado por año
  ascendente dentro de la sección, y cada tarjeta conserva su título sin traducir y
  muestra su año cuando se conoce

#### Scenario: Grupo sin año conocido

- **WHEN** un grupo de lanzamiento no tiene `first_release_year`
- **THEN** su tarjeta se muestra sin año y se ordena después de los grupos con año dentro
  de su categoría, sin romper el layout

#### Scenario: Categoría vacía

- **WHEN** el artista no tiene grupos de lanzamiento en una categoría
- **THEN** esa categoría no muestra una sección vacía ni rompe el layout del perfil
