# want-to-listen Specification

## Purpose

Señal prospectiva de intención ("quiero escuchar esto"), acotada a artista y álbum (release
group) — nunca canción. Es un marcador binario por usuario y objetivo, independiente de
favoritos, listas y del diario de escucha, salvo por una integración: registrar una escucha
de un objetivo retira automáticamente su entrada de Want to Listen, porque la intención ya se
cumplió.
## Requirements
### Requirement: Marcar y desmarcar un objetivo en Want to Listen
El sistema SHALL permitir a un usuario autenticado marcar o quitar de su lista Want to Listen
un artista o un álbum, de forma idempotente. Marcar un objetivo que ya está en la lista SHALL
NOT producir un error ni duplicar la entrada; quitar una entrada que no existe SHALL también
ser idempotente. Un usuario SHALL tener a lo sumo una entrada de Want to Listen por objetivo.

#### Scenario: Agregar un objetivo a Want to Listen
- **WHEN** un usuario autenticado marca como "quiero escuchar" un artista o álbum válido
- **THEN** el sistema crea la entrada y la refleja en su listado propio

#### Scenario: Marcar un objetivo que ya está en la lista
- **WHEN** el usuario marca un objetivo que ya tenía en su lista Want to Listen
- **THEN** la operación es idempotente, no crea duplicados y responde con la entrada existente

#### Scenario: Quitar de Want to Listen
- **WHEN** el usuario quita de su lista un objetivo que tenía marcado
- **THEN** la entrada se elimina y desaparece de su listado propio

#### Scenario: Quitar una entrada inexistente
- **WHEN** el usuario quita de su lista un objetivo que no tenía marcado
- **THEN** la operación es idempotente y no produce error

#### Scenario: Sesión requerida
- **WHEN** una request sin sesión intenta marcar o quitar una entrada de Want to Listen
- **THEN** la API responde `401` con código `AUTH_REQUIRED` y no modifica ningún dato

### Requirement: Alcance limitado a artista y álbum
El sistema SHALL rechazar cualquier intento de crear una entrada de Want to Listen sobre una
canción (recording) o sobre un tipo de objetivo que no sea `artist` ni `release-group`. El
sistema NO SHALL ofrecer ninguna acción de Want to Listen en las páginas de canción.

#### Scenario: Intento de Want to Listen sobre una canción
- **WHEN** la API recibe una solicitud de Want to Listen cuyo objetivo es una canción
- **THEN** responde `400` con código `VALIDATION_ERROR` y no crea ninguna entrada

#### Scenario: Objetivo inválido o inexistente
- **WHEN** el sistema recibe una entrada de Want to Listen cuyo objetivo (artista o álbum) no
  existe
- **THEN** la API responde un error de validación y no crea ninguna entrada

#### Scenario: Sin acción de Want to Listen en canciones
- **WHEN** un usuario abre la página de una canción
- **THEN** no encuentra ninguna acción para agregarla a Want to Listen

### Requirement: Listado propio de Want to Listen
El sistema SHALL permitir al usuario autenticado listar su propia lista Want to Listen,
paginada, por defecto en orden cronológico descendente por fecha de creación de la entrada.
Cada entrada SHALL incluir su objetivo (tipo, id, título y carátula cuando el objetivo es un
álbum). El listado SHALL mostrar únicamente entradas del usuario que lo consulta — Want to
Listen no SHALL tener ninguna vista pública ni de terceros. El listado SHALL admitir un filtro
opcional por tipo (`artist` o `release-group`) y un orden opcional — `recent` (por defecto),
`oldest` o `alpha` (por título, sin distinguir mayúsculas) — aplicados en el servidor sobre
toda la lista, y SHALL devolver la cantidad de entradas por tipo calculada sin el filtro de
tipo. Un tipo u orden inválido SHALL responder `400` con `VALIDATION_ERROR`.

#### Scenario: Listar Want to Listen propio
- **WHEN** un usuario autenticado abre su lista Want to Listen
- **THEN** ve sus entradas ordenadas de la más reciente a la más antigua, paginadas, cada una
  con su objetivo y su carátula si es un álbum

#### Scenario: Lista vacía
- **WHEN** un usuario sin entradas abre su lista Want to Listen
- **THEN** ve un estado vacío localizado y no un error técnico

#### Scenario: Sesión requerida
- **WHEN** una request sin sesión pide el listado propio de Want to Listen
- **THEN** la API responde `401` con código `AUTH_REQUIRED`

#### Scenario: Sin superficie pública
- **WHEN** un visitante intenta consultar la lista Want to Listen de otro usuario por su
  `username`
- **THEN** el sistema no ofrece ninguna ruta ni endpoint para esa consulta

#### Scenario: Filtro por tipo con conteos completos
- **WHEN** un usuario con 2 artistas y 4 álbumes pide su lista con `type=artist`
- **THEN** recibe solo los 2 artistas y `counts` dice 2 artistas y 4 álbumes

#### Scenario: Orden alfabético
- **WHEN** pide su lista con `sort=alpha`
- **THEN** las entradas vienen por título sin distinguir mayúsculas, también en las páginas siguientes

#### Scenario: Parámetro inválido
- **WHEN** pide su lista con `type=recording` o `sort=random`
- **THEN** la API responde `400` con `VALIDATION_ERROR`

### Requirement: Auto-remoción de Want to Listen al registrar una escucha
El sistema SHALL eliminar automáticamente la entrada de Want to Listen de un usuario para un
artista o álbum cuando ese usuario registra una escucha (diario) del mismo objetivo. Esta
remoción SHALL ocurrir como parte del mismo flujo de registro de la escucha, sin acción manual
adicional del usuario, y SHALL NOT afectar entradas de Want to Listen de otros usuarios sobre
el mismo objetivo.

#### Scenario: Registrar una escucha retira el objetivo de la lista
- **WHEN** un usuario con un álbum en su lista Want to Listen registra una escucha de ese
  mismo álbum
- **THEN** la entrada se elimina y el álbum deja de aparecer en su listado de Want to Listen

#### Scenario: Registrar una escucha sin entrada previa
- **WHEN** un usuario registra una escucha de un objetivo que no estaba en su lista Want to
  Listen
- **THEN** el registro de la escucha se completa con normalidad y no se crea ni modifica
  ninguna entrada de Want to Listen

#### Scenario: La auto-remoción no afecta a otros usuarios
- **WHEN** un usuario registra una escucha de un artista que otro usuario distinto tiene en su
  propia lista Want to Listen
- **THEN** la entrada de Want to Listen del otro usuario permanece sin cambios

#### Scenario: Escucha de una canción no afecta la lista
- **WHEN** un usuario registra una escucha de una canción
- **THEN** no se elimina ninguna entrada de Want to Listen, dado que las canciones no
  participan de esta lista

### Requirement: Acción de Want to Listen en las páginas de catálogo
El sistema SHALL ofrecer en las páginas de artista y álbum una acción autenticada para marcar
o quitar el objetivo de Want to Listen, con estados de carga, éxito, error y sesión requerida,
que SHALL NOT bloquear la carga del contenido musical. En toda la interfaz la acción y su
estado SHALL rotularse **"Pendiente"** (no "Quiero escuchar"), para no confundirse con la
wishlist física ("En tu búsqueda"). En la página de álbum la acción SHALL vivir dentro del
panel "Tu relación" (capacidad `album-personal-panel`).

#### Scenario: Acción sin sesión
- **WHEN** un visitante no autenticado pulsa la acción de Want to Listen en una página de
  artista o álbum
- **THEN** se le solicita iniciar sesión y no se crea ninguna entrada

#### Scenario: Alternar Want to Listen
- **WHEN** un usuario autenticado pulsa el botón de Want to Listen en una página de artista o
  álbum
- **THEN** la entrada se marca o se quita y el estado de la UI se actualiza con confirmación
  accesible

#### Scenario: Rótulo Pendiente
- **WHEN** una persona ve la acción de Want to Listen en cualquier idioma soportado
- **THEN** la acción se rotula con la traducción de "Pendiente" y no con "Quiero escuchar"

### Requirement: Independencia de Want to Listen
El sistema SHALL tratar Want to Listen como una señal independiente de favoritos, listas,
ratings y comentarios: marcar o quitar una entrada SHALL NOT crear, modificar ni eliminar
ningún favorito, lista, rating ni comentario del mismo objetivo, y viceversa.

#### Scenario: Want to Listen sin efectos colaterales
- **WHEN** un usuario agrega a Want to Listen un objetivo que ya tiene como favorito y en una
  lista propia
- **THEN** el favorito y la pertenencia a la lista no cambian

#### Scenario: Otras señales no afectan Want to Listen
- **WHEN** un usuario marca como favorito o agrega a una lista un objetivo que no está en su
  lista Want to Listen
- **THEN** no se crea ninguna entrada de Want to Listen como efecto de esa acción

### Requirement: Página de Pendientes legible en todo ancho
`/me/want-to-listen` SHALL usar el mismo ancho máximo en los tres modos, con el título alineado
a la izquierda con el contenido. Ninguna acción de una entrada SHALL reducir el título de otra
entrada ni el suyo propio a menos de su ancho legible: en pantallas angostas, en el modo
Detallada, las acciones SHALL ir en una línea propia bajo el título; en el modo Gráfico las
acciones SHALL quedar dentro del ancho de su tarjeta (el texto se parte en líneas) y NO SHALL
superponerse con las de otra tarjeta; en el modo Índice las acciones NO SHALL atenuarse y, en
pantallas angostas, el artista de un álbum SHALL ir en una segunda línea.

#### Scenario: Nombre de artista completo en móvil
- **WHEN** el usuario abre la página a 375 px en Detallada con un artista sin recorrido
- **THEN** el nombre del artista se lee completo y "Completar discografía" y "Quitar" aparecen
  debajo

#### Scenario: Gráfico sin superposición
- **WHEN** el usuario ve dos artistas contiguos en Gráfico
- **THEN** la acción de discografía de cada uno queda dentro de su tarjeta

### Requirement: Acción de discografía estable en Pendientes
La acción de recorrido de un artista en Pendientes SHALL llamarse igual que en la página del
artista ("Completar discografía"). Mientras se consulta el estado de recorrido, la entrada SHALL
reservar el espacio de la acción, de modo que la fila no cambie de tamaño cuando llega la
respuesta.

#### Scenario: Sin desplazamiento al llegar el estado
- **WHEN** la página se abre y el estado de recorrido aún no llegó
- **THEN** la entrada ocupa ya el espacio de la acción, sin una acción visible ni anunciada

### Requirement: Controles táctiles y avisos al quitar en Pendientes
Con puntero grueso, "Quitar", la acción de discografía y las opciones del conmutador de modo
SHALL medir al menos 44 px de alto. Quitar una entrada SHALL anunciarse a lectores de pantalla.
Si quitar falla, el error SHALL mostrarse junto a esa entrada con `role="alert"`; el error de
"Cargar más" SHALL mostrarse junto al botón.

#### Scenario: Error al quitar junto a la entrada
- **WHEN** quitar un álbum falla
- **THEN** el aviso de error aparece bajo ese álbum y la entrada sigue en la lista

#### Scenario: Quitar se anuncia
- **WHEN** el usuario quita una entrada con éxito
- **THEN** una región de estado anuncia que salió de Pendientes

### Requirement: Estado vacío de Pendientes con salida
Sin entradas, la página SHALL mostrar el estado vacío con un enlace para buscar en el catálogo.

#### Scenario: Lista vacía con enlace
- **WHEN** un usuario sin entradas abre `/me/want-to-listen`
- **THEN** ve el estado vacío y un enlace "Buscar en el catálogo" que lleva a la búsqueda

### Requirement: Secciones con conteo del servidor y modos de visualización del listado propio
El listado propio de Want to Listen SHALL separar las entradas en dos secciones —**artistas**
y **álbumes**, en ese orden— cada una con su propio encabezado y la cantidad total de entradas
de ese tipo según el servidor (no solo las cargadas); una sección sin entradas NO SHALL
renderizarse, y con un filtro de tipo activo solo SHALL renderizarse la sección de ese tipo.
El sistema SHALL ofrecer tres modos de visualización intercambiables para ambas secciones a la
vez —**Detallada** (fila con carátula o placa tipográfica), **Índice** (fila de texto compacta)
y **Gráfico** (pared de carátulas o placas)— con el mismo vocabulario y mecánica de conmutador
que el detalle de una lista (`role="radiogroup"`, navegación por flechas, preferencia persistida
en `localStorage` del visitante). El modo elegido SHALL aplicarse por igual a la sección de
artistas y a la de álbumes. Hasta conocer la preferencia guardada, el listado SHALL mostrarse
como un marcador neutro y NO SHALL pintar el modo por defecto para saltar después al guardado;
el conmutador SHALL ocultarse sin perder su espacio.

#### Scenario: Secciones separadas por tipo
- **WHEN** un usuario autenticado con artistas y álbumes en su lista abre `/me/want-to-listen`
- **THEN** ve una sección "Artistas" y una sección "Álbumes", cada una con su conteo y solo
  las entradas de ese tipo

#### Scenario: Sección vacía no se muestra
- **WHEN** el usuario solo tiene álbumes en su lista Want to Listen
- **THEN** la sección de artistas no se renderiza, y solo aparece la de álbumes

#### Scenario: Cambiar el modo de visualización afecta ambas secciones
- **WHEN** el usuario cambia el modo de visualización a Gráfico
- **THEN** tanto la sección de artistas como la de álbumes pasan a mostrarse como pared de
  carátulas/placas

#### Scenario: Preferencia de modo persiste entre visitas
- **WHEN** el usuario elige el modo Índice y vuelve a abrir `/me/want-to-listen` más tarde
- **THEN** el listado arranca en modo Índice, salvo que el almacenamiento local no esté
  disponible, en cuyo caso arranca en el modo por defecto (Detallada)

#### Scenario: Sin parpadeo al cargar
- **WHEN** el usuario eligió Gráfico y vuelve a abrir la página
- **THEN** el listado es un marcador neutro hasta leer la preferencia y luego se muestra en
  Gráfico, sin mostrar antes Detallada

#### Scenario: Conteo completo con páginas pendientes
- **WHEN** el usuario tiene 30 álbumes y solo se cargaron 20
- **THEN** el encabezado de la sección dice "Álbumes (30)"

### Requirement: Cabecera de Pendientes con "Anotar algo"
`/me/want-to-listen` SHALL mostrar, bajo el título, una línea que describe la página y un botón
"Anotar algo" que abre el diálogo global de acciones rápidas ya en la acción Pendiente. Lo
anotado desde ese diálogo SHALL aparecer en la lista sin recargar la página, respetando el filtro
y el orden activos.

#### Scenario: Anotar desde la página
- **WHEN** el usuario pulsa "Anotar algo", busca un álbum y lo marca como pendiente
- **THEN** el diálogo se abrió en Pendiente y, al guardar, el álbum aparece en la lista sin recargar

### Requirement: Barra de tipo y orden de Pendientes
Con al menos una entrada, la página SHALL ofrecer segmentos Todo / Artistas / Álbumes con la
cantidad de cada tipo (calculada sin el filtro de tipo) y un selector de orden (Recientes, Más
antiguos, A–Z). Un tipo sin entradas SHALL verse deshabilitado salvo que esté activo. El tipo y el
orden SHALL reflejarse en la URL (`?type=&sort=`) sin crear entradas de historial, la página SHALL
abrir con los de la URL y SHALL ignorar valores inválidos. Al cambiar un filtro, la lista anterior
SHALL marcarse como ocupada hasta que llegan los resultados, y una respuesta vieja NO SHALL pisar
a una más nueva.

#### Scenario: Filtrar por tipo
- **WHEN** el usuario elige "Artistas"
- **THEN** solo se ve la sección de artistas, la URL dice `?type=artist` y los segmentos conservan
  sus cantidades

#### Scenario: URL con valor inválido
- **WHEN** el usuario abre `/me/want-to-listen?sort=random`
- **THEN** la página abre con el orden por defecto, sin error

