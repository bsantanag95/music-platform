## MODIFIED Requirements

### Requirement: Colecciones destacadas

La vista `/explore` SHALL mostrar las listas públicas de álbumes que tienen una fila **vigente** en
`user_list_featured` (`starts_at` pasado y `expires_at` nulo o futuro), ordenadas por `weight`
descendente y, a igualdad, por `rank` ascendente, como el riel de colecciones editoriales, con un
máximo de 6 tarjetas. Cada colección SHALL presentarse con su título, su conteo de ítems y sus
carátulas disponibles, y SHALL enlazar a la página de detalle de esa lista. El riel SHALL
mostrarse siempre que exista al menos una lista destacada vigente.

#### Scenario: Con colecciones sembradas

- **WHEN** existen listas de álbumes con fila vigente en `user_list_featured`
- **THEN** `/explore` las muestra en el riel de colecciones destacadas, ordenadas por peso y
  rank, cada una enlazando a su detalle

#### Scenario: Colección vencida

- **WHEN** una fila de `user_list_featured` tiene `expires_at` en el pasado
- **THEN** su colección no aparece en el riel

#### Scenario: Tope de tarjetas

- **WHEN** hay más de 6 colecciones vigentes
- **THEN** el riel muestra solo las 6 primeras según el orden definido

#### Scenario: Sin colecciones destacadas

- **WHEN** ninguna lista tiene fila vigente en `user_list_featured`
- **THEN** el riel de colecciones destacadas no aparece en `/explore`
