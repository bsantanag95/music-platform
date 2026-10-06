## MODIFIED Requirements

### Requirement: Listado propio de la wishlist
El sistema SHALL permitir al usuario autenticado ver su wishlist completa, paginada, ordenada por
recencia por defecto, mostrando por entrada el álbum (con su carátula cuando exista), su artista,
el formato (o "cualquier formato" cuando esté ausente), los atributos y la nota. El sistema SHALL
aceptar búsqueda por texto (`q`) sobre el título del álbum y el nombre del artista acreditado
(coincidencia parcial sin distinguir mayúsculas), y orden (`sort`) entre recencia (default) y
alfabético por título. La wishlist SHALL NOT tener ninguna vista pública ni de terceros por `username`:
solo el dueño puede listarla. Su única exposición individual fuera del listado propio es el feed
de actividad de seguidos, según la audiencia de cada entrada (ver "Audiencia de la entrada de
deseo"). El listado propio SHALL mostrar la audiencia de cada entrada.

#### Scenario: Ver la wishlist propia
- **WHEN** un usuario autenticado abre la pestaña "Quiero" de su colección
- **THEN** ve sus entradas de deseo paginadas, con la carátula del álbum cuando está disponible

#### Scenario: Buscar por título de álbum
- **WHEN** el usuario busca un título en su wishlist
- **THEN** ve únicamente las entradas cuyo álbum coincide parcialmente con ese texto

#### Scenario: Wishlist vacía
- **WHEN** un usuario sin entradas de deseo abre la pestaña "Quiero"
- **THEN** ve un estado vacío localizado y no un error técnico

#### Scenario: Sesión requerida para listar
- **WHEN** una request sin sesión pide el listado propio de la wishlist
- **THEN** la API responde `401` con código `AUTH_REQUIRED`

#### Scenario: Sin superficie pública
- **WHEN** un visitante intenta consultar la wishlist de otro usuario por su `username`
- **THEN** el sistema no ofrece ninguna ruta ni endpoint para esa consulta

### Requirement: Participación anónima en el conteo agregado

Las entradas de la wishlist SHALL contar, como personas distintas, en el conteo agregado
"lo buscan" del bloque de comunidad del álbum (capacidad `album-community-stats`), con el
umbral mínimo de esa capacidad. Ese conteo SHALL NOT revelar la identidad de ninguna persona y SHALL contar
todas las entradas, con independencia de su audiencia. Fuera de ese conteo y del listado propio,
la wishlist solo SHALL exponerse en el feed de actividad, entrada por entrada, según su
audiencia.

#### Scenario: Wishlist privada en el total

- **WHEN** 12 personas tienen un álbum en su wishlist
- **THEN** el bloque de comunidad muestra "12 lo buscan" y ninguna superficie permite ver
  quiénes son

## ADDED Requirements

### Requirement: Audiencia de la entrada de deseo
Cada entrada de deseo SHALL tener una audiencia entre `private`, `followers` y `public`. Al
crear entradas, el lote SHALL aceptar una audiencia única para todas sus variantes, resuelta con
la precedencia de `default-audience` (explícita, preferencia del usuario, default del tipo
`followers`); el alta rápida del menú del álbum, sin formulario, SHALL usar esa misma
resolución. El dueño SHALL poder cambiar la audiencia de una entrada desde la pestaña "Busco" de
`/me/collection`. Las entradas creadas antes de esta capacidad SHALL quedar `private`. Una
audiencia fuera del vocabulario SHALL responder `400` con código `VALIDATION_ERROR`. La acción
"Aplicar a lo existente" de `default-audience` SHALL NOT modificar la audiencia de la wishlist.

#### Scenario: Las entradas existentes quedan privadas
- **WHEN** se despliega esta capacidad sobre una base con entradas de deseo
- **THEN** todas las entradas existentes tienen audiencia `private` y ninguna aparece en el feed

#### Scenario: Alta con audiencia elegida
- **WHEN** un usuario agrega dos variantes de un álbum a su wishlist eligiendo `public`
- **THEN** ambas entradas nacen `public`

#### Scenario: Alta rápida sin audiencia explícita
- **WHEN** un usuario sin audiencia por defecto usa el alta rápida "Lo busco"
- **THEN** la entrada nace `followers`

#### Scenario: Cambiar la audiencia desde el listado propio
- **WHEN** el dueño cambia una entrada de `followers` a `private` en la pestaña "Busco"
- **THEN** la entrada queda `private` y deja de aparecer en el feed de sus seguidores

#### Scenario: Audiencia inválida
- **WHEN** una petición de alta o edición envía una audiencia fuera de `private`, `followers` y
  `public`
- **THEN** la API responde `400` con código `VALIDATION_ERROR` y no modifica nada
