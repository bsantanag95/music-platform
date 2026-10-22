## ADDED Requirements

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
