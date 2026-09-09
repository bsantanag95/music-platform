## ADDED Requirements

### Requirement: Sección "En rotación" derivada del diario

El perfil SHALL exponer una sección **"En rotación"** que muestre las canciones y álbumes
que el dueño ha registrado con más presencia en su **diario** (`listen_entry`) durante los
últimos **30 días**. La sección SHALL derivarse **exclusivamente** de entradas de diario:
SHALL NOT tomar señal de valoraciones, favoritos, reseñas ni reacciones. Una entrada de
diario cuyo objetivo es un **artista** SHALL NOT contribuir a "En rotación" (el artista es
una unidad demasiado gruesa para la señal de rotación).

La sección SHALL presentar dos bloques: **Canciones** (señal primaria) y **Álbumes**
(agrupación contextual). Un bloque vacío SHALL NOT renderizarse; si ambos bloques están
vacíos, la sección completa SHALL NOT renderizarse.

#### Scenario: Canción escuchada recientemente aparece en rotación

- **WHEN** el dueño registró una canción en su diario dentro de los últimos 7 días con una
  presencia que alcanza el umbral de rotación
- **THEN** esa canción aparece en el bloque "Canciones" de la sección "En rotación"

#### Scenario: Actividad fuera de la ventana no cuenta

- **WHEN** la única entrada de diario del dueño sobre una obra tiene más de 30 días
- **THEN** esa obra no aparece en "En rotación"

#### Scenario: La opinión no alimenta la rotación

- **WHEN** el dueño marcó un álbum como favorito y lo valoró con 5 estrellas pero no lo
  registró en el diario en los últimos 30 días
- **THEN** ese álbum no aparece en "En rotación"

#### Scenario: Sección vacía no se renderiza

- **WHEN** el dueño no tiene ninguna entrada de diario de canción ni de álbum en los
  últimos 30 días visible para el lector
- **THEN** la sección "En rotación" no aparece y el resto del perfil se compone sin
  espacios vacíos

### Requirement: Score de recencia y frecuencia

El estado "en rotación" de una entidad SHALL derivarse de un **score** basado en pesos
discretos de recencia sobre sus entradas de diario dentro de la ventana: entradas de los
últimos **7 días** SHALL pesar más que las de **8–21 días**, y estas más que las de **22–30
días**. Una entidad SHALL entrar en "En rotación" solo si su score alcanza o supera un
umbral configurable. La ventana, los pesos y el umbral SHALL vivir como constantes
nombradas del servicio, ajustables sin migración de datos ni cambio de esta especificación.

El **score de una canción** SHALL sumar el peso de recencia de todas sus escuchas (repetir
sube el score de la canción). El **score de un álbum** SHALL sumar (a) el peso de recencia
de cada registro **explícito de álbum**, con un multiplicador que lo hace pesar más que una
escucha de canción, y (b) por el roll-up, un aporte **plano por canción distinta** del
álbum escuchada en la ventana — independiente de cuántas veces se repitió esa canción y de
su score de canción. En consecuencia, repetir muchas veces **la misma canción** SHALL NOT,
por sí solo, meter el **álbum** de esa canción en rotación.

#### Scenario: Recencia domina sobre volumen antiguo

- **WHEN** una obra tiene una entrada de hace 3 días y otra obra tiene dos entradas de hace
  28 días
- **THEN** la primera obra puntúa al menos tan alto como la segunda (peso de tramo actual ≥
  suma de dos tramos residuales)

#### Scenario: Registro explícito de álbum pesa más

- **WHEN** el dueño registró un álbum completo dos veces en 20 días, y otro álbum recibió
  el mismo número de escuchas de canciones sueltas en la misma ventana
- **THEN** el álbum registrado explícitamente puntúa más alto

#### Scenario: Repetir una canción no eleva su álbum

- **WHEN** el dueño registró la misma canción de un álbum 6 veces en 10 días y ninguna otra
  canción de ese álbum
- **THEN** el álbum no entra en "En rotación" por esa repetición (sí puede entrar la
  canción en el bloque "Canciones")

### Requirement: Heurística experimental de álbum en rotación

El bloque "Álbumes" de "En rotación" SHALL poblarse desde dos fuentes: (a) entradas de
diario cuyo objetivo es el álbum (`release_group`), y (b) un **roll-up** de entradas de
canción al álbum de esa canción. Esta heurística SHALL tratarse como **experimental** — un
punto de partida ajustable, no una definición de producto.

Para el roll-up, una canción que aparece en varios álbumes SHALL atribuirse a un solo
álbum de forma **determinista**: entre los release-groups de categoría `studio` en que
aparece la canción, el de fecha de primer lanzamiento más temprana (con desempates
estables). Una canción que no aparece en ningún release-group `studio` SHALL contribuir
solo al bloque "Canciones", no al de "Álbumes".

#### Scenario: Álbum entra por registro explícito

- **WHEN** el dueño registró un álbum completo en su diario con presencia suficiente en la
  ventana
- **THEN** el álbum aparece en el bloque "Álbumes"

#### Scenario: Álbum entra por roll-up de canciones distintas

- **WHEN** el dueño registró tres canciones distintas del mismo álbum de estudio dentro de
  la ventana, con presencia combinada suficiente
- **THEN** el álbum aparece en el bloque "Álbumes"

#### Scenario: Desambiguación determinista

- **WHEN** una canción registrada aparece tanto en el álbum de estudio original como en un
  compilado posterior
- **THEN** el roll-up atribuye la escucha al álbum de estudio original

### Requirement: "En rotación" respeta la audiencia del diario

La sección "En rotación" SHALL calcularse solo sobre las entradas de diario que el lector
tiene permitido ver según su relación con el dueño (misma regla que el listado del diario):
el dueño ve todas las suyas; un seguidor aprobado ve `followers` y `public`; un visitante
público ve solo `public`; sin acceso al perfil, la sección SHALL NOT aparecer. Si ninguna
entrada visible para el lector alcanza el umbral, la sección SHALL NOT aparecer para ese
lector.

#### Scenario: Entrada privada no aparece para un seguidor

- **WHEN** el dueño registró una canción con audiencia `private` y un seguidor aprobado
  abre su perfil
- **THEN** esa canción no aparece en la sección "En rotación" del seguidor

#### Scenario: Distinta rotación por relación

- **WHEN** el dueño tiene entradas `public` que alcanzan el umbral y entradas `followers`
  que también lo alcanzan
- **THEN** un visitante público ve solo las primeras y un seguidor aprobado ve ambas

#### Scenario: Sin acceso, sin sección

- **WHEN** un visitante sin autorización abre un perfil privado
- **THEN** la sección "En rotación" no aparece

### Requirement: Presentación de tono cultural

La sección "En rotación" SHALL presentarse como una declaración cultural ("qué está
sonando"), no como analítica ni gamificación. La sección SHALL NOT mostrar el score, el
número de escuchas, la antigüedad de la actividad, porcentajes, rachas, ni exponer el
algoritmo. Las canciones SHALL enlazar a la página de la canción y los álbumes a la página
del álbum. El orden interno SHALL ser por score descendente pero SHALL NOT mostrarse
numerado ni con posiciones.

#### Scenario: Sin métricas visibles

- **WHEN** un lector ve la sección "En rotación" de un perfil
- **THEN** ve títulos, artistas y carátulas con enlaces al catálogo, y ningún contador,
  número de veces, fecha relativa ni indicador de racha

#### Scenario: Enlaces al catálogo

- **WHEN** el lector toca una canción o un álbum de "En rotación"
- **THEN** llega a la página de esa canción o ese álbum en el catálogo

### Requirement: Endpoint de "En rotación"

El sistema SHALL exponer `GET /api/users/[username]/in-rotation` que devuelva la sección
"En rotación" del perfil filtrada por lo que el solicitante puede ver. SHALL responder
`404` con código `USER_NOT_FOUND` si el usuario no existe, y una forma vacía
(`{ inRotation: null }`) cuando el solicitante no tiene acceso al perfil o no hay actividad
que alcance el umbral — nunca un error para esos casos.

#### Scenario: Perfil inexistente

- **WHEN** se pide `/api/users/nadie/in-rotation` para un username que no existe
- **THEN** la API responde `404` con código `USER_NOT_FOUND`

#### Scenario: Sin acceso devuelve forma vacía

- **WHEN** un visitante sin autorización pide la rotación de un perfil privado
- **THEN** la API responde `200` con `{ inRotation: null }`, sin revelar si hay actividad
