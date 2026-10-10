## ADDED Requirements

### Requirement: Próximos lanzamientos

La vista `/explore` SHALL incluir, inmediatamente después del riel de Novedades, un riel de próximos
lanzamientos con los release-groups de categoría `studio` o `single_ep` cuya `first_release_date` (fecha
completa) sea posterior a hoy y no pase de hoy más `UPCOMING_WINDOW_DAYS` días (180), ordenados por
`first_release_date` ascendente y, ante empate, por `id`, acotado a `RAIL_SIZE` álbumes. El riel SHALL excluir
los álbumes sin `first_release_date`, los de fecha igual o anterior a hoy y los sin carátula, SHALL NOT ordenar
por popularidad ni limitar por artista o familia de géneros, y SHALL omitirse por completo cuando haya menos de
`MIN_ALBUMS_FOR_SECTION` álbumes elegibles. Cada tarjeta SHALL mostrar la fecha de lanzamiento (día y mes) en
lugar del año. El riel SHALL ser igual para todas las personas y SHALL ofrecer "Ver todo →" hacia el listado
completo.

#### Scenario: Riel de próximos lanzamientos

- **WHEN** hay al menos `MIN_ALBUMS_FOR_SECTION` álbumes de estudio o single/EP con carátula que salen en los
  próximos 180 días
- **THEN** `/explore` muestra, bajo Novedades, un riel con los más cercanos primero y la fecha en cada tarjeta

#### Scenario: Lo de hoy no es un próximo lanzamiento

- **WHEN** un álbum tiene `first_release_date` igual a hoy
- **THEN** aparece en Novedades y no en Próximos lanzamientos

#### Scenario: Fuera de la ventana

- **WHEN** un álbum sale dentro de 200 días
- **THEN** no aparece en el riel de próximos lanzamientos

#### Scenario: Fecha parcial o sin carátula

- **WHEN** un álbum futuro solo tiene `first_release_year`, o no tiene `cover_thumb_url`
- **THEN** no aparece en el riel de próximos lanzamientos

#### Scenario: Pocos próximos lanzamientos

- **WHEN** hay menos de `MIN_ALBUMS_FOR_SECTION` álbumes elegibles
- **THEN** `/explore` no renderiza el riel ni un mensaje de vacío

#### Scenario: Sin recorte por artista

- **WHEN** un artista tiene dos lanzamientos futuros dentro de la ventana
- **THEN** ambos pueden aparecer en el riel

### Requirement: Listado completo de próximos lanzamientos

`/explore?proximos=1` SHALL mostrar el listado completo y paginado (`FILTERED_PAGE_SIZE`) de los álbumes que
cumplen las condiciones del riel de próximos lanzamientos, en orden cronológico ascendente por
`first_release_date` y `id`, con la fecha de lanzamiento en cada tarjeta. SHALL permitir filtrar por tipo
(`tipo=`) y paginar (`page=`), SHALL NOT ofrecer selector de orden, y SHALL NOT aplicar el umbral
`MIN_ALBUMS_FOR_SECTION`. Sin resultados SHALL mostrar el estado vacío del listado. El corte SHALL tener menor
prioridad que década, familia y género cuando se combinan en la URL.

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
