## MODIFIED Requirements

### Requirement: Sección "Destacadas"

La vista `/lists` SHALL mostrar como primera sección las listas editoriales oficiales publicadas,
sin filtrar por tipo de entidad y sin duplicados. Las colecciones de Explorar SHALL NOT aparecer en esta sección,
ni las generadas por plantilla (`source='template'`) ni las curadas con fila en `user_list_featured`
(`source='curated'`): una colección es contenido de la plataforma y se recorre en Explorar, no entre las listas de la
comunidad. La sección SHALL ofrecer en su lugar un enlace a la página de colecciones (`/explore/collections`).
Una lista editorial oficial SHALL ser una lista de la cuenta curadora de `/explore`
(`@exploracion`), de audiencia `public`, `moderation_status = visible` y no retirada
(`official_withdrawn_at IS NULL`), y las oficiales SHALL ordenarse de la más recientemente publicada a la más
antigua. Cada entrada SHALL presentar título, dueño (con enlace al
perfil), tipo de entidad, conteo de ítems y carátulas disponibles, y SHALL enlazar al detalle de esa
lista; las oficiales SHALL distinguirse con la insignia de contenido oficial. Una lista sin ítems
SHALL NOT aparecer en la sección (sigue visible en su perfil y por enlace directo). La
sección SHALL mostrarse siempre que exista al menos una lista oficial con ítems y SHALL
NOT paginar.

#### Scenario: Con listas destacadas

- **WHEN** existen listas editoriales oficiales publicadas con ítems
- **THEN** `/lists` las muestra como primera sección, de la más reciente a la más antigua, cada una
  enlazando a su detalle, junto al enlace a la página de colecciones

#### Scenario: Editorial oficial dentro de Destacadas

- **WHEN** existe una lista editorial oficial publicada
- **THEN** aparece en la sección "Destacadas" con la insignia de contenido oficial

#### Scenario: Sin listas destacadas ni oficiales

- **WHEN** no hay listas editoriales oficiales publicadas con ítems
- **THEN** la sección "Destacadas" no aparece en `/lists`

#### Scenario: Lista vacía no se destaca

- **WHEN** una lista editorial oficial no tiene ítems
- **THEN** no aparece en "Destacadas"; si ninguna tiene ítems, la sección no aparece

#### Scenario: Oficial retirada no se destaca

- **WHEN** una lista editorial oficial fue retirada por un administrador
- **THEN** no aparece en "Destacadas"

#### Scenario: Colecciones automáticas fuera

- **WHEN** existe una colección generada por plantilla con fila vigente en `user_list_featured`
- **THEN** no aparece en la sección "Destacadas" de `/lists` (sí en `/explore` y en `/explore/collections`)

#### Scenario: Colecciones curadas fuera

- **WHEN** una lista oficial está destacada en Explorar con `source='curated'`
- **THEN** su tarjeta no aparece en "Destacadas" por estar destacada; si está publicada como oficial aparece por eso,
  y el orden no depende de su `rank`

#### Scenario: Enlace a las colecciones

- **WHEN** una persona abre `/lists`
- **THEN** la sección "Destacadas" ofrece un enlace a `/explore/collections` para recorrer las colecciones de la
  plataforma
