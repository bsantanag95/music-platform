## ADDED Requirements

### Requirement: El panel refleja la valoración creada fuera de él
El panel "Tu relación" SHALL mostrar la valoración vigente del usuario también cuando esta
cambia por una acción ajena al panel durante la sesión, sin recargar la página: en
particular, publicar desde el compositor de reseñas una reseña que crea la valoración.
Mientras una valoración hecha desde el panel está guardándose, el panel NO SHALL reemplazar
su valor por uno que llegue del servidor. La actualización NO SHALL descartar el aviso de
puntaje descartado ni cerrar un diálogo abierto del panel.

#### Scenario: Reseñar con estrellas actualiza el panel
- **WHEN** un usuario sin valoración publica una reseña con 4 estrellas desde la pestaña
  Reseñas, sin recargar la página
- **THEN** el panel "Tu relación" muestra 4 estrellas y la señal de reseña escrita

#### Scenario: Valorar en el panel mientras llega un valor del servidor
- **WHEN** un usuario cambia sus estrellas en el panel y, mientras se guarda, llega del
  servidor la valoración anterior
- **THEN** el panel conserva el valor que el usuario eligió y, al terminar de guardar,
  muestra el valor guardado

#### Scenario: El aviso de puntaje descartado sobrevive a la actualización
- **WHEN** un usuario con 5★ · 95 elige 3★ en el panel y la página se refresca con el valor
  guardado
- **THEN** el panel muestra 3★ y mantiene el aviso de que se quitó el 95
