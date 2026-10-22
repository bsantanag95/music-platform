# favorites Specification

## Purpose

Señal de interés liviana de Fase 5: marca simple (toggle) sobre artista, álbum (release group)
o canción (recording), sin escala numérica, con audiencia propia e independiente de escucha,
rating y comentario. Incluye superficie propia, vista pública en perfiles y la acción
contextual en las páginas de catálogo.
## Requirements
### Requirement: Marcar y desmarcar un favorito
El sistema SHALL permitir a un usuario autenticado marcar o quitar un favorito sobre un
artista, un álbum o una canción de forma idempotente. Marcar un objetivo que ya es favorito
SHALL NOT producir un error ni duplicar la marca; quitar un favorito que no existe SHALL
también ser idempotente. Un usuario SHALL tener a lo sumo un favorito por objetivo.

#### Scenario: Marcar un favorito
- **WHEN** un usuario autenticado marca como favorito un artista, álbum o canción válido
- **THEN** el sistema crea el favorito y lo refleja en la superficie propia

#### Scenario: Marcar un objetivo ya favorito
- **WHEN** el usuario marca un objetivo que ya tenía como favorito
- **THEN** la operación es idempotente, no crea duplicados y responde con el favorito existente

#### Scenario: Quitar un favorito
- **WHEN** el usuario quita el favorito de un objetivo que tenía marcado
- **THEN** el favorito se elimina y desaparece de la superficie propia

#### Scenario: Quitar un favorito inexistente
- **WHEN** el usuario quita el favorito de un objetivo que no tenía marcado
- **THEN** la operación es idempotente y no produce error

#### Scenario: Objetivo inválido o inexistente
- **WHEN** el sistema recibe un favorito cuyo objetivo no existe o no es uno de los tres tipos
  permitidos
- **THEN** la API responde un error de validación y no crea ni modifica ningún favorito

#### Scenario: Sesión requerida
- **WHEN** una request sin sesión intenta marcar o quitar un favorito
- **THEN** la API responde `401` con código `AUTH_REQUIRED` y no modifica ningún favorito

### Requirement: Audiencia del favorito

El sistema SHALL permitir configurar la audiencia de cada favorito entre `private`,
`followers` y `public`. Un favorito nuevo SHALL usar `public` por defecto y el usuario SHALL
poder cambiarla después de publicarlo. Un favorito de `audience` `private` SHALL ser visible
solo para su dueño. Este default SHALL aplicarse únicamente a favoritos creados a partir de
este cambio: un favorito ya existente SHALL conservar la audiencia que tenía, sin migrarse
automáticamente a `public`.

#### Scenario: Audiencia por defecto

- **WHEN** un usuario crea un favorito sin especificar audiencia
- **THEN** el favorito queda con audiencia `public`

#### Scenario: Cambiar la audiencia de un favorito propio

- **WHEN** el usuario cambia la audiencia de un favorito propio a `public`
- **THEN** el favorito queda público y visible en las superficies que lo permitan

#### Scenario: Favorito privado

- **WHEN** el usuario consulta un favorito de audiencia `private` que no es suyo
- **THEN** ese favorito no aparece en ninguna superficie ajena

#### Scenario: Favoritos existentes no cambian de audiencia

- **WHEN** este cambio se despliega sobre una base con favoritos creados antes, con
  audiencia `followers`
- **THEN** esos favoritos conservan `followers` y no pasan a `public` automáticamente

### Requirement: Lista de favoritos propios
El sistema SHALL permitir al usuario autenticado listar sus propios favoritos con paginación,
incluyendo por cada favorito el objetivo, su audiencia, su fecha de creación y —para los
favoritos de álbum— la carátula del álbum (`target.coverThumbUrl`); los favoritos de artista
y de canción no exponen carátula. La respuesta SHALL incluir el **conteo de favoritos propios
por tipo de entidad (`counts`)**, calculado sobre el conjunto completo y no solo sobre la
página cargada. La respuesta SHALL aceptar, combinables, los parámetros opcionales de
**búsqueda por texto (`q`) sobre el título del objetivo y sobre el nombre del artista
acreditado de los álbumes y canciones**, **filtro por tipo de entidad
(`type`)**, **filtro por audiencia (`audience`)** y **orden (`sort`, entre recencia y
alfabético por título del objetivo)**, aplicados en el servidor sobre el conjunto completo de
favoritos propios. Sin ningún parámetro, el orden SHALL ser cronológico descendente y el
comportamiento SHALL ser equivalente al listado paginado previo, ampliado con `counts`.

#### Scenario: Listar favoritos propios
- **WHEN** un usuario autenticado abre su página de favoritos
- **THEN** ve sus favoritos ordenados del más reciente al más antiguo, paginados, cada uno
  con su audiencia y, si es un favorito de álbum, su carátula; y el conteo por tipo

#### Scenario: Sin favoritos
- **WHEN** un usuario sin favoritos abre su página de favoritos
- **THEN** ve un estado vacío localizado y no un error técnico, y `counts` es cero para los
  tres tipos

#### Scenario: Buscar entre los favoritos propios
- **WHEN** el usuario filtra con `q` coincidiendo parcialmente con el título de algún objetivo
- **THEN** solo aparecen sus favoritos cuyo título del objetivo coincide, sin distinguir
  mayúsculas, con paginación válida

#### Scenario: Buscar por el artista de un álbum o canción
- **WHEN** el usuario filtra con `q` coincidiendo parcialmente con el nombre del artista
  acreditado de sus favoritos de álbum y de canción, cuyos títulos no contienen ese texto
- **THEN** aparecen esos álbumes y canciones junto con el favorito del propio artista, si lo
  tiene, sin distinguir mayúsculas; y `counts` refleja solo lo que coincide

#### Scenario: Filtrar por tipo y por audiencia y ordenar
- **WHEN** el usuario filtra por `type=release-group`, `audience=public` y pide `sort=alpha`
- **THEN** solo aparecen sus favoritos de álbum de audiencia `public`, ordenados
  alfabéticamente por título del objetivo

#### Scenario: Parámetros inválidos
- **WHEN** el usuario envía un `type`, un `audience` o un `sort` fuera de los valores
  permitidos, o una paginación fuera de rango
- **THEN** la API responde `400` con código `VALIDATION_ERROR` y no ejecuta la lectura

#### Scenario: Sesión requerida
- **WHEN** una request sin sesión pide el listado de favoritos propios
- **THEN** la API responde `401` con código `AUTH_REQUIRED`

### Requirement: Favoritos ajenos en el perfil
El sistema SHALL exponer la lectura paginada de los favoritos de un usuario por `username`,
filtrando por la matriz de visibilidad existente (bloqueos, perfil privado y relación de
seguimiento). Si el visitante no tiene permiso, la respuesta SHALL ser una lista vacía y SHALL
NOT revelar si el usuario tiene favoritos. Si el `username` no existe, la respuesta SHALL ser
`404` con código `USER_NOT_FOUND`. Cada favorito visible SHALL exponerse con su objetivo, su
audiencia y su fecha de creación, y con la carátula del álbum para los favoritos de álbum. La
superficie de lectura SHALL presentarse como el mismo muro agrupado por tipo (ver
`Requirement: Muro de favoritos agrupado por tipo`) en modo lectura: sin edición de audiencia,
sin modo selección y sin acción de quitar.

#### Scenario: Favoritos visibles de un perfil público
- **WHEN** un visitante consulta los favoritos de un perfil público
- **THEN** recibe únicamente los favoritos de audiencia `public`, cada uno con su carátula si
  es un favorito de álbum

#### Scenario: Seguidor aprobado de un perfil
- **WHEN** un seguidor aprobado consulta los favoritos de un perfil
- **THEN** recibe los favoritos de audiencia `public` y `followers`

#### Scenario: Perfil privado sin relación aprobada
- **WHEN** un visitante sin relación aprobada consulta los favoritos de un perfil privado
- **THEN** recibe una lista vacía sin indicar si el usuario tiene favoritos

#### Scenario: Bloqueo en cualquier dirección
- **WHEN** el visitante bloqueó al dueño o fue bloqueado por él
- **THEN** el visitante no ve ningún favorito del dueño

#### Scenario: Usuario inexistente
- **WHEN** se consultan los favoritos de un `username` que no existe
- **THEN** la API responde `404` con código `USER_NOT_FOUND`

#### Scenario: Paginación inválida
- **WHEN** se envía una paginación fuera de rango
- **THEN** la API responde `400` con código `VALIDATION_ERROR` y no ejecuta la lectura

### Requirement: Muro de favoritos agrupado por tipo
El sistema SHALL presentar `/<locale>/me/favorites` como una **superficie única sin
sub-navegación**: un encabezado con el conteo de favoritos por tipo y un muro que agrupa los
favoritos en tres secciones —**artistas**, **álbumes** y **canciones**— en el orden vigente
del listado. Cada favorito SHALL representarse con una ficha según su tipo: **álbum** con su
carátula cuadrada; **artista** con una placa tipográfica sin imagen; **canción** con la
silueta de disco del sistema (`DiscPlaceholder`) y el título. Ninguna ficha SHALL renderizarse
como un rectángulo vacío ante la ausencia de imagen. La imagen o placa de la ficha SHALL ser
decorativa a efectos de accesibilidad: el título del objetivo y su audiencia SHALL ser el
contenido textual que la identifica, y cada ficha SHALL enlazar a la página de catálogo del
objetivo. Cuando un filtro de la toolbar acota el muro a un solo tipo, la agrupación SHALL
colapsar a esa sección. Sin sesión, la ruta SHALL comportarse como el resto de `/me/*`
(redirección a inicio de sesión).

#### Scenario: Ver el muro completo
- **WHEN** un usuario autenticado con favoritos de los tres tipos abre `/me/favorites`
- **THEN** ve el encabezado con el conteo por tipo y el muro seccionado en artistas, álbumes
  y canciones, cada favorito en la ficha correspondiente a su tipo

#### Scenario: Ficha de artista sin imagen
- **WHEN** el muro incluye un favorito de artista
- **THEN** su ficha se muestra como una placa tipográfica con el nombre del artista, nunca
  como un rectángulo vacío

#### Scenario: Ficha de canción
- **WHEN** el muro incluye un favorito de canción
- **THEN** su ficha se muestra con la silueta de disco del sistema y el título de la canción

#### Scenario: Muro filtrado a un solo tipo
- **WHEN** el usuario aplica el filtro de tipo `artist`
- **THEN** el muro muestra solo la sección de artistas, sin las otras dos

#### Scenario: Muro vacío tras filtrar
- **WHEN** el usuario aplica filtros que no dejan ningún favorito
- **THEN** ve un estado vacío de "sin resultados" localizado, distinto del estado vacío de
  "todavía no marcaste favoritos"

### Requirement: Cambio de audiencia en lote de favoritos propios
El sistema SHALL permitir al usuario autenticado cambiar la audiencia (`private`,
`followers`, `public`) de **varios favoritos propios a la vez** en una sola operación, además
del cambio individual ya existente. La operación SHALL ser idempotente: fijar la audiencia
que un favorito ya tenía SHALL NOT producir error. Los identificadores del conjunto que no
correspondan a un favorito del usuario (inexistentes o ajenos) SHALL ignorarse sin afectar al
resto ni revelar su existencia; si ningún identificador del conjunto corresponde a un
favorito propio, la respuesta SHALL ser `404` con código `FAVORITE_NOT_FOUND`. La operación
SHALL rechazar un conjunto vacío, un conjunto que exceda el máximo admitido, o una audiencia
inválida, con `400` y código `VALIDATION_ERROR`, sin modificar nada. Cambiar la audiencia en
lote SHALL NOT crear, modificar ni eliminar escuchas, ratings ni comentarios de los objetivos
afectados.

#### Scenario: Cambiar la audiencia de varios favoritos propios
- **WHEN** el usuario selecciona tres favoritos propios y los cambia a `private`
- **THEN** los tres quedan con audiencia `private` y la respuesta refleja el nuevo estado

#### Scenario: Conjunto con un identificador ajeno o inexistente
- **WHEN** el usuario envía un lote con dos favoritos propios y un identificador que no le
  pertenece
- **THEN** los dos favoritos propios cambian de audiencia y el identificador ajeno se ignora
  sin error ni indicación de su existencia

#### Scenario: Ningún identificador propio en el conjunto
- **WHEN** el usuario envía un lote en el que ningún identificador corresponde a un favorito
  suyo
- **THEN** la API responde `404` con código `FAVORITE_NOT_FOUND` y no modifica nada

#### Scenario: Conjunto vacío, excesivo o audiencia inválida
- **WHEN** el usuario envía un lote sin identificadores, con más identificadores que el máximo
  admitido, o con una audiencia fuera de `private`/`followers`/`public`
- **THEN** la API responde `400` con código `VALIDATION_ERROR` y no modifica nada

#### Scenario: Sesión requerida
- **WHEN** una request sin sesión intenta el cambio de audiencia en lote
- **THEN** la API responde `401` con código `AUTH_REQUIRED` y no modifica ningún favorito

#### Scenario: Cambio en lote sin efectos colaterales
- **WHEN** el usuario cambia en lote la audiencia de favoritos que además valoró y escuchó
- **THEN** las escuchas, los ratings y los comentarios de esos objetivos no cambian

### Requirement: Acción de favorito en las páginas de catálogo
El sistema SHALL ofrecer en las páginas de artista, álbum y canción una acción autenticada
para marcar o quitar el favorito, con estados de carga, éxito, error y sesión requerida, y que
SHALL NOT bloquear la carga del contenido musical.

#### Scenario: Acción sin sesión
- **WHEN** un visitante no autenticado pulsa marcar como favorito en una página de catálogo
- **THEN** se le solicita iniciar sesión y no se crea ningún favorito

#### Scenario: Alternar el favorito
- **WHEN** un usuario autenticado pulsa el botón de favorito en una página de catálogo
- **THEN** el favorito se marca o se quita y el estado de la UI se actualiza con confirmación
  accesible

### Requirement: Independencia del favorito
El sistema SHALL tratar el favorito como una señal independiente: marcarlo o quitarlo SHALL
NOT crear, modificar ni eliminar escuchas, ratings ni comentarios del mismo objetivo.

#### Scenario: Favorito sin efectos colaterales
- **WHEN** un usuario marca como favorito un objetivo que ya valoró y escuchó
- **THEN** la escucha, el rating y los comentarios existentes no cambian

### Requirement: Modo de vista de favoritos sin parpadeo
`/me/favorites` SHALL ofrecer tres modos de visualización (Detallada, Índice y Gráfico) con una preferencia global
de la persona guardada solo en `localStorage`; el modo por defecto SHALL ser Detallada. Hasta conocer la preferencia
guardada, el listado SHALL mostrarse como un marcador de carga neutro, no en el modo por defecto, de modo que la
página NO SHALL pintar un modo y saltar después a otro; la cabecera y la barra de herramientas NO SHALL esperar y el
conmutador SHALL ocultarse sin perder su espacio. Un valor guardado inválido SHALL ignorarse y un fallo del
almacenamiento NO SHALL romper la página.

#### Scenario: La preferencia se recuerda sin parpadeo
- **WHEN** la persona eligió Índice y vuelve a abrir `/me/favorites`
- **THEN** la página se muestra en Índice, sin mostrar antes el modo Detallada

#### Scenario: Marcador mientras se lee la preferencia
- **WHEN** la página se renderiza y aún no se leyó la preferencia guardada
- **THEN** el listado es un marcador neutro, sin fichas ni filas, y el conmutador está oculto pero conserva su espacio

#### Scenario: Almacenamiento no disponible
- **WHEN** `localStorage` lanza al leer o escribir
- **THEN** la página funciona en el modo por defecto y el cambio de modo vale para la sesión

### Requirement: Contenedor de ancho único y título alineado
`/me/favorites` SHALL usar el mismo ancho máximo en los tres modos y el título de la página SHALL alinearse a la
izquierda con el resto del contenido. El muro compartido NO SHALL fijar su propio ancho: lo fija la página que lo
contiene, de modo que el muro del perfil público conserve el suyo.

#### Scenario: Cambiar de modo no cambia el ancho
- **WHEN** la persona pasa de Detallada a Gráfico
- **THEN** el contenedor conserva el mismo ancho y la cabecera y la barra no se mueven

#### Scenario: Título alineado
- **WHEN** la persona abre `/me/favorites`
- **THEN** el título "Favoritos" empieza en el mismo borde izquierdo que el resumen y la barra

### Requirement: Contadores honestos de favoritos
La cabecera SHALL distinguir la biblioteca de un resultado filtrado. Sin búsqueda ni filtros de tipo o audiencia,
SHALL mostrar el desglose por tipo ("3 artistas · 12 álbumes · 12 canciones"); sin ningún favorito NO SHALL mostrar
cabecera, porque el estado vacío ya lo dice. Con búsqueda o con filtro de tipo o de audiencia activos SHALL contar resultados ("N resultados", "1
resultado") y NO SHALL decir "sin artistas · sin álbumes · sin canciones"; con 0 resultados SHALL decir "Ningún
resultado". Con filtro de tipo, el total SHALL ser el de ese tipo. Cambiar solo el orden NO SHALL cambiar la
etiqueta. El conmutador de modo SHALL seguir visible con filtros aunque no haya resultados.

#### Scenario: Filtro sin resultados
- **WHEN** la persona tiene favoritos y busca un texto que no coincide con ninguno
- **THEN** la cabecera dice "Ningún resultado", sin "sin artistas · sin álbumes · sin canciones", y el conmutador de modo sigue visible

#### Scenario: Filtro de tipo
- **WHEN** filtra por álbumes y tiene 12 álbumes
- **THEN** la cabecera dice "12 resultados" y conserva el desglose por tipo

#### Scenario: Solo orden
- **WHEN** cambia el orden a "Alfabético" sin otros filtros
- **THEN** la cabecera sigue mostrando el desglose de toda la biblioteca

#### Scenario: Sin favoritos
- **WHEN** una persona sin favoritos abre la página sin filtros
- **THEN** no hay cabecera de conteo ni "sin artistas · sin álbumes · sin canciones", el estado vacío invita a buscar en el catálogo y el conmutador de modo no se muestra

### Requirement: Barra de filtros legible
Los selectores de la barra (tipo, audiencia y orden) SHALL mostrar su texto completo, sin cortarlo, y un nombre
visible sobre el control (Tipo, Audiencia, Ordenar), sin necesidad de abrirlos. El nombre visible es decorativo; cada
selector SHALL conservar su nombre accesible actual.

#### Scenario: Texto completo
- **WHEN** la persona abre `/me/favorites` sin filtros
- **THEN** los selectores muestran "Todos los tipos", "Toda audiencia" y "Recientes" completos, con su nombre visible encima

### Requirement: Sin tipo repetido bajo el encabezado de sección
Las fichas, filas y la tabla del Índice SHALL omitir el tipo del favorito (Artista, Álbum, Canción) porque el
encabezado de su sección ya lo dice. La fecha en que se marcó el favorito SHALL conservarse. Otros consumidores de la
ficha fuera del muro agrupado SHALL poder seguir mostrando el tipo.

#### Scenario: Detallada
- **WHEN** la persona ve la sección "Álbumes" en modo Detallada
- **THEN** cada ficha muestra el título, el artista y la fecha, sin "Álbum"

#### Scenario: Índice
- **WHEN** ve cualquier sección en modo Índice
- **THEN** las filas no incluyen una columna de tipo

### Requirement: Controles legibles
Los controles de las fichas (selector de audiencia y "Quitar favorito") SHALL tener texto de al menos 11 px en todos los
modos y NO SHALL atenuarse por debajo del contraste del texto atenuado del sistema en reposo; en Índice las acciones de
cada fila SHALL verse a contraste normal sin necesidad de pasar el cursor.

#### Scenario: Índice en reposo
- **WHEN** la persona ve el modo Índice sin cursor encima
- **THEN** el selector de audiencia y "Quitar favorito" de cada fila se ven a contraste normal

#### Scenario: Gráfico
- **WHEN** ve el modo Gráfico
- **THEN** el texto de los controles de cada ficha mide al menos 11 px

### Requirement: Áreas táctiles de favoritos con puntero grueso
En dispositivos con puntero grueso (`pointer: coarse`), el conmutador de modo, el selector de audiencia de cada ficha,
"Quitar favorito", "Seleccionar", los botones de la barra de selección y "Listo" SHALL medir al menos 44 px de alto, y las
casillas de selección al menos 24 px. Con puntero fino su tamaño NO SHALL cambiar.

#### Scenario: Teléfono
- **WHEN** la persona usa un dispositivo con puntero grueso
- **THEN** cada uno de esos controles mide al menos 44 px de alto y cada casilla de selección 24 px

#### Scenario: Ratón
- **WHEN** la persona usa un ratón
- **THEN** los controles conservan su tamaño compacto

### Requirement: Avisos al quitar y al fallar
Quitar un favorito con éxito SHALL anunciarse a los lectores de pantalla ("Favorito quitado"). Si cambiar la audiencia
o quitar un favorito falla, el aviso de error SHALL mostrarse junto a la ficha afectada, con rol `alert`, además de
restaurar su estado anterior; un fallo del cambio en lote SHALL conservar un aviso global.

#### Scenario: Quitar anuncia
- **WHEN** la persona quita un favorito y la API responde bien
- **THEN** la ficha desaparece y la región de estado anuncia "Favorito quitado"

#### Scenario: Error junto a la ficha
- **WHEN** cambiar la audiencia de un favorito falla
- **THEN** la ficha recupera su audiencia anterior y muestra el aviso de error debajo de ella

### Requirement: Carátulas de favoritos con prioridad
Las carátulas de los primeros seis favoritos del muro SHALL cargarse con prioridad y el resto de forma diferida.

#### Scenario: Primera fila con prioridad
- **WHEN** el muro muestra más de seis álbumes con carátula
- **THEN** las de los seis primeros favoritos se cargan con prioridad

