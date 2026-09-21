## MODIFIED Requirements

### Requirement: Edición de identidad desde el perfil

El dueño SHALL poder editar bio, pronombres, ubicación, zona horaria, enlaces, la Tarjeta de
Identidad (artista, álbum e himno) y "Empieza por aquí" desde su propio perfil, sin salir de la
página, activando el modo edición (ver `profile-edit-mode`), y SHALL poder editar la misma
información desde el área de ajustes (ver `owner-settings`). Ambas vías SHALL usar los mismos
editores, y cada dato SHALL tener un único editor: el himno, el artista y el álbum definitorios
se editan solo en el editor de la Tarjeta de Identidad. Cada editor SHALL tener estados de
carga, éxito y error recuperable, y SHALL confirmar los cambios sin recargar toda la aplicación.
Los editores SHALL renderizarse únicamente en vistas del dueño: su perfil con el modo edición
activo y su área de ajustes.

#### Scenario: Editar bio inline

- **WHEN** el dueño activa el modo edición, abre el editor de la Placa desde su perfil, cambia
  el texto y confirma
- **THEN** el perfil refleja la nueva bio sin recargar la página

#### Scenario: Error recuperable al guardar

- **WHEN** una petición de guardado falla
- **THEN** el editor muestra un error localizado, conserva el texto introducido y permite
  reintentar

#### Scenario: Un visitante no ve los editores

- **WHEN** un visitante que no es el dueño abre el perfil
- **THEN** no ve ningún control de edición de identidad

#### Scenario: Un único editor para el himno

- **WHEN** el dueño quiere cambiar su himno
- **THEN** lo hace en el editor de la Tarjeta de Identidad; el editor de "Empieza por aquí" no
  ofrece elegirlo
