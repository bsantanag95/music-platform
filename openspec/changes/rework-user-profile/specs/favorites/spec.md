## MODIFIED Requirements

### Requirement: Audiencia del favorito

El sistema SHALL permitir configurar la audiencia de cada favorito entre `private`,
`followers` y `public`. Un favorito nuevo SHALL usar `public` por defecto y el usuario SHALL
poder cambiarla después de publicarlo. Un favorito de `audience` `private` SHALL ser visible
solo para su dueño. Este default SHALL aplicarse únicamente a favoritos creados a partir de
este cambio: un favorito ya existente SHALL conservar la audiencia que tenía, sin migrarse
automáticamente a `public`.

#### Scenario: Audiencia por defecto

- **WHEN** un usuario crea un favorito sin especificar audiencia
- **THEN** el favorito queda con audiencia `public`

#### Scenario: Cambiar la audiencia de un favorito propio

- **WHEN** el usuario cambia la audiencia de un favorito propio a `public`
- **THEN** el favorito queda público y visible en las superficies que lo permitan

#### Scenario: Favorito privado

- **WHEN** el usuario consulta un favorito de audiencia `private` que no es suyo
- **THEN** ese favorito no aparece en ninguna superficie ajena

#### Scenario: Favoritos existentes no cambian de audiencia

- **WHEN** este cambio se despliega sobre una base con favoritos creados antes, con
  audiencia `followers`
- **THEN** esos favoritos conservan `followers` y no pasan a `public` automáticamente
