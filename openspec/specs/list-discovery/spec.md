# list-discovery Specification

## Purpose

Descubrir listas públicas de la comunidad (Fase 5, cambio `rework-lists-section`). La pestaña
"Descubrir" de `/me/lists` lista las listas de audiencia `public` de otros usuarios en orden
cronológico descendente, sin recomendación algorítmica ni personalización por afinidad.

## Requirements

### Requirement: Descubrir listas públicas de la comunidad
El sistema SHALL exponer al usuario autenticado, en la pestaña "Descubrir" de `/me/lists`, un
listado paginado de listas de audiencia `public` de otros usuarios, en **orden cronológico
descendente por fecha de creación**. El listado SHALL NOT usar recomendación algorítmica ni
personalización por afinidad: es un descubrimiento editorial/cronológico. El listado SHALL
excluir las listas del propio usuario, las de usuarios que lo bloquearon o a los que bloqueó,
y las de perfiles que dejaron de ser visibles. Cada entrada SHALL mostrar título, dueño (con
enlace al perfil), tipo de entidad, conteo de ítems, carátulas disponibles, tiempo relativo de
creación y si el usuario ya la guardó o la sigue. Sin sesión, la petición SHALL responder
`401` con código `AUTH_REQUIRED`.

#### Scenario: Ver listas públicas recientes
- **WHEN** un usuario autenticado abre la pestaña "Descubrir"
- **THEN** ve listas públicas de otros usuarios, de la más reciente a la más antigua, con
  dueño, conteo y carátulas

#### Scenario: Exclusión de listas propias
- **WHEN** el usuario tiene listas públicas propias
- **THEN** esas listas no aparecen en su pestaña "Descubrir"

#### Scenario: Exclusión por bloqueo
- **WHEN** existe un bloqueo en cualquier dirección entre el usuario y el dueño de una lista
  pública
- **THEN** esa lista no aparece en "Descubrir"

#### Scenario: Solo audiencia pública
- **WHEN** un usuario tiene listas de audiencia `followers` o `private`
- **THEN** esas listas nunca aparecen en "Descubrir", ni siquiera para sus seguidores

#### Scenario: Estado del guardado reflejado
- **WHEN** el usuario ya guardó o sigue una lista que aparece en "Descubrir"
- **THEN** la entrada refleja ese estado y permite alternarlo desde ahí

#### Scenario: Sin listas públicas todavía
- **WHEN** no hay ninguna lista pública de otros usuarios visible para el lector
- **THEN** recibe una lista vacía con paginación válida y un estado vacío localizado, no un
  error técnico

#### Scenario: Paginación inválida
- **WHEN** se envía una paginación fuera de rango
- **THEN** la API responde `400` con código `VALIDATION_ERROR` y no ejecuta la lectura

#### Scenario: Sin sesión
- **WHEN** una petición sin sesión consulta "Descubrir"
- **THEN** la API responde `401` con código `AUTH_REQUIRED`
