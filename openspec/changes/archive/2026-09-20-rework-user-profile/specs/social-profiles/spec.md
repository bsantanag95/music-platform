## MODIFIED Requirements

### Requirement: Composición del perfil por nivel de acceso

El perfil SHALL componerse desde un único árbol de componentes con tres niveles de acceso
determinados por la relación del visitante: no autorizado, autorizado (público o seguidor
aprobado) y dueño. La identidad extendida SHALL renderizarse en los tres niveles. El aviso
de perfil privado y su llamada a la acción de seguir SHALL renderizarse solo en el nivel no
autorizado sobre un perfil privado.

La huella de gusto, la sección "Álbumes favoritos", la sección "Valoraciones destacadas", la
sección "Reseñas", la sección "En rotación", la sección "Exploración" (artistas seguidos),
los destacados, el himno y los estantes de contenido SHALL renderizarse solo en los niveles
autorizado y dueño, organizados en tres niveles de profundidad:

- **Nivel 1** (comprensible en segundos): identidad extendida y la Tarjeta de Identidad
  (destacados definitorios y himno; ver `profile-showcase`).
- **Nivel 2** (exploración de minutos, resumida): en este orden, "Álbumes favoritos",
  "Valoraciones destacadas" (ver `rating-highlights`), "Reseñas", "En rotación",
  "Exploración" y un resumen de listas destacadas.
- **Nivel 3** (inmersión bajo demanda, accesible desde enlaces del Nivel 2, nunca
  precargada): la huella de gusto completa, el diario completo, todas las valoraciones,
  todas las listas, los recorridos de artista y la colección física.

La sección "Álbumes favoritos" SHALL ubicarse antes de "Valoraciones destacadas"; ésta antes
de "Reseñas"; "Reseñas" antes de "En rotación"; y "En rotación" antes de "Exploración". La
huella de gusto completa (curvas y crestas) SHALL NOT renderizarse junto a estas secciones
de Nivel 2: SHALL vivir en el Nivel 3, accesible mediante un enlace desde el perfil.

#### Scenario: Perfil privado sin autorización

- **WHEN** se compone la vista de un perfil privado para un visitante sin autorización
- **THEN** se muestran la identidad extendida, el aviso de perfil privado y la acción de
  seguir o solicitar, y nada más

#### Scenario: Estante de contenido vacío

- **WHEN** un visitante autorizado abre un perfil cuyo diario, favoritos, listas o
  colección no tienen elementos visibles
- **THEN** ese estante no se muestra y el resto del perfil se compone sin espacios vacíos

#### Scenario: Álbumes favoritos en el nivel autorizado

- **WHEN** un visitante autorizado abre un perfil cuyo dueño tiene álbumes favoritos
  fijados visibles para él
- **THEN** ve la sección "Álbumes favoritos"; un visitante no autorizado de un perfil
  privado no la ve

#### Scenario: "Reseñas" en el nivel autorizado

- **WHEN** un visitante autorizado abre un perfil cuyo dueño ha escrito al menos una reseña
  de álbum
- **THEN** ve la sección "Reseñas" entre "Valoraciones destacadas" y "En rotación", dentro
  del Nivel 2; un visitante no autorizado de un perfil privado no la ve

#### Scenario: "En rotación" en el nivel autorizado

- **WHEN** un visitante autorizado abre un perfil cuyo dueño tiene actividad de diario
  reciente visible para él que alcanza el umbral de rotación
- **THEN** ve la sección "En rotación" entre "Reseñas" y "Exploración", dentro del Nivel 2;
  un visitante no autorizado de un perfil privado no la ve

#### Scenario: "Exploración" en el nivel autorizado

- **WHEN** un visitante autorizado abre un perfil cuyo dueño sigue a al menos un artista
- **THEN** ve la sección "Exploración" con esos artistas, después de "En rotación", dentro
  del Nivel 2; un visitante no autorizado de un perfil privado no la ve

#### Scenario: Estado bloqueado

- **WHEN** el visitante y el dueño del perfil tienen una relación de bloqueo
- **THEN** el perfil muestra el estado de bloqueo y su acción correspondiente, sin huella,
  álbumes favoritos, "Reseñas", "En rotación", "Exploración", destacados ni estantes

#### Scenario: Huella de gusto degradada al Nivel 3

- **WHEN** un visitante autorizado abre un perfil
- **THEN** no ve los gráficos de la huella de gusto junto a los destacados, las
  valoraciones destacadas ni la exploración; los encuentra en la vista de Nivel 3 enlazada
  desde el perfil

#### Scenario: Valoraciones destacadas en el nivel autorizado

- **WHEN** un visitante autorizado abre un perfil cuyo dueño tiene valoraciones destacadas
  visibles para él
- **THEN** ve la sección "Valoraciones destacadas" entre "Álbumes favoritos" y "Reseñas"

## ADDED Requirements

### Requirement: Composición visual única para dueño y visitante autorizado

La vista del dueño SHALL usar la misma composición estructural (columnas y orden de
secciones) que la vista de un visitante autorizado sobre el mismo perfil. Las capas propias
del dueño (edición inline, panel de gestión, previsualización "cómo te ven") SHALL
superponerse a esa misma composición en vez de reemplazarla por una estructura distinta.

#### Scenario: El dueño ve la misma estructura que un visitante autorizado

- **WHEN** el dueño abre su propio perfil
- **THEN** ve las mismas columnas y el mismo orden de secciones que vería un seguidor
  aprobado, con los controles de edición superpuestos a esa estructura

#### Scenario: La previsualización no introduce una estructura distinta

- **WHEN** el dueño activa la previsualización de "cómo te ven"
- **THEN** ve la misma composición estructural, filtrada según el nivel de acceso
  simulado, sin cambiar de columnas ni de orden de secciones
