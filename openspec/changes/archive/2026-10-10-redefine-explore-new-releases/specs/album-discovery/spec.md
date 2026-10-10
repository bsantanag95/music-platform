## MODIFIED Requirements

### Requirement: Novedades

La vista `/explore` SHALL incluir un riel de novedades con los release-groups de categoría
`studio` o `single_ep` cuya `first_release_date` (fecha completa, con precisión diaria) caiga
entre hoy menos `NEW_RELEASE_WINDOW_DAYS` días (90) y hoy, inclusive, ordenados por
`first_release_date` descendente y, ante empate, por `id`, acotado a `RAIL_SIZE` álbumes. El riel
SHALL excluir los álbumes sin `first_release_date` (solo año o mes conocidos), los de fecha
posterior a hoy y los sin carátula. El riel SHALL omitirse por completo cuando haya menos de
`MIN_ALBUMS_FOR_SECTION` álbumes elegibles. El riel de Novedades de la página de género NO SHALL
verse afectado por este requisito.

#### Scenario: Riel de novedades

- **WHEN** hay al menos `MIN_ALBUMS_FOR_SECTION` álbumes de estudio o single/EP con carátula lanzados en los
  últimos 90 días
- **THEN** `/explore` muestra un riel de novedades con los más recientes primero por fecha de lanzamiento,
  sin paginar

#### Scenario: Fuera de la ventana

- **WHEN** un álbum se lanzó hace 120 días
- **THEN** no aparece en el riel de novedades

#### Scenario: Lanzamiento futuro

- **WHEN** un álbum tiene `first_release_date` posterior a hoy
- **THEN** no aparece en el riel de novedades

#### Scenario: Fecha parcial

- **WHEN** un álbum solo tiene `first_release_year` (sin `first_release_date`)
- **THEN** no aparece en el riel de novedades

#### Scenario: Sin carátula

- **WHEN** un álbum reciente no tiene `cover_thumb_url`
- **THEN** no aparece en el riel de novedades

#### Scenario: Pocas novedades

- **WHEN** hay menos de `MIN_ALBUMS_FOR_SECTION` álbumes elegibles en la ventana
- **THEN** `/explore` no renderiza el riel de novedades ni un mensaje de vacío

#### Scenario: Orden dentro del mismo año

- **WHEN** dos álbumes de 2026 se lanzaron el 3 de mayo y el 20 de septiembre
- **THEN** el de septiembre aparece antes, sin importar cuál entró primero al catálogo
