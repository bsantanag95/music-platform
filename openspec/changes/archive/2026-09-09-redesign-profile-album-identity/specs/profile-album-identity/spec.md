## ADDED Requirements

### Requirement: Sección "Álbumes favoritos"

El perfil SHALL exponer una sección **"Álbumes favoritos"** con hasta **6** álbumes fijados
por el dueño, en un orden manual que él define. La sección SHALL leerse como una declaración
de identidad cultural: SHALL NOT ordenarse por valoración, escuchas ni actividad, SHALL NOT
mostrar posiciones numéricas ni estrellas, y SHALL NOT requerir que el álbum tenga reseña.
Cada álbum SHALL presentarse con su carátula, su título y su artista acreditado, y SHALL
enlazar a la página del álbum.

La sección de **presentación** SHALL NOT renderizarse cuando el dueño no tiene ningún álbum
fijado (mismo criterio que los destacados); la sección de **edición** del dueño SHALL
mostrarse igual, invitándolo a fijar álbumes.

#### Scenario: Fijar y ordenar álbumes favoritos

- **WHEN** el dueño fija tres álbumes en un orden y luego los reordena
- **THEN** el perfil muestra esos tres álbumes en el orden vigente, sin números de posición
  ni estrellas

#### Scenario: Exceder el máximo

- **WHEN** el dueño intenta fijar un séptimo álbum favorito
- **THEN** la API responde `400` con código `VALIDATION_ERROR` y el conjunto no cambia

#### Scenario: Sección vacía

- **WHEN** el dueño no tiene ningún álbum favorito fijado
- **THEN** la sección de presentación no aparece en el perfil, y el resto del perfil se
  compone sin espacios vacíos

### Requirement: Los álbumes favoritos se eligen de los favoritos de álbum del dueño

El sistema SHALL permitir fijar como álbum favorito del perfil únicamente un favorito de
álbum (`favorite` con objetivo `release-group`) que **ya pertenece al dueño**. Fijar algo
que no es un favorito de álbum propio SHALL responder `400` con código `VALIDATION_ERROR`.
Quitar el favorito de álbum subyacente SHALL desfijarlo automáticamente de la sección
"Álbumes favoritos" (borrado en cascada); no SHALL existir un estado de "álbum fijado que
ya no es favorito".

#### Scenario: Fijar un favorito de álbum propio

- **WHEN** el dueño fija un álbum que tiene marcado como favorito
- **THEN** el álbum aparece en su sección "Álbumes favoritos"

#### Scenario: Intentar fijar algo que no es un favorito de álbum propio

- **WHEN** el dueño intenta fijar un favorito de artista, un favorito de canción, o un
  favorito de otro usuario
- **THEN** la API responde `400` con código `VALIDATION_ERROR` y no fija nada

#### Scenario: Quitar el favorito desfija el álbum

- **WHEN** el dueño tiene un álbum fijado como favorito del perfil y luego quita ese álbum
  de sus favoritos
- **THEN** el álbum deja de aparecer en su sección "Álbumes favoritos" sin ninguna acción
  adicional

### Requirement: Edición de los álbumes favoritos desde el propio perfil

El editor de "Álbumes favoritos" SHALL montarse únicamente en la vista del propio perfil.
SHALL listar los favoritos de álbum del dueño y permitir marcar hasta 6 y ordenarlos, y
SHALL guardar el conjunto ordenado completo en una sola operación (reemplazo, no mutaciones
por ítem). El editor SHALL NOT incluir un buscador de catálogo embebido: se elige de los
favoritos ya existentes. Si el dueño no tiene favoritos de álbum, el editor SHALL invitarlo
a marcar álbumes como favoritos antes.

#### Scenario: Reemplazo del conjunto

- **WHEN** el dueño guarda una selección ordenada de cuatro álbumes favoritos
- **THEN** su sección queda exactamente con esos cuatro en ese orden, reemplazando la
  selección anterior

#### Scenario: Dueño sin favoritos de álbum

- **WHEN** un dueño que no marcó ningún álbum como favorito abre el editor
- **THEN** ve una invitación a marcar álbumes favoritos, no una lista vacía sin explicación

#### Scenario: El editor no aparece en un perfil ajeno

- **WHEN** un visitante abre el perfil de otra persona
- **THEN** ve la sección "Álbumes favoritos" en modo lectura, sin controles de edición

### Requirement: Audiencia de un álbum favorito fijado

Un álbum favorito fijado en el perfil SHALL respetar la audiencia (`private` / `followers`
/ `public`) del favorito subyacente: un visitante SHALL ver en la sección "Álbumes
favoritos" únicamente los álbumes cuyo favorito le es visible según su relación con el
dueño. Si ninguno de los álbumes fijados es visible para el visitante, la sección no SHALL
aparecer para ese visitante.

#### Scenario: Favorito privado fijado

- **WHEN** el dueño fija un álbum cuyo favorito tiene audiencia `private`
- **THEN** ese álbum aparece en la sección solo para el dueño; un seguidor aprobado no lo ve

#### Scenario: Mezcla de audiencias

- **WHEN** el dueño fija tres álbumes: uno `public`, uno `followers` y uno `private`
- **THEN** un visitante público ve solo el `public`, un seguidor aprobado ve el `public` y
  el `followers`, y el dueño ve los tres
