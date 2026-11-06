## ADDED Requirements

### Requirement: Página de relación con un álbum o una canción
El sistema SHALL ofrecer `/<locale>/users/<usuario>/album/<id>` y `/<locale>/users/<usuario>/song/<id>`, con lo que esa persona
tiene con ese disco o esa canción: valoración, escuchas, reseña, favorito y colección. La página SHALL funcionar sin sesión y
SHALL enlazar al álbum o la canción.

#### Scenario: Visitante sin sesión
- **WHEN** un visitante sin sesión abre la relación de una persona con un álbum cuya valoración es pública
- **THEN** ve la valoración y el enlace al álbum

### Requirement: Cada dato según quién mira
La página SHALL mostrar cada dato con las reglas de siempre: la valoración al dueño, a sus seguidores aceptados y a cualquiera si
tiene la marca de compartida o está destacada; escuchas, favorito y colección según su audiencia, y las escuchas destacadas más
allá de ella; la reseña si está visible. Sin nada visible, o sin acceso al perfil, SHALL responder `404` sin indicar si hay
contenido.

#### Scenario: Valoración no compartida
- **WHEN** un anónimo abre una relación con una valoración sin marca y una escucha pública
- **THEN** ve la escucha y no ve la valoración

#### Scenario: Seguidor
- **WHEN** un seguidor aceptado abre esa misma relación
- **THEN** ve la valoración y la escucha

#### Scenario: Nada visible
- **WHEN** un anónimo abre una relación en la que nada es público
- **THEN** la respuesta es `404`

#### Scenario: Perfil privado
- **WHEN** un anónimo abre una relación de un perfil privado con una valoración marcada
- **THEN** la respuesta es `404`

### Requirement: Escucha destacada en la página
Con `?escucha=<id>` de una escucha visible para quien mira, la página SHALL ponerla primera y marcarla. Un valor que no corresponde
a una escucha visible de esa relación SHALL ignorarse.

#### Scenario: Escucha pedida
- **WHEN** un visitante abre la relación con `?escucha=` de una escucha pública
- **THEN** esa escucha aparece primera y marcada

#### Scenario: Escucha ajena
- **WHEN** un visitante abre la relación con `?escucha=` de una escucha privada
- **THEN** la página no la muestra ni revela que existe

### Requirement: Metadatos de la relación
La página SHALL anunciar, calculado como anónimo: la escucha pedida con `?escucha=` si es pública; si no, la valoración si es
pública; si no, la escucha pública más reciente. Sin ninguna, SHALL anunciar la imagen genérica sin nombrar a la persona ni el disco.

#### Scenario: Valoración pública
- **WHEN** un crawler pide una relación con la valoración marcada
- **THEN** los metadatos anuncian la imagen de la valoración

#### Scenario: Dueño con su sesión
- **WHEN** el dueño abre su relación con todo privado
- **THEN** ve su contenido y los metadatos siguen siendo los que vería un anónimo
