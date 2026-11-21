## MODIFIED Requirements

### Requirement: Toolbar de exploración de listas

La vista `/lists` SHALL mostrar un toolbar de exploración, siempre visible, con búsqueda por texto,
filtro por tipo de entidad (`artist`, `release-group`, `recording`) presentado como un control segmentado (Todas · Álbumes ·
Artistas · Canciones) y orden (`popular` o `recent`). Cada segmento, el campo de búsqueda y el control de orden SHALL medir al
menos 44 px de alto. Desde `lg` los tres SHALL ir en una sola fila (búsqueda, segmentos y orden); por debajo, la búsqueda y el
orden SHALL compartir la primera fila y los segmentos SHALL ocupar una fila propia a todo el ancho, con los cuatro visibles sin
desplazar. El orden `popular` SHALL etiquetarse "Más guardadas" ("Most saved"), para no
confundirlo con la sección "Populares", que exige un mínimo de guardados. En la vitrina, el control de orden SHALL NOT
mostrar un valor elegido. El estado de los filtros SHALL vivir en la URL (`?q=&type=&sort=`) para ser enlazable y
sobrevivir a la recarga. La búsqueda por texto SHALL coincidir con el título y la descripción de la lista. La vista
SHALL ofrecer una acción para limpiar los filtros. Con filtros activos, la vista SHALL
mostrar el número de resultados y SHALL aplicar los filtros y el orden en el servidor sobre el
conjunto completo, no solo sobre la página ya cargada. Sin filtros, el toolbar SHALL existir pero
SHALL NOT modificar la composición por secciones. Un conjunto de resultados vacío SHALL mostrar un
estado "sin resultados" localizado, distinto del estado vacío global de la vitrina.

#### Scenario: Filtrar por texto y tipo

- **WHEN** una persona escribe texto y elige el chip de un tipo de entidad
- **THEN** la URL refleja `q` y `type`, el segmento queda marcado y la grilla muestra solo las listas públicas que coinciden

#### Scenario: Ordenar los resultados

- **WHEN** una persona elige el orden "Más guardadas"
- **THEN** la URL refleja `sort=popular` y la grilla ordena por conteo agregado de guardados
  descendente, dejando las listas sin guardados al final

#### Scenario: Sin resultados

- **WHEN** los filtros activos no coinciden con ninguna lista pública
- **THEN** la vista muestra un estado "sin resultados" localizado con la opción de limpiar filtros

#### Scenario: Filtros en el servidor

- **WHEN** hay filtros activos y la lista tiene más resultados que una página
- **THEN** paginar mantiene los filtros aplicados y trae resultados coherentes con el conjunto
  completo, no solo con la página ya cargada

#### Scenario: Tipos visibles en el teléfono

- **WHEN** se abre `/lists` a 390 px
- **THEN** los cuatro segmentos de tipo se ven completos en su propia fila, sin desplazamiento horizontal, cada uno de al menos
  44 px de alto, y la búsqueda y el orden comparten la fila de arriba
