## ADDED Requirements

### Requirement: Cabecera del perfil

En los niveles autorizado y dueño, el perfil SHALL abrirse con una cabecera a todo el ancho
que reúne, en un mismo bloque, la identidad extendida de la persona (avatar, nombre visible
como título principal, nombre de usuario, pronombres, ubicación, antigüedad, hora local
cuando corresponde, bio y enlaces), sus acciones (seguir o su estado, compartir y, cuando
corresponde, bloquear, reportar o moderar), los recuentos de seguidores y seguidos, los
seguidores en común y la afinidad con el visitante cuando existen, y la Tarjeta de Identidad
(ver `profile-showcase`) bajo el rótulo «Identidad musical». Cuando el dueño eligió un álbum
definitorio, su carátula SHALL usarse, difuminada, como fondo decorativo de la cabecera. La
bio SHALL presentarse como una cita. Debajo de la cabecera, el perfil SHALL ofrecer una barra
de navegación fija con anclas a sus secciones visibles (Resumen, Diario, Reseñas, Favoritos,
Listas y Colección, cada una solo si tiene contenido visible y con su recuento cuando lo
tiene). El perfil SHALL NOT usar una columna lateral fija: el contenido debajo de la cabecera
SHALL ocupar todo el ancho del contenedor.

#### Scenario: Perfil público con identidad completa
- **WHEN** un visitante sin sesión abre un perfil público cuyo dueño eligió artista, álbum e
  himno definitorios
- **THEN** ve en la primera pantalla el nombre, la bio como cita, «Seguir», «Compartir», los
  recuentos y los tres elementos de «Identidad musical», con la carátula del álbum
  difuminada de fondo

#### Scenario: Sin álbum definitorio
- **WHEN** el dueño no eligió álbum definitorio
- **THEN** la cabecera usa un fondo neutro y muestra los elementos de la Tarjeta de
  Identidad que existan, sin huecos

#### Scenario: Anclas solo a secciones con contenido
- **WHEN** un visitante abre un perfil sin colección física visible
- **THEN** la barra de navegación no ofrece el ancla «Colección»

#### Scenario: Identidad musical en un teléfono
- **WHEN** un visitante abre un perfil con artista, álbum e himno definitorios en una
  pantalla de 390 px
- **THEN** los tres elementos de «Identidad musical» se ven completos dentro de la pantalla,
  con sus títulos recortados si no caben

#### Scenario: Artista definitorio con foto
- **WHEN** el artista definitorio tiene una foto disponible en el catálogo
- **THEN** la Tarjeta de Identidad muestra esa foto, igual que el resto del perfil

### Requirement: Franja de identidad

Inmediatamente después de la cabecera, en los niveles autorizado y dueño, el perfil SHALL
mostrar una franja a todo el ancho con, cuando tengan contenido, tres partes separadas: la
ficha musical (ver `profile-music-identity`), el resumen de la huella de gusto (ver
`taste-fingerprint`) con su década predominante destacada, y los artistas que el dueño sigue
bajo el rótulo «Artistas seguidos», con un enlace a la lista completa. Cada parte SHALL
omitirse cuando no tiene contenido, sin dejar hueco, y la franja SHALL omitirse por completo
cuando ninguna lo tiene.

#### Scenario: Franja completa
- **WHEN** un visitante autorizado abre un perfil con ficha, huella calculable y artistas
  seguidos
- **THEN** ve debajo de la cabecera la ficha, la huella con su década predominante y los
  artistas seguidos, uno junto a otro en escritorio

#### Scenario: Sin huella de gusto
- **WHEN** la huella de gusto no tiene datos suficientes para el visitante
- **THEN** la franja muestra la ficha y los artistas seguidos sin espacio vacío

## MODIFIED Requirements

### Requirement: Composición del perfil por niveles de acceso

El perfil SHALL componerse desde un único árbol de componentes con tres niveles de acceso
determinados por la relación del visitante: no autorizado, autorizado (público o seguidor
aprobado) y dueño. La identidad extendida SHALL renderizarse en los tres niveles. El aviso
de perfil privado y su llamada a la acción de seguir SHALL renderizarse solo en el nivel no
autorizado sobre un perfil privado.

La huella de gusto, la sección "Empieza por aquí", la sección "Valoraciones destacadas", la
sección "Reseñas", la sección "En rotación", la sección "Artistas seguidos" (antes
"Exploración"), la Tarjeta de Identidad y los estantes de contenido SHALL renderizarse solo
en los niveles autorizado y dueño, organizados en tres niveles de profundidad:

- **Nivel 1** (comprensible en segundos): la cabecera del perfil, con la identidad extendida
  y la Tarjeta de Identidad (artista definitorio, álbum definitorio e himno; ver
  `profile-showcase`), y la franja de identidad (ficha, resumen de la huella de gusto y
  "Artistas seguidos").
- **Nivel 2** (exploración de minutos, resumida): en este orden, "Empieza por aquí" (ver
  `profile-showcase`), "Valoraciones destacadas" (ver `rating-highlights`), "Reseñas", "En
  rotación" y un resumen de listas destacadas.
- **Nivel 3** (inmersión bajo demanda, accesible desde enlaces del Nivel 2, nunca
  precargada): la huella de gusto completa, el diario completo, todas las valoraciones,
  todas las listas, los recorridos de artista y la colección física.

La sección "Empieza por aquí" SHALL ubicarse antes de "Valoraciones destacadas"; ésta antes
de "Reseñas"; y "Reseñas" antes de "En rotación". "Artistas seguidos" SHALL ubicarse en la
franja de identidad, antes de "Empieza por aquí". La huella de gusto completa (curvas y
crestas) SHALL NOT renderizarse junto a estas secciones de Nivel 2: SHALL vivir en el
Nivel 3, accesible mediante un enlace desde el perfil.

#### Scenario: Perfil privado sin autorización

- **WHEN** se compone la vista de un perfil privado para un visitante sin autorización
- **THEN** se muestran la identidad extendida, el aviso de perfil privado y la acción de
  seguir o solicitar, y nada más

#### Scenario: Estante de contenido vacío

- **WHEN** un visitante autorizado abre un perfil cuyo diario, favoritos, listas o
  colección no tienen elementos visibles
- **THEN** ese estante no se muestra y el resto del perfil se compone sin espacios vacíos

#### Scenario: "Empieza por aquí" en el nivel autorizado

- **WHEN** un visitante autorizado abre un perfil cuyo dueño tiene ítems en "Empieza por aquí"
- **THEN** ve la sección como primera del Nivel 2; un visitante no autorizado de un perfil
  privado no la ve

#### Scenario: El perfil no repite álbumes favoritos

- **WHEN** un visitante autorizado abre un perfil cuyo dueño tiene favoritos de álbum
- **THEN** esos álbumes aparecen solo en la sección Favoritos, no en una sección aparte de
  "Álbumes favoritos"

#### Scenario: "Reseñas" en el nivel autorizado

- **WHEN** un visitante autorizado abre un perfil cuyo dueño ha escrito al menos una reseña
  de álbum
- **THEN** ve la sección "Reseñas" entre "Valoraciones destacadas" y "En rotación", dentro
  del Nivel 2; un visitante no autorizado de un perfil privado no la ve

#### Scenario: "En rotación" en el nivel autorizado

- **WHEN** un visitante autorizado abre un perfil cuyo dueño tiene actividad de diario
  reciente visible para él que alcanza el umbral de rotación
- **THEN** ve la sección "En rotación" después de "Reseñas", dentro del Nivel 2; un
  visitante no autorizado de un perfil privado no la ve

#### Scenario: "Exploración" en el nivel autorizado

- **WHEN** un visitante autorizado abre un perfil cuyo dueño sigue a al menos un artista
- **THEN** ve esos artistas bajo "Artistas seguidos" en la franja de identidad, antes de
  "Empieza por aquí"; un visitante no autorizado de un perfil privado no la ve

#### Scenario: Estado bloqueado

- **WHEN** el visitante y el dueño del perfil tienen una relación de bloqueo
- **THEN** el perfil muestra el estado de bloqueo y su acción correspondiente, sin huella,
  "Empieza por aquí", "Reseñas", "En rotación", "Artistas seguidos", Tarjeta de Identidad
  ni estantes

#### Scenario: Huella de gusto degradada al Nivel 3

- **WHEN** un visitante autorizado abre un perfil
- **THEN** no ve los gráficos de la huella de gusto junto a "Empieza por aquí", las
  valoraciones destacadas ni los artistas seguidos; los encuentra en la vista de Nivel 3
  enlazada desde el perfil

#### Scenario: Valoraciones destacadas en el nivel autorizado

- **WHEN** un visitante autorizado abre un perfil cuyo dueño tiene valoraciones destacadas
  visibles para él
- **THEN** ve la sección "Valoraciones destacadas" entre "Empieza por aquí" y "Reseñas"
