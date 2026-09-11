# list-discovery Specification

## Purpose

Descubrir listas públicas de la comunidad (Fase 5, cambio `rework-lists-section`). La pestaña
"Descubrir" de `/me/lists` lista las listas de audiencia `public` de otros usuarios en orden
cronológico descendente, sin recomendación algorítmica ni personalización por afinidad.
## Requirements
### Requirement: Descubrir listas públicas de la comunidad

El sistema SHALL exponer un listado paginado de listas de audiencia `public` de otros
usuarios, en **orden cronológico descendente por fecha de creación por defecto**, en dos
superficies: la pestaña "Descubrir" de `/me/lists` (con sesión) y la superficie pública
`/lists` (con y **sin** sesión). El listado SHALL aceptar filtros opcionales por texto (`q`, sobre
título y descripción), por tipo de entidad (`entityType`) y un orden alternativo por conteo agregado
de guardados descendente (`sort=popular`); sin estos parámetros el comportamiento SHALL ser el
cronológico descrito. El listado SHALL NOT usar recomendación algorítmica ni personalización por
afinidad: es un descubrimiento editorial, cronológico o por señal social agregada. El listado
SHALL excluir las listas de usuarios que bloquearon al lector o a los que el lector bloqueó,
y las de perfiles que dejaron de ser visibles; cuando hay sesión SHALL excluir además las
listas del propio lector. Cada entrada SHALL mostrar título, dueño (con enlace al perfil),
tipo de entidad, conteo de ítems, carátulas disponibles y tiempo relativo de creación; con
sesión SHALL mostrar además si el lector ya la guardó o la sigue. Para un lector anónimo el
listado SHALL devolver las mismas listas sin estado de guardado. Una paginación fuera de
rango o un valor de filtro inválido SHALL responder `400` con código `VALIDATION_ERROR`.

#### Scenario: Ver listas públicas recientes

- **WHEN** un usuario autenticado abre la pestaña "Descubrir"
- **THEN** ve listas públicas de otros usuarios, de la más reciente a la más antigua, con
  dueño, conteo y carátulas

#### Scenario: Sin sesión

- **WHEN** una persona sin sesión abre la sección "Recientes" de `/lists` (o consulta
  `GET /api/lists/discover`)
- **THEN** recibe las mismas listas públicas en orden cronológico descendente, con `saved` y
  `following` en `false`, y sin excluir "listas propias" (no aplica)

#### Scenario: Exclusión de listas propias

- **WHEN** un lector con sesión tiene listas públicas propias
- **THEN** esas listas no aparecen en su descubrimiento cronológico

#### Scenario: Exclusión por bloqueo

- **WHEN** existe un bloqueo en cualquier dirección entre el lector y el dueño de una lista
  pública
- **THEN** esa lista no aparece en el descubrimiento cronológico

#### Scenario: Solo audiencia pública

- **WHEN** un usuario tiene listas de audiencia `followers` o `private`
- **THEN** esas listas nunca aparecen en el descubrimiento cronológico, ni siquiera para sus
  seguidores

#### Scenario: Estado del guardado reflejado

- **WHEN** un lector con sesión ya guardó o sigue una lista que aparece en el descubrimiento
- **THEN** la entrada refleja ese estado y permite alternarlo desde ahí

#### Scenario: Sin listas públicas todavía

- **WHEN** no hay ninguna lista pública de otros usuarios visible para el lector
- **THEN** recibe una lista vacía con paginación válida y un estado vacío localizado, no un
  error técnico

#### Scenario: Filtro por texto y tipo

- **WHEN** se consulta el listado con `q` y/o `entityType`
- **THEN** devuelve solo las listas públicas visibles que coinciden, manteniendo la paginación

#### Scenario: Orden por guardados

- **WHEN** se consulta el listado con `sort=popular`
- **THEN** ordena por conteo agregado de guardados descendente y, a igualdad, por fecha de
  creación descendente, incluyendo las listas sin guardados al final

#### Scenario: Paginación o filtro inválido

- **WHEN** se envía una paginación fuera de rango o un valor de `entityType`/`sort` no soportado
- **THEN** la API responde `400` con código `VALIDATION_ERROR` y no ejecuta la lectura

