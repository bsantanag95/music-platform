## MODIFIED Requirements

### Requirement: Novedades

La vista `/explore` SHALL incluir un riel de novedades con los release-groups de categoría
`studio` o `single_ep` cuya `first_release_date` (fecha completa, con precisión diaria) caiga
entre hoy menos `NEW_RELEASE_WINDOW_DAYS` días (90) y hoy, inclusive, ordenados por
`first_release_date` descendente y, ante empate, por `id`, acotado a `RAIL_SIZE` álbumes. El riel
SHALL excluir los álbumes sin `first_release_date` (solo año o mes conocidos), los de fecha
posterior a hoy y los sin carátula. El riel SHALL omitirse por completo cuando haya menos de
`MIN_ALBUMS_FOR_SECTION` álbumes elegibles. Cada tarjeta SHALL mostrar la fecha de lanzamiento (día y
mes) en lugar del año, y el riel SHALL ofrecer "Ver todo →" hacia el listado completo de novedades. El riel
de Novedades de la página de género NO SHALL verse afectado por este requisito.

#### Scenario: Riel de novedades

- **WHEN** hay al menos `MIN_ALBUMS_FOR_SECTION` álbumes de estudio o single/EP con carátula lanzados en los
  últimos 90 días
- **THEN** `/explore` muestra un riel de novedades con los más recientes primero por fecha de lanzamiento, con
  la fecha en cada tarjeta y un enlace "Ver todo →" a `/explore?novedades=1`

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

### Requirement: Listado completo de próximos lanzamientos

`/explore?proximos=1` SHALL mostrar el listado completo y paginado (`FILTERED_PAGE_SIZE`) de los álbumes que
cumplen las condiciones del riel de próximos lanzamientos, en orden cronológico ascendente por
`first_release_date` y `id`, con la fecha de lanzamiento en cada tarjeta. SHALL permitir filtrar por tipo
(`tipo=`) y paginar (`page=`), SHALL NOT ofrecer selector de orden, y SHALL NOT aplicar el umbral
`MIN_ALBUMS_FOR_SECTION`. SHALL ofrecer cortes hermanos para saltar al listado de novedades. Sin resultados
SHALL mostrar el estado vacío del listado. El corte SHALL tener menor prioridad que década, familia y género, y
mayor que el de novedades, cuando se combinan en la URL.

#### Scenario: Listado completo

- **WHEN** una persona abre `/explore?proximos=1` y hay 30 álbumes futuros elegibles
- **THEN** ve 24 en orden cronológico y un enlace a la página siguiente con los 6 restantes

#### Scenario: Filtro por tipo

- **WHEN** abre `/explore?proximos=1&tipo=studio`
- **THEN** ve solo álbumes de estudio, sin selector de orden

#### Scenario: Pocos resultados

- **WHEN** solo hay 2 álbumes futuros elegibles
- **THEN** el listado los muestra igual, aunque el riel de la portada esté omitido

#### Scenario: Sin resultados

- **WHEN** no hay álbumes futuros elegibles
- **THEN** el listado muestra el estado vacío

#### Scenario: Salto al listado de novedades

- **WHEN** una persona está en `/explore?proximos=1&tipo=studio`
- **THEN** ve los cortes hermanos "Novedades" y "Próximos lanzamientos" con el segundo marcado, y el enlace a
  Novedades conserva el tipo y vuelve a la página 1

## ADDED Requirements

### Requirement: Listado completo de novedades

`/explore?novedades=1` SHALL mostrar el listado completo y paginado (`FILTERED_PAGE_SIZE`) de los álbumes que
cumplen las condiciones del riel de novedades (misma ventana de `NEW_RELEASE_WINDOW_DAYS`), en orden
cronológico descendente por `first_release_date` y `id`, con la fecha de lanzamiento en cada tarjeta. SHALL
permitir filtrar por tipo (`tipo=`) y paginar (`page=`), SHALL NOT ofrecer selector de orden, SHALL NOT aplicar
el umbral `MIN_ALBUMS_FOR_SECTION` y SHALL ofrecer cortes hermanos para saltar al listado de próximos
lanzamientos. Sin resultados SHALL mostrar el estado vacío del listado. El corte SHALL tener menor prioridad que
década, familia, género y próximos lanzamientos cuando se combinan en la URL.

#### Scenario: Listado completo

- **WHEN** una persona abre `/explore?novedades=1` y hay 40 álbumes elegibles en los últimos 90 días
- **THEN** ve 24 con el más reciente primero y un enlace a la página siguiente con los 16 restantes

#### Scenario: Filtro por tipo

- **WHEN** abre `/explore?novedades=1&tipo=single_ep`
- **THEN** ve solo singles y EPs, sin selector de orden

#### Scenario: Pocas novedades

- **WHEN** solo hay 3 álbumes elegibles
- **THEN** el listado los muestra igual, aunque el riel de la portada esté omitido

#### Scenario: Sin resultados

- **WHEN** no hay álbumes elegibles en la ventana
- **THEN** el listado muestra el estado vacío

#### Scenario: Salto al listado de próximos lanzamientos

- **WHEN** una persona está en `/explore?novedades=1`
- **THEN** ve los cortes hermanos "Novedades" y "Próximos lanzamientos" con el primero marcado

#### Scenario: Prioridad entre cortes

- **WHEN** la URL trae `novedades=1` y `proximos=1`
- **THEN** se muestra el listado de próximos lanzamientos
