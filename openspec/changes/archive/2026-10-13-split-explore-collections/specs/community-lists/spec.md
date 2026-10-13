## MODIFIED Requirements

### Requirement: Sección "Destacadas"

La vista `/lists` SHALL mostrar como primera sección las listas editoriales oficiales publicadas
seguidas de las listas curadas con fila en `user_list_featured` (`source='curated'`), ordenadas estas últimas de forma
ascendente por `rank`, sin filtrar por tipo de entidad y sin duplicar una lista que aparezca en ambos
conjuntos. Las colecciones generadas por plantilla (`source='template'`) SHALL NOT aparecer en esta sección: son
contenido de Explorar. Una lista editorial oficial SHALL ser una lista de la cuenta curadora de `/explore`
(`@exploracion`), de audiencia `public`, `moderation_status = visible` y no retirada
(`official_withdrawn_at IS NULL`). Cada entrada SHALL presentar título, dueño (con enlace al
perfil), tipo de entidad, conteo de ítems y carátulas disponibles, y SHALL enlazar al detalle de esa
lista; las oficiales SHALL distinguirse con la insignia de contenido oficial. Una lista sin ítems
SHALL NOT aparecer en la sección (sigue visible en su perfil y por enlace directo). La
sección SHALL mostrarse siempre que exista al menos una lista oficial o curada con ítems y SHALL
NOT paginar.

#### Scenario: Con listas destacadas

- **WHEN** existen listas curadas con fila en `user_list_featured` y ninguna lista editorial oficial
- **THEN** `/lists` las muestra como primera sección en orden ascendente de `rank`, cada una
  enlazando a su detalle

#### Scenario: Editorial oficial dentro de Destacadas

- **WHEN** existe una lista editorial oficial publicada
- **THEN** aparece en la sección "Destacadas", con la insignia de contenido oficial, antes de las
  listas destacadas por `rank`

#### Scenario: Sin listas destacadas ni oficiales

- **WHEN** no hay listas curadas con fila en `user_list_featured` ni listas editoriales oficiales publicadas
- **THEN** la sección "Destacadas" no aparece en `/lists`

#### Scenario: Lista vacía no se destaca

- **WHEN** una lista editorial oficial o destacada no tiene ítems
- **THEN** no aparece en "Destacadas"; si ninguna tiene ítems, la sección no aparece

#### Scenario: Oficial retirada no se destaca

- **WHEN** una lista editorial oficial fue retirada por un administrador
- **THEN** no aparece en "Destacadas"

#### Scenario: Colecciones automáticas fuera

- **WHEN** existe una colección generada por plantilla con fila vigente en `user_list_featured`
- **THEN** no aparece en la sección "Destacadas" de `/lists` (sí en `/explore` y en `/explore/collections`)
