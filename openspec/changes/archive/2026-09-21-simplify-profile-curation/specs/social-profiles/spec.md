## REMOVED Requirements

### Requirement: Composición del perfil por nivel de acceso

**Reason**: Listaba la sección "Álbumes favoritos", que se retira, y tenía un escenario propio
de esa sección. Un requisito MODIFIED no puede omitir escenarios existentes, así que se
reemplaza por uno con nombre nuevo.

**Migration**: Sustituido por "Composición del perfil por niveles de acceso", con el Nivel 2
abriendo en "Empieza por aquí".

## ADDED Requirements

### Requirement: Composición del perfil por niveles de acceso

El perfil SHALL componerse desde un único árbol de componentes con tres niveles de acceso
determinados por la relación del visitante: no autorizado, autorizado (público o seguidor
aprobado) y dueño. La identidad extendida SHALL renderizarse en los tres niveles. El aviso
de perfil privado y su llamada a la acción de seguir SHALL renderizarse solo en el nivel no
autorizado sobre un perfil privado.

La huella de gusto, la sección "Empieza por aquí", la sección "Valoraciones destacadas", la
sección "Reseñas", la sección "En rotación", la sección "Exploración" (artistas seguidos), la
Tarjeta de Identidad y los estantes de contenido SHALL renderizarse solo en los niveles
autorizado y dueño, organizados en tres niveles de profundidad:

- **Nivel 1** (comprensible en segundos): identidad extendida y la Tarjeta de Identidad
  (artista definitorio, álbum definitorio e himno; ver `profile-showcase`).
- **Nivel 2** (exploración de minutos, resumida): en este orden, "Empieza por aquí" (ver
  `profile-showcase`), "Valoraciones destacadas" (ver `rating-highlights`), "Reseñas", "En
  rotación", "Exploración" y un resumen de listas destacadas.
- **Nivel 3** (inmersión bajo demanda, accesible desde enlaces del Nivel 2, nunca
  precargada): la huella de gusto completa, el diario completo, todas las valoraciones,
  todas las listas, los recorridos de artista y la colección física.

La sección "Empieza por aquí" SHALL ubicarse antes de "Valoraciones destacadas"; ésta antes
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
- **THEN** ve la sección "En rotación" entre "Reseñas" y "Exploración", dentro del Nivel 2;
  un visitante no autorizado de un perfil privado no la ve

#### Scenario: "Exploración" en el nivel autorizado

- **WHEN** un visitante autorizado abre un perfil cuyo dueño sigue a al menos un artista
- **THEN** ve la sección "Exploración" con esos artistas, después de "En rotación", dentro
  del Nivel 2; un visitante no autorizado de un perfil privado no la ve

#### Scenario: Estado bloqueado

- **WHEN** el visitante y el dueño del perfil tienen una relación de bloqueo
- **THEN** el perfil muestra el estado de bloqueo y su acción correspondiente, sin huella,
  "Empieza por aquí", "Reseñas", "En rotación", "Exploración", Tarjeta de Identidad ni
  estantes

#### Scenario: Huella de gusto degradada al Nivel 3

- **WHEN** un visitante autorizado abre un perfil
- **THEN** no ve los gráficos de la huella de gusto junto a "Empieza por aquí", las
  valoraciones destacadas ni la exploración; los encuentra en la vista de Nivel 3 enlazada
  desde el perfil

#### Scenario: Valoraciones destacadas en el nivel autorizado

- **WHEN** un visitante autorizado abre un perfil cuyo dueño tiene valoraciones destacadas
  visibles para él
- **THEN** ve la sección "Valoraciones destacadas" entre "Empieza por aquí" y "Reseñas"
