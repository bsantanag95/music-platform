## MODIFIED Requirements

### Requirement: Audiencia por defecto opcional del contenido nuevo

El sistema SHALL permitir a cada usuario configurar, de forma opcional, una audiencia por
defecto (`private`, `followers` o `public`) para el contenido nuevo de biblioteca: favoritos,
entradas de diario, listas, copias de colección y entradas de la wishlist ("En tu búsqueda").
La ausencia de valor (`NULL`) SHALL significar
"según el tipo" y SHALL conservar los defaults de cada tipo vigentes cuando se aprobó este
requisito. Los usuarios nuevos y los existentes SHALL comenzar sin valor.

#### Scenario: Usuario sin preferencia

- **WHEN** un usuario sin audiencia por defecto crea un favorito, una entrada de diario, una
  lista y una copia de colección sin indicar audiencia
- **THEN** cada uno nace con el default de su tipo, igual que antes de este cambio

#### Scenario: Usuarios existentes

- **WHEN** se despliega este cambio sobre una base con usuarios existentes
- **THEN** ningún usuario tiene audiencia por defecto y ningún contenido cambia de audiencia

#### Scenario: Default del tipo para la wishlist

- **WHEN** un usuario sin audiencia por defecto agrega un disco a su wishlist sin indicar
  audiencia
- **THEN** la entrada nace `followers`, igual que una copia de colección

### Requirement: Alcance de la preferencia

La preferencia SHALL aplicarse únicamente a los cinco tipos de contenido de biblioteca
(favoritos, entradas de diario, listas, copias de colección y entradas de la wishlist). NO SHALL aplicarse a las
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

Al crear favoritos, entradas de diario, listas, copias de colección o entradas de la wishlist, la audiencia resultante
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

#### Scenario: La preferencia alcanza a la wishlist

- **WHEN** un usuario con audiencia por defecto `private` agrega un disco a su wishlist sin
  indicar audiencia
- **THEN** la entrada nace `private`
