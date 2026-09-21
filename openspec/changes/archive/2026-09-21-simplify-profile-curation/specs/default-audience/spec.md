## MODIFIED Requirements

### Requirement: Aplicar la audiencia a todo lo existente

El sistema SHALL permitir al usuario autenticado aplicar una audiencia (`private`, `followers`
o `public`) a **todo su contenido de biblioteca existente** mediante una acción explícita: sus
favoritos, entradas de diario, listas propias (`kind = 'standard'`) y copias de colección. La
acción SHALL actualizar únicamente la audiencia de los elementos del propio usuario cuya
audiencia difiera de la indicada, dentro de una única transacción, de modo que o se aplica a
todos o a ninguno. SHALL ser idempotente: repetirla, o aplicar una audiencia que todo ya tiene,
SHALL responder con éxito y conteos en cero. SHALL incluir los elementos fijados o destacados
(listas fijadas y entradas de diario destacadas). NO SHALL modificar
la audiencia por defecto guardada, los pines ni los destacados, ni crear, modificar o eliminar
valoraciones, escuchas, comentarios, reseñas ni la wishlist, ni la fecha de actualización de las
listas y las copias de colección (por lo que no genera eventos de "lista actualizada" en el
feed), ni tocar contenido de otros usuarios. La respuesta SHALL devolver cuántos elementos se
actualizaron de cada tipo.

#### Scenario: Aplicar a todo lo existente

- **WHEN** un usuario con favoritos `public`, diario `private` y listas `followers` aplica la
  audiencia `private`
- **THEN** sus favoritos y listas pasan a `private`, el diario no cambia y la respuesta indica
  cuántos favoritos y listas se actualizaron y cero entradas de diario

#### Scenario: Se incluyen los elementos fijados y destacados

- **WHEN** un usuario aplica `private` teniendo una lista fijada y una entrada de diario
  destacada
- **THEN** ambas pasan a `private` y conservan su pin y su destacado

#### Scenario: Solo cambia la audiencia

- **WHEN** un usuario aplica una audiencia a su biblioteca
- **THEN** su audiencia por defecto guardada, sus valoraciones, escuchas, comentarios, reseñas y
  wishlist no cambian, y las listas y copias de colección conservan su fecha de actualización

#### Scenario: No genera eventos de lista actualizada

- **WHEN** un usuario aplica una audiencia y cambian varias de sus listas
- **THEN** el feed no muestra eventos de "lista actualizada" por esa acción

#### Scenario: Las ediciones individuales siguen actualizando la fecha

- **WHEN** un usuario cambia a mano la audiencia de una sola lista
- **THEN** la fecha de actualización de la lista avanza como siempre

#### Scenario: Idempotente

- **WHEN** un usuario aplica la misma audiencia dos veces seguidas
- **THEN** la segunda respuesta es exitosa con todos los conteos en cero y nada cambia

#### Scenario: Atomicidad

- **WHEN** falla la actualización de uno de los tipos durante la acción
- **THEN** ningún tipo queda modificado

#### Scenario: Solo el propio contenido

- **WHEN** un usuario aplica una audiencia
- **THEN** el contenido de otros usuarios y las listas que no son suyas o no son estándar no
  cambian

#### Scenario: Audiencia inválida

- **WHEN** el usuario envía una audiencia fuera de `private`, `followers` o `public`, o la
  omite
- **THEN** la API responde `400` con código `VALIDATION_ERROR` y no modifica nada

#### Scenario: Sesión requerida

- **WHEN** una petición sin sesión intenta aplicar una audiencia
- **THEN** la API responde `401` con código `AUTH_REQUIRED` y no modifica nada

### Requirement: Vista previa de la acción de aplicar

El sistema SHALL ofrecer una vista previa de solo lectura de la acción anterior mediante
`GET /api/me/default-audience/apply?audience=`, que responda cuántos elementos de cada tipo
cambiarían (los que hoy tienen una audiencia distinta) y, de ellos, cuántos son listas fijadas
y entradas de diario destacadas. La vista previa NO SHALL modificar
ningún dato y SHALL exigir sesión y una audiencia válida con los mismos errores que la acción.

#### Scenario: Conteos de lo que cambiaría

- **WHEN** un usuario con tres favoritos `public` y dos listas `followers` pide la vista previa
  de `private`
- **THEN** la respuesta indica tres favoritos y dos listas, y nada se modifica

#### Scenario: Conteo de destacados

- **WHEN** una de las listas que cambiarían está fijada
- **THEN** la vista previa la cuenta también entre las listas fijadas

#### Scenario: Nada cambiaría

- **WHEN** todo el contenido del usuario ya tiene la audiencia consultada
- **THEN** la vista previa devuelve todos los conteos en cero
