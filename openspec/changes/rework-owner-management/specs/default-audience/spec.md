## ADDED Requirements

### Requirement: Audiencia por defecto opcional del contenido nuevo

El sistema SHALL permitir a cada usuario configurar, de forma opcional, una audiencia por
defecto (`private`, `followers` o `public`) para el contenido nuevo de biblioteca: favoritos,
entradas de diario, listas y copias de colección. La ausencia de valor (`NULL`) SHALL significar
"según el tipo" y SHALL conservar los defaults de cada tipo vigentes cuando se aprobó este
requisito. Los usuarios nuevos y los existentes SHALL comenzar sin valor.

#### Scenario: Usuario sin preferencia

- **WHEN** un usuario sin audiencia por defecto crea un favorito, una entrada de diario, una
  lista y una copia de colección sin indicar audiencia
- **THEN** cada uno nace con el default de su tipo, igual que antes de este cambio

#### Scenario: Usuarios existentes

- **WHEN** se despliega este cambio sobre una base con usuarios existentes
- **THEN** ningún usuario tiene audiencia por defecto y ningún contenido cambia de audiencia

### Requirement: Precedencia al crear contenido

Al crear favoritos, entradas de diario, listas o copias de colección, la audiencia resultante
SHALL resolverse con esta precedencia: el valor explícito de la petición, luego la audiencia por
defecto del usuario y, si no la tiene, el default del tipo. La preferencia SHALL aplicarse en el
servidor, no en el cliente.

#### Scenario: La petición indica audiencia

- **WHEN** un usuario con audiencia por defecto `public` crea una lista indicando `private`
- **THEN** la lista se crea `private`

#### Scenario: La preferencia sustituye al default del tipo

- **WHEN** un usuario con audiencia por defecto `public` registra una entrada de diario sin
  indicar audiencia
- **THEN** la entrada nace `public` y no `private`

#### Scenario: Sin valor explícito ni preferencia

- **WHEN** un usuario sin preferencia crea una copia de colección sin indicar audiencia
- **THEN** la copia nace con el default de colección

### Requirement: La preferencia no es retroactiva

Cambiar o quitar la audiencia por defecto SHALL NOT modificar la audiencia de ningún contenido
ya creado, ni de forma inmediata ni diferida.

#### Scenario: Cambiar la preferencia con contenido existente

- **WHEN** un usuario con favoritos `followers` cambia su audiencia por defecto a `public`
- **THEN** sus favoritos existentes siguen `followers`

### Requirement: Control de audiencia por defecto en Ajustes

La pantalla Privacidad y audiencia SHALL ofrecer cuatro opciones para la audiencia por defecto:
"Según el tipo" (sin valor), "Privado", "Seguidores" y "Público", indicando en el propio control
que solo afecta al contenido nuevo y que cada elemento se puede ajustar por separado. La
preferencia SHALL persistirse mediante `PATCH /api/me/profile`. Una petición sin sesión SHALL
responder `401` con código `AUTH_REQUIRED`, y un valor fuera del conjunto permitido SHALL
responder `400` con código `VALIDATION_ERROR`, sin modificar datos.

#### Scenario: Elegir una audiencia por defecto

- **WHEN** el usuario elige "Seguidores" en el control
- **THEN** la preferencia se persiste y el texto del control aclara que solo aplica al contenido
  nuevo

#### Scenario: Volver a "Según el tipo"

- **WHEN** el usuario elige "Según el tipo"
- **THEN** la preferencia vuelve a `NULL` y el contenido nuevo usa de nuevo el default de su tipo

#### Scenario: Valor inválido

- **WHEN** una petición envía una audiencia por defecto fuera de `private`, `followers` y `public`
- **THEN** la API responde `400` con `VALIDATION_ERROR` y no modifica datos

#### Scenario: Petición sin sesión

- **WHEN** una petición sin sesión intenta cambiar la audiencia por defecto
- **THEN** la API responde `401` con `AUTH_REQUIRED` y no modifica datos
