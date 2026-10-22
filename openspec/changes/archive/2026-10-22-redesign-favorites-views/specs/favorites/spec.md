## ADDED Requirements

### Requirement: Menú de acciones del favorito con insignia de audiencia
En la vista propia, cada favorito SHALL mostrar su audiencia como una insignia con icono (candado para privado, personas
para seguidores, globo para público) y un botón `⋯`; ambos SHALL abrir el mismo menú con las tres audiencias (la vigente
marcada) y "Quitar favorito". El menú SHALL tener rol `menu` con opciones `menuitemradio` y `menuitem`, el disparador
`aria-haspopup="menu"` y `aria-expanded`, cerrarse con Escape, con un clic fuera o al elegir, y devolver el foco al
disparador. Elegir una audiencia SHALL cambiarla igual que antes (optimista, con reversión y aviso junto a la ficha si
falla). La insignia, el `⋯` y las opciones SHALL medir al menos 44 px de alto con puntero grueso. En modo lectura (perfil
público) NO SHALL mostrarse insignia ni menú. Estos controles reemplazan al selector de audiencia y al enlace "Quitar
favorito" en las tres vistas.

#### Scenario: Cambiar la audiencia desde el menú
- **WHEN** la persona abre el menú de un favorito para seguidores y elige "Público"
- **THEN** el menú se cierra, la insignia muestra "Público" y se llama a la API con la nueva audiencia

#### Scenario: Cerrar el menú
- **WHEN** abre el menú y pulsa Escape
- **THEN** el menú se cierra y el foco vuelve al botón que lo abrió

#### Scenario: Perfil público
- **WHEN** alguien ve los favoritos de un perfil ajeno
- **THEN** ninguna ficha muestra insignia de audiencia ni menú

### Requirement: Quitar un favorito con deshacer
Quitar un favorito desde el menú SHALL retirarlo de la lista de inmediato y mostrar un aviso "Quitado de favoritos" con la
acción "Deshacer", visible unos segundos y con rol `status`. "Deshacer" SHALL volver a marcar el favorito con la audiencia
que tenía y reponerlo en la lista; el aviso SHALL desaparecer tras usarlo o al expirar, de modo que no pueda alternarse dos
veces. Quitar con éxito SHALL seguir anunciándose a los lectores de pantalla. Si quitar falla, el favorito SHALL volver y el
aviso de error SHALL mostrarse junto a su ficha.

#### Scenario: Quitar y deshacer
- **WHEN** la persona quita un favorito público y pulsa "Deshacer" en el aviso
- **THEN** el favorito vuelve a la lista con audiencia pública y el aviso desaparece

#### Scenario: Quitar sin deshacer
- **WHEN** quita un favorito y no pulsa "Deshacer"
- **THEN** el aviso desaparece al expirar y el favorito sigue quitado

### Requirement: Gráfico limpio de favoritos
El modo Gráfico SHALL mostrar cada favorito como su portada (o placa o disco) sola, con el título y el artista debajo y el botón
`⋯`; sobre la portada SHALL aparecer una marca con icono solo cuando la audiencia no es pública. NO SHALL mostrar selector de
audiencia ni enlace "Quitar favorito" en la ficha. El nombre accesible del `⋯` SHALL incluir el título y la audiencia vigente.

#### Scenario: Portada limpia
- **WHEN** la persona ve el modo Gráfico
- **THEN** cada ficha muestra portada, título, artista y `⋯`, sin selector ni enlace de quitar

#### Scenario: Marca de privacidad
- **WHEN** un favorito es privado o para seguidores
- **THEN** su portada lleva una marca con el icono de su audiencia, y los públicos no llevan marca

### Requirement: Índice de favoritos como tabla
El modo Índice SHALL ser una tabla con encabezados de columna (Título, Fecha, Audiencia y acciones; visibles desde `sm` y solo
para lectores de pantalla debajo), con las columnas alineadas entre filas: el título enlazado con el artista, la fecha de
marcado (oculta bajo `sm`) y, en la vista propia, la insignia de audiencia y el `⋯`. En modo lectura NO SHALL haber columnas
de audiencia ni acciones.

#### Scenario: Tabla alineada
- **WHEN** la persona cambia a modo Índice
- **THEN** ve una tabla con título, fecha, audiencia y acciones alineados entre filas

#### Scenario: Perfil público
- **WHEN** alguien ve el Índice de un perfil ajeno
- **THEN** la tabla muestra título y fecha, sin audiencia ni acciones

### Requirement: Modo selección cómodo
En modo selección las casillas SHALL medir al menos 24 px, el favorito seleccionado SHALL resaltarse (borde y fondo de acento) y
el encabezado de cada sección SHALL ofrecer "Seleccionar todo" que selecciona todos los favoritos cargados de esa sección y,
si ya lo están, los deselecciona. La barra de acciones SHALL ofrecer las tres audiencias, "Quitar" y "Listo". "Quitar" SHALL pedir
confirmación en la propia barra ("¿Quitar N favoritos?" con "Quitar" y "Cancelar") antes de quitar los seleccionados; si
alguno falla, SHALL restaurarse la lista y mostrarse el aviso de error. Los botones de la barra SHALL medir al menos 44 px de
alto con puntero grueso.

#### Scenario: Seleccionar una sección
- **WHEN** en modo selección pulsa "Seleccionar todo" en la sección "Álbumes"
- **THEN** todos los álbumes cargados quedan seleccionados y resaltados, y pulsarlo de nuevo los deselecciona

#### Scenario: Quitar en lote con confirmación
- **WHEN** selecciona tres favoritos, pulsa "Quitar" y confirma
- **THEN** los tres desaparecen de la lista y sus cantidades se actualizan

#### Scenario: Cancelar la confirmación
- **WHEN** pulsa "Quitar" y luego "Cancelar"
- **THEN** no se quita ningún favorito y la selección se conserva

## MODIFIED Requirements

### Requirement: Controles legibles
Los controles de las fichas (la insignia de audiencia y el menú `⋯`) SHALL tener texto de al menos 11 px en todos los
modos y NO SHALL atenuarse por debajo del contraste del texto atenuado del sistema en reposo; en Índice las acciones de
cada fila SHALL verse a contraste normal sin necesidad de pasar el cursor.

#### Scenario: Índice en reposo
- **WHEN** la persona ve el modo Índice sin cursor encima
- **THEN** la insignia de audiencia y el `⋯` de cada fila se ven a contraste normal

#### Scenario: Gráfico
- **WHEN** ve el modo Gráfico
- **THEN** el texto de los controles de cada ficha mide al menos 11 px

### Requirement: Áreas táctiles de favoritos con puntero grueso
En dispositivos con puntero grueso (`pointer: coarse`), el conmutador de modo, la insignia y el `⋯` de cada ficha, las
opciones del menú, "Seleccionar", los botones de la barra de selección y "Listo" SHALL medir al menos 44 px de alto, y las
casillas de selección al menos 24 px. Con puntero fino su tamaño NO SHALL cambiar.

#### Scenario: Teléfono
- **WHEN** la persona usa un dispositivo con puntero grueso
- **THEN** cada uno de esos controles mide al menos 44 px de alto y cada casilla de selección 24 px

#### Scenario: Ratón
- **WHEN** la persona usa un ratón
- **THEN** los controles conservan su tamaño compacto
