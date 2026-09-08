## ADDED Requirements

### Requirement: Señal de distribución de curaduría destacada

El sistema SHALL admitir marcar una `user_list` como **colección destacada** mediante una
tabla `user_list_featured` con una fila por lista destacada: `list_id` (clave primaria, FK
a `user_list` con borrado en cascada), `rank` (entero pequeño, **NOT NULL**, **UNIQUE**,
**> 0**) y `created_at`. La **presencia** de la fila SHALL significar "destacada"; su
ausencia, "no destacada". `rank` SHALL definir el orden ascendente en el riel de
colecciones destacadas de `/explore`, y su unicidad SHALL garantizar que ese orden sea
inequívoco. Las filas SHALL crearse y actualizarse mediante el proceso de siembra del
descubrimiento, no por una acción de usuario en la aplicación.

`user_list_featured` SHALL ser **únicamente una señal de distribución**: SHALL NOT
modificar la visibilidad, los permisos, la edición, la lectura, las métricas ni el
comportamiento de la `user_list`, y en particular **SHALL NOT tocar `user_list`** (ni su
`updated_at`, evitando así disparar eventos de feed — el mismo motivo por el que
`user_list_pin` es una tabla aparte). Solo habilita a que superficies que **opten
explícitamente** por consumir la curaduría destacada —hoy, únicamente `/explore`—
seleccionen y ordenen listas. Una lista destacada SHALL comportarse **exactamente igual**
que cualquier otra lista pública en la vista propia (`/me/lists`), la vista ajena
(`/users/[username]/lists`), la pestaña "Descubrir", la acción de guardar o seguir, los
eventos de feed y los bloques de Inicio.

#### Scenario: Lista destacada sigue siendo una lista pública normal

- **WHEN** una lista pública tiene una fila en `user_list_featured`
- **THEN** aparece en la pestaña "Descubrir" y en las vistas de lista con el mismo formato
  y comportamiento que cualquier lista pública, y se puede guardar o seguir igual

#### Scenario: Destacar una lista no dispara eventos de feed

- **WHEN** el proceso de siembra crea o actualiza la fila `user_list_featured` de una lista
- **THEN** `user_list.updated_at` no cambia y no se genera un evento de actualización de
  lista en el feed de quienes la siguen

#### Scenario: Rango editorial único y positivo

- **WHEN** el proceso de siembra intenta asignar un `rank` ya usado por otra lista
  destacada, o un valor menor o igual a cero
- **THEN** la operación falla y el conjunto de colecciones destacadas no queda con un orden
  ambiguo

#### Scenario: Borrar la lista quita su condición de destacada

- **WHEN** se borra una `user_list` que era destacada
- **THEN** su fila en `user_list_featured` se elimina en cascada y ya no aparece en el riel
  editorial

#### Scenario: Orden del riel editorial

- **WHEN** existen varias listas destacadas
- **THEN** el riel de colecciones destacadas de `/explore` las ordena de menor a mayor
  `rank`
