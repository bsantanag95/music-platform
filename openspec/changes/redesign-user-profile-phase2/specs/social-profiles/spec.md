## ADDED Requirements

### Requirement: Cuerpo del perfil en filas

En los niveles autorizado y dueño, después de la franja de identidad, el cuerpo del perfil
SHALL componerse en filas a todo el ancho del contenedor, en este orden: "En rotación";
"Empieza por aquí" junto a "Valoraciones destacadas"; "Reseñas" junto al diario; Favoritos;
"Listas" (las listas y las listas para completar del dueño) junto a la colección física; y
Conciertos. En una pantalla angosta, las secciones de una misma fila SHALL apilarse en ese
orden. Cuando una de las dos secciones de una fila no tiene contenido, la otra SHALL ocupar la
fila completa, sin hueco.

Cada sección SHALL tener un título, su recuento cuando lo tiene y, cuando existe una vista
completa de Nivel 3, un enlace a ella; SHALL NOT tener subtítulos ni numeración. Las vistas
previas SHALL ser acotadas y legibles sin controles propios: el diario SHALL mostrarse como
una tabla de sus entradas más recientes (fecha, obra y tipo de escucha) sin desplazamiento
interno; Favoritos SHALL mostrar las carátulas de sus álbumes y, al lado, sus artistas y
canciones; la colección física SHALL mostrar sus copias más recientes sin selector de modo de
visualización (que sigue en la vista completa). El perfil SHALL NOT repetir al final un
bloque aparte de enlaces a las vistas de Nivel 3.

Las acciones que requieren sesión sobre el contenido ajeno del perfil (guardar o seguir una
lista, seguir el progreso de una lista para completar) SHALL ofrecerse solo a un visitante autenticado
que no es el dueño.

#### Scenario: Filas completas en escritorio

- **WHEN** un visitante autorizado abre en escritorio un perfil con contenido en todas las
  secciones
- **THEN** ve "En rotación", luego "Empieza por aquí" y "Valoraciones destacadas" lado a lado,
  luego "Reseñas" y el diario lado a lado, Favoritos, "Listas" y la colección
  física lado a lado, y Conciertos

#### Scenario: Una sección de la fila vacía

- **WHEN** el dueño no tiene valoraciones destacadas pero sí ítems en "Empieza por aquí"
- **THEN** "Empieza por aquí" ocupa la fila completa

#### Scenario: Diario sin caja de desplazamiento

- **WHEN** un visitante autorizado ve el diario en el perfil
- **THEN** ve una tabla con las entradas más recientes, completa sin desplazarse dentro de
  ella, y un enlace al diario completo

#### Scenario: Colección sin selector de vista

- **WHEN** un visitante autorizado ve la colección física en el perfil
- **THEN** ve sus copias más recientes sin selector de modo de visualización, con un enlace a
  la colección completa, donde sí puede cambiarlo

#### Scenario: Visitante sin sesión

- **WHEN** un visitante sin sesión ve las listas y las listas para completar de un perfil público
- **THEN** no se le ofrecen las acciones de guardar, seguir ni seguir el progreso

#### Scenario: Sin bloque de enlaces al final

- **WHEN** un visitante autorizado llega al final del perfil
- **THEN** no encuentra una lista aparte de enlaces a las vistas completas: cada sección
  enlaza la suya desde su título

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
- **Nivel 2** (exploración de minutos, resumida): en filas (ver "Cuerpo del perfil en
  filas"), en este orden, "En rotación", "Empieza por aquí" (ver `profile-showcase`) con
  "Valoraciones destacadas" (ver `rating-highlights`), "Reseñas" con el diario, Favoritos,
  "Listas" con la colección física, y Conciertos.
- **Nivel 3** (inmersión bajo demanda, accesible desde el enlace de cada sección del Nivel 2
  o de la franja, nunca precargada): la huella de gusto completa, el diario completo, todas
  las valoraciones, todas las listas, los recorridos de artista y la colección física.

"En rotación" SHALL ubicarse antes de "Empieza por aquí"; "Empieza por aquí" antes de
"Valoraciones destacadas" (a su izquierda en la misma fila); y "Valoraciones destacadas"
antes de "Reseñas". "Artistas seguidos" SHALL ubicarse en la franja de identidad, antes de
todas las secciones del Nivel 2. La huella de gusto completa (curvas y crestas) SHALL NOT
renderizarse junto a estas secciones de Nivel 2: SHALL vivir en el Nivel 3, accesible
mediante un enlace desde el perfil.

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
- **THEN** ve la sección en el Nivel 2, después de "En rotación" y antes de "Valoraciones
  destacadas"; un visitante no autorizado de un perfil privado no la ve

#### Scenario: El perfil no repite álbumes favoritos

- **WHEN** un visitante autorizado abre un perfil cuyo dueño tiene favoritos de álbum
- **THEN** esos álbumes aparecen solo en la sección Favoritos, no en una sección aparte de
  "Álbumes favoritos"

#### Scenario: "Reseñas" en el nivel autorizado

- **WHEN** un visitante autorizado abre un perfil cuyo dueño ha escrito al menos una reseña
  de álbum
- **THEN** ve la sección "Reseñas" después de "Valoraciones destacadas", junto al diario,
  dentro del Nivel 2; un visitante no autorizado de un perfil privado no la ve

#### Scenario: "En rotación" en el nivel autorizado

- **WHEN** un visitante autorizado abre un perfil cuyo dueño tiene actividad de diario
  reciente visible para él que alcanza el umbral de rotación
- **THEN** ve la sección "En rotación" como primera del Nivel 2, después de la franja de
  identidad; un visitante no autorizado de un perfil privado no la ve

#### Scenario: "Exploración" en el nivel autorizado

- **WHEN** un visitante autorizado abre un perfil cuyo dueño sigue a al menos un artista
- **THEN** ve esos artistas bajo "Artistas seguidos" en la franja de identidad, antes de
  las secciones del Nivel 2; un visitante no autorizado de un perfil privado no la ve

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
- **THEN** ve la sección "Valoraciones destacadas" junto a "Empieza por aquí" y antes de
  "Reseñas"
