## MODIFIED Requirements

### Requirement: Accesos a la biblioteca
El menú de usuario (escritorio y panel móvil) SHALL ofrecer el acceso "Valoraciones"
("Ratings" en inglés), sin posesivo, y el perfil propio SHALL ofrecer un enlace a la
biblioteca visible solo para su dueño, con la misma etiqueta. El título de la página
`/me/ratings` SHALL ser "Valoraciones".

#### Scenario: Desde el perfil propio
- **WHEN** una persona abre su propio perfil
- **THEN** ve un enlace "Valoraciones" que lleva a `/me/ratings`, y quien visita el perfil
  de otra persona no lo ve

#### Scenario: Desde el menú de usuario
- **WHEN** una persona abre el menú de usuario
- **THEN** encuentra "Valoraciones" y no "Mis valoraciones"
