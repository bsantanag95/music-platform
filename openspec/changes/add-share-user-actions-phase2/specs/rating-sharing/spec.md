## ADDED Requirements

### Requirement: Marcar una valoración como compartida
El dueño SHALL poder marcar como compartida una valoración propia de un álbum o una canción, sin tope. La marca SHALL hacer esa
valoración visible para cualquier visitante con acceso al perfil, con su puntaje detallado si lo tiene. Marcar SHALL ser idempotente
y SHALL NOT modificar `rating.updated_at`.

#### Scenario: Marcar
- **WHEN** el dueño hace pública su valoración de un álbum
- **THEN** un anónimo la ve en la página de relación y `rating.updated_at` no cambia

#### Scenario: Marcar dos veces
- **WHEN** el dueño marca una valoración ya marcada
- **THEN** la operación responde sin error y no duplica la marca

#### Scenario: Valoración ajena
- **WHEN** alguien intenta marcar una valoración que no es suya
- **THEN** la respuesta es `404` con `RATING_NOT_FOUND`

#### Scenario: Valoración de un artista
- **WHEN** el dueño intenta marcar su valoración de un artista
- **THEN** la respuesta es `404` con `RATING_NOT_FOUND`

### Requirement: La marca no cambia otras superficies
La marca SHALL afectar solo a la página de relación y a la imagen de esa valoración. Feed, huella de gusto, afinidad y agregados de
comunidad SHALL seguir con sus reglas.

#### Scenario: Huella de un anónimo
- **WHEN** un anónimo abre la huella de una persona con una valoración marcada
- **THEN** la huella sigue sin mostrar la curva de valoraciones

### Requirement: Dejar de compartir
El dueño SHALL poder quitar la marca desde la hoja de compartir de esa valoración. La valoración SHALL volver a su regla
general.

#### Scenario: Quitar la marca
- **WHEN** el dueño deja de compartir su valoración
- **THEN** un anónimo ya no la ve y su imagen pasa a ser la genérica

### Requirement: Vida de la marca
Editar la valoración SHALL conservar la marca y SHALL mostrar la nota vigente, con otra versión de imagen. Borrar la valoración SHALL
borrar la marca. Si el perfil pasa a privado, la marca SHALL conservarse sin efecto para quien no tenga acceso.

#### Scenario: Editar
- **WHEN** el dueño cambia una valoración marcada de 86 a 90
- **THEN** sigue pública, muestra 90 y su imagen cambia de versión

#### Scenario: Borrar y volver a valorar
- **WHEN** el dueño borra una valoración marcada y vuelve a valorar el disco
- **THEN** la valoración nueva no está marcada

### Requirement: Suspensión y exportación
Una cuenta con suspensión social SHALL NOT poder marcar una valoración ni hacer pública una escucha, y SHALL poder quitar una marca.
La exportación de datos SHALL incluir las marcas.

#### Scenario: Cuenta suspendida
- **WHEN** una cuenta suspendida intenta hacer pública su valoración
- **THEN** la API responde con el código de suspensión y la valoración sigue sin marca

#### Scenario: Exportación
- **WHEN** una persona con valoraciones marcadas exporta sus datos
- **THEN** el archivo incluye esas marcas
