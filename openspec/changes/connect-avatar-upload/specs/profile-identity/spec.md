## MODIFIED Requirements

### Requirement: Imagen de identidad por monograma

El sistema SHALL representar la identidad visual de cada usuario mediante la foto de perfil que
haya subido (ver `avatar-upload`) cuando exista, y mediante un monograma determinista derivado de
su username, estable entre renders y sin almacenamiento, cuando no exista. El sistema SHALL
mostrar exactamente una de las dos representaciones para cada usuario, nunca ambas ni un hueco
mientras se resuelve cuál corresponde.

#### Scenario: Monograma estable sin avatar

- **WHEN** se renderiza el mismo usuario sin avatar en el perfil, en la búsqueda y en un destacado
- **THEN** el monograma (letra y color) es idéntico en las tres superficies

#### Scenario: Foto de perfil reemplaza al monograma

- **WHEN** el dueño tiene una foto de perfil subida
- **THEN** el perfil, la búsqueda y los destacados muestran esa foto en vez del monograma

#### Scenario: Quitar la foto vuelve al monograma

- **WHEN** el dueño quita su foto de perfil
- **THEN** todas las superficies vuelven a mostrar el monograma determinista, sin mostrar un hueco
  ni una imagen rota

#### Scenario: La foto es identidad pública

- **WHEN** un visitante sin acceso abre un perfil privado cuyo dueño tiene foto
- **THEN** ve esa foto junto al nombre y el usuario, igual que ve la bio, y no el monograma

### Requirement: Edición de identidad desde el perfil

El dueño SHALL poder editar bio, pronombres, ubicación, zona horaria, enlaces, la foto de perfil,
la Tarjeta de Identidad (artista, álbum e himno) y "Empieza por aquí" desde su propio perfil, sin
salir de la página, activando el modo edición (ver `profile-edit-mode`), y SHALL poder editar la
misma información desde el área de ajustes (ver `owner-settings`). Ambas vías SHALL usar los
mismos editores, y cada dato SHALL tener un único editor: el himno, el artista y el álbum
definitorios se editan solo en el editor de la Tarjeta de Identidad. Cada editor SHALL tener
estados de carga, éxito y error recuperable, y SHALL confirmar los cambios sin recargar toda la
aplicación. Los editores SHALL renderizarse únicamente en vistas del dueño: su perfil con el modo
edición activo y su área de ajustes.

#### Scenario: Editar bio inline

- **WHEN** el dueño activa el modo edición, abre el editor de la Placa desde su perfil, cambia
  el texto y confirma
- **THEN** el perfil refleja la nueva bio sin recargar la página

#### Scenario: Subir foto de perfil inline

- **WHEN** el dueño activa el modo edición y sube una foto de perfil válida desde su perfil
- **THEN** el perfil muestra la nueva foto sin recargar la página

#### Scenario: Error recuperable al guardar

- **WHEN** una petición de guardado falla
- **THEN** el editor muestra un error localizado, conserva el texto introducido y permite
  reintentar

#### Scenario: Un visitante no ve los editores

- **WHEN** un visitante que no es el dueño abre el perfil
- **THEN** no ve ningún control de edición de identidad, incluida la foto de perfil

#### Scenario: Un único editor para el himno

- **WHEN** el dueño quiere cambiar su himno
- **THEN** lo hace en el editor de la Tarjeta de Identidad; el editor de "Empieza por aquí" no
  ofrece elegirlo
