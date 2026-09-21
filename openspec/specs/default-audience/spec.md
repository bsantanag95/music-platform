# default-audience

## Purpose

Preferencia opcional de audiencia por defecto del contenido nuevo de biblioteca (favoritos, entradas de diario, listas y copias de colección): su precedencia al crear, su carácter no retroactivo, su alcance (no cubre reseñas ni comentarios, que son públicos), su control en la pantalla Privacidad y audiencia de los ajustes y la acción explícita "Aplicar a lo existente", que lleva la audiencia elegida a todo el contenido ya creado.
## Requirements
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

### Requirement: Alcance de la preferencia

La preferencia SHALL aplicarse únicamente a los cuatro tipos de contenido de biblioteca
(favoritos, entradas de diario, listas y copias de colección). NO SHALL aplicarse a las
reseñas ni a los comentarios: no tienen audiencia propia y son contenido público visible en
la página del álbum o la canción (ver `profile-reviews`). Una reseña SHALL seguir mostrándose
en el perfil accesible del dueño con independencia de su audiencia por defecto.

#### Scenario: Las reseñas siguen siendo públicas

- **WHEN** un usuario con audiencia por defecto `private` publica una reseña de álbum
- **THEN** la reseña es pública como siempre y aparece en la sección "Reseñas" de su perfil
  accesible y en la página del álbum

#### Scenario: Una reseña no consulta la preferencia

- **WHEN** se crea una reseña o un comentario
- **THEN** no se lee ni se aplica la audiencia por defecto del usuario

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
ya creado, ni de forma inmediata ni diferida. La única vía para cambiar en bloque la audiencia
de lo existente SHALL ser la acción explícita "Aplicar a lo existente" (ver "Aplicar la
audiencia a todo lo existente"), que es un gesto distinto de elegir la preferencia.

#### Scenario: Cambiar la preferencia con contenido existente

- **WHEN** un usuario con favoritos `followers` cambia su audiencia por defecto a `public`
- **THEN** sus favoritos existentes siguen `followers`

#### Scenario: Elegir la preferencia no dispara la acción de aplicar

- **WHEN** un usuario elige una audiencia por defecto en el control
- **THEN** no se modifica ningún contenido existente hasta que use "Aplicar a lo existente"

### Requirement: Control de audiencia por defecto en Ajustes

La pantalla Privacidad y audiencia SHALL ofrecer cuatro opciones para la audiencia por defecto:
"Según el tipo" (sin valor), "Privado", "Seguidores" y "Público", indicando en el propio control
que la opción solo afecta al contenido nuevo, que cada elemento se puede ajustar por separado,
que lo existente solo cambia con la acción "Aplicar a lo existente" y que las reseñas y los
comentarios no dependen de la preferencia por ser públicos. La preferencia SHALL persistirse
mediante `PATCH /api/me/profile`. Una petición sin sesión SHALL responder `401` con código
`AUTH_REQUIRED`, y un valor fuera del conjunto permitido SHALL responder `400` con código
`VALIDATION_ERROR`, sin modificar datos.

#### Scenario: Elegir una audiencia por defecto

- **WHEN** el usuario elige "Seguidores" en el control
- **THEN** la preferencia se persiste y el texto del control aclara que la opción solo aplica al
  contenido nuevo

#### Scenario: El control aclara qué no cubre

- **WHEN** el usuario abre el control de audiencia por defecto
- **THEN** el texto del control indica que las reseñas y los comentarios no dependen de esta
  preferencia porque son públicos

#### Scenario: Volver a "Según el tipo"

- **WHEN** el usuario elige "Según el tipo"
- **THEN** la preferencia vuelve a `NULL` y el contenido nuevo usa de nuevo el default de su tipo

#### Scenario: Valor inválido

- **WHEN** una petición envía una audiencia por defecto fuera de `private`, `followers` y `public`
- **THEN** la API responde `400` con `VALIDATION_ERROR` y no modifica datos

#### Scenario: Petición sin sesión

- **WHEN** una petición sin sesión intenta cambiar la audiencia por defecto
- **THEN** la API responde `401` con `AUTH_REQUIRED` y no modifica datos

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

### Requirement: Acción "Aplicar a lo existente" en Ajustes

La pantalla Privacidad y audiencia SHALL mostrar, junto al control de la audiencia por defecto,
un botón "Aplicar a lo existente" que actúe sobre la audiencia elegida. El botón SHALL estar
desactivado cuando la preferencia sea "Según el tipo", porque no hay una audiencia única que
aplicar. Al activarlo, la interfaz SHALL pedir la vista previa y, si algún conteo es mayor que
cero, SHALL abrir una confirmación que muestre los conteos por tipo y cuántos elementos fijados
o destacados cambiarán, aclarando que las entradas de diario destacadas siguen visibles; solo
tras confirmar SHALL aplicar el cambio. Si nada cambiaría, SHALL informarlo sin pedir
confirmación. Tras aplicar SHALL mostrar cuántos elementos se actualizaron y refrescar la página.
Los errores SHALL mostrarse de forma accesible sin modificar el estado.

#### Scenario: Botón desactivado con "Según el tipo"

- **WHEN** la audiencia por defecto es "Según el tipo"
- **THEN** el botón "Aplicar a lo existente" está desactivado y no se puede activar

#### Scenario: Confirmar con conteos

- **WHEN** el usuario elige "Privado" y pulsa "Aplicar a lo existente" y hay elementos que
  cambiarían
- **THEN** se abre una confirmación con los conteos por tipo y el aviso de destacados, y nada
  cambia hasta que confirma

#### Scenario: Cancelar la confirmación

- **WHEN** el usuario cancela la confirmación
- **THEN** no se modifica ningún contenido

#### Scenario: Nada que cambiar

- **WHEN** el usuario pulsa el botón y todo su contenido ya tiene esa audiencia
- **THEN** la interfaz lo informa sin abrir la confirmación

#### Scenario: Resultado tras aplicar

- **WHEN** el usuario confirma
- **THEN** la interfaz muestra cuántos elementos se actualizaron y la página se refresca

#### Scenario: Error al aplicar

- **WHEN** la vista previa o la aplicación fallan
- **THEN** la interfaz muestra el error en un aviso accesible y no informa de éxito

