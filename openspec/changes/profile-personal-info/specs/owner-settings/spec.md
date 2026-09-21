## MODIFIED Requirements

### Requirement: Pantalla Perfil

La pantalla **Perfil** SHALL contener los editores de la identidad pública del dueño: Tarjeta de
Identidad (artista, álbum y canción que definen), bio, pronombres (lista cerrada con «Otro» y un
ejemplo en vivo), país, ciudad o región, zona horaria (con la opción de mostrar la hora local), enlaces, y la identidad musical (roles "Me defino como", géneros,
formatos "Cómo escucho" y preguntas del perfil, ver `profile-music-identity`). SHALL usar los mismos
editores que la edición sobre el perfil, con los mismos estados de carga, éxito y error recuperable,
sin duplicar su lógica. La pantalla SHALL NOT ofrecer elegir una foto de perfil.

#### Scenario: Editar la bio desde Ajustes

- **WHEN** el dueño cambia su bio en la pantalla Perfil y guarda
- **THEN** el cambio se persiste y su perfil público muestra la nueva bio

#### Scenario: Error recuperable en Ajustes

- **WHEN** una petición de guardado falla en la pantalla Perfil
- **THEN** el editor muestra un error localizado, conserva lo escrito y permite reintentar

#### Scenario: Editar la identidad musical desde Ajustes

- **WHEN** el dueño elige roles, géneros y formatos en la pantalla Perfil y guarda
- **THEN** los cambios se persisten y la ficha de la Placa de su perfil los muestra

#### Scenario: Elegir país y pronombres desde Ajustes

- **WHEN** el dueño elige un país, escribe su ciudad y elige unos pronombres en la pantalla Perfil y guarda
- **THEN** los cambios se persisten, el ejemplo de los pronombres refleja la opción elegida y su perfil
  los muestra a quien tiene acceso (ver `profile-personal-info`)

#### Scenario: Sin foto de perfil

- **WHEN** el dueño abre la pantalla Perfil
- **THEN** no ve ningún control para subir o elegir una foto y su imagen sigue siendo el monograma
