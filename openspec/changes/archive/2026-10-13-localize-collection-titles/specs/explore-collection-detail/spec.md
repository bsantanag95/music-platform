## ADDED Requirements

### Requirement: Ruta propia de una colección generada

El sistema SHALL exponer el detalle de una colección generada en `/{locale}/explore/collections/<slug>-<id>`, donde
`<slug>` se obtiene del título localizado en el idioma activo. La ruta SHALL resolver por el id del segmento y SHALL
responder `404` si la lista no es una colección generada (sin fila `template` en `user_list_featured`), no es pública o
está oculta por moderación. Si el segmento recibido no es el canónico del idioma (slug de otro idioma o desactualizado),
SHALL responder un redirect permanente a la dirección canónica conservando el locale. La URL SHALL NOT contener el nombre
de usuario de la cuenta curadora.

#### Scenario: Detalle en el idioma activo

- **WHEN** una persona abre una colección generada desde `/en/explore`
- **THEN** la URL es `/en/explore/collections/essential-new-releases-<id>` y el título está en inglés

#### Scenario: Slug de otro idioma

- **WHEN** se abre `/en/explore/collections/novedades-esenciales-<id>`
- **THEN** responde un redirect permanente a `/en/explore/collections/essential-new-releases-<id>`

#### Scenario: No es una colección generada

- **WHEN** el id del segmento corresponde a una lista personal o a una colección curada
- **THEN** responde `404`

#### Scenario: Colección vencida

- **WHEN** se abre la colección de un período que ya salió del rail
- **THEN** se muestra con normalidad, con los álbumes de su último período

### Requirement: Dueño mostrado como plataforma

El detalle de una colección generada SHALL mostrar como dueño a la plataforma ("Exploración" en español, "Explore" en
inglés) y SHALL NOT enlazar a un perfil de usuario. Las acciones de guardar y seguir SHALL funcionar igual que en
cualquier lista pública, identificando la lista por su id.

#### Scenario: Dueño en inglés

- **WHEN** se abre una colección generada con la interfaz en inglés
- **THEN** el dueño aparece como "Explore" y no es un enlace a `/users/exploracion`

#### Scenario: Guardar

- **WHEN** una persona con sesión guarda una colección generada
- **THEN** queda en su lista de guardadas, que la muestra con el título localizado

### Requirement: Redirect desde la ruta de usuario

La ruta `/{locale}/users/<username>/lists/<segment>` SHALL responder un redirect permanente a la ruta de colecciones
cuando la lista sea una colección generada. Para cualquier otra lista SHALL conservar su comportamiento actual.

#### Scenario: Enlace antiguo

- **WHEN** se abre `/es/users/exploracion/lists/novedades-esenciales-<id>` de una colección generada
- **THEN** responde un redirect permanente a `/es/explore/collections/novedades-esenciales-<id>`

#### Scenario: Lista de una persona

- **WHEN** se abre la ruta de usuario de una lista creada por una persona
- **THEN** se muestra como hoy, sin redirect

### Requirement: Enlaces a la ruta de colecciones

Las tarjetas de colecciones generadas del rail de Explorar, de la página de colecciones y del archivo SHALL enlazar a
`/explore/collections/<slug>-<id>`. Las tarjetas de la selección editorial (colecciones curadas) SHALL seguir enlazando a la
ruta de lista de la cuenta curadora.

#### Scenario: Tarjeta automática

- **WHEN** se muestra una colección generada en el rail "Descubre por datos"
- **THEN** su enlace apunta a la ruta de colecciones con el slug del idioma activo

#### Scenario: Tarjeta editorial

- **WHEN** se muestra una colección curada en "Selección editorial"
- **THEN** su enlace apunta a la ruta de lista de la cuenta curadora
