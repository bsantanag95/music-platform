## ADDED Requirements

### Requirement: Armar desde una fuente
Una persona con sesión SHALL poder llenar una Lámina desde sus valoraciones, sus favoritos o una lista propia con el mismo tipo de ítem, además de a
mano. Una fuente SHALL copiar los ítems una sola vez: la Lámina SHALL NOT cambiar después si cambian sus valoraciones, favoritos o listas. Las
valoraciones SHALL ordenarse de mejor a peor; los favoritos, por la valoración propia y luego del más reciente al más antiguo; una lista, por su orden.

#### Scenario: Desde valoraciones
- **WHEN** una persona arma un Top 5 de álbumes desde sus valoraciones
- **THEN** los candidatos vienen de mejor a peor valorado y el Top 5 guarda ese orden

#### Scenario: La fuente cambia después
- **WHEN** una persona baja la nota de un disco que entró en una Lámina
- **THEN** la Lámina no cambia

#### Scenario: Lista ajena
- **WHEN** una persona pide candidatos de una lista que no es suya
- **THEN** la API responde `404` con `LIST_NOT_FOUND`

#### Scenario: Lista de otro tipo
- **WHEN** una persona arma una Lámina de canciones
- **THEN** solo se le ofrecen listas de canciones

### Requirement: Filtros de una fuente
Valoraciones y favoritos SHALL poder filtrarse por año de lanzamiento o década, año de escucha, género y artista, combinables entre sí. El género SHALL
incluir sus subgéneros y el artista SHALL coincidir con un crédito principal. El año de escucha SHALL exigir una escucha del mismo objetivo en ese año,
contado en la zona horaria de la persona. Las opciones SHALL salir solo de lo que la fuente tiene.

#### Scenario: Año de escucha en otra zona
- **WHEN** una persona en America/Santiago registró una escucha a las 22:00 del 31 de diciembre de 2025
- **THEN** ese disco cuenta para 2025 y no para 2026

#### Scenario: Disco antiguo escuchado este año
- **WHEN** una persona filtra por año de escucha 2026 y tiene valorado un disco de 1979 escuchado en 2026
- **THEN** ese disco es candidato

#### Scenario: La escucha de una canción no cuenta para su álbum
- **WHEN** una persona filtra álbumes por año de escucha y solo registró una canción de ese álbum
- **THEN** ese álbum no es candidato

#### Scenario: Año y década juntos
- **WHEN** un pedido trae `year` y `decade`
- **THEN** la API responde `400` con `VALIDATION_ERROR`

#### Scenario: Sin resultados
- **WHEN** la combinación de filtros no tiene candidatos
- **THEN** el panel lo dice y deja cambiar los filtros

### Requirement: Vista previa de la fuente
El panel SHALL mostrar hasta 30 candidatos con los primeros ya elegidos hasta llenar los lugares disponibles, numerados en el orden en que entrarían.
La persona SHALL poder quitar y sumar candidatos con teclado y toque antes de confirmar, sin pasar los lugares disponibles.

#### Scenario: Cambiar uno
- **WHEN** una persona quita el tercero de un Top 5 y marca el sexto
- **THEN** la Lámina se arma con esos cinco, en ese orden

#### Scenario: Cambiar un filtro
- **WHEN** una persona cambia un filtro
- **THEN** la selección vuelve a ser los primeros candidatos

### Requirement: Completar una Lámina existente
En el editor, el panel SHALL ofrecer solo lo que aún no está y completar los lugares libres, sin mover ni reemplazar los ítems. Un lote SHALL agregarse
entero o no agregarse. Si la Lámina no es privada, el panel SHALL avisar antes de confirmar que lo agregado se verá con esa audiencia.

#### Scenario: Completar un Top 10
- **WHEN** una persona con 7 ítems completa desde sus favoritos
- **THEN** se agregan hasta 3, después de los 7

#### Scenario: Lote que no entra
- **WHEN** un pedido trae más ítems que lugares libres
- **THEN** la API responde `400` con `VALIDATION_ERROR` y no agrega ninguno

#### Scenario: Lámina pública
- **WHEN** una persona completa una Lámina pública
- **THEN** ve que lo agregado será público antes de confirmar y la audiencia no cambia

### Requirement: Audiencia al armar desde una fuente
Una Lámina creada con ítems de una fuente SHALL nacer con audiencia `private`, cualquiera sea la audiencia por defecto de la persona, y el servidor SHALL
hacerlo cumplir. Usar valoraciones como fuente SHALL NOT encender las notas.

#### Scenario: Audiencia por defecto pública
- **WHEN** una persona con audiencia por defecto pública crea una Lámina desde sus favoritos
- **THEN** la Lámina nace privada

#### Scenario: Pedido con audiencia
- **WHEN** un alta con `targetIds` trae también `audience`
- **THEN** la API responde `400` con `VALIDATION_ERROR`

#### Scenario: Notas apagadas
- **WHEN** una persona crea una Lámina desde sus valoraciones
- **THEN** la Lámina no muestra notas hasta que las encienda

### Requirement: Títulos sugeridos
El alta SHALL sugerir un título según formato, tipo de ítem, fuente y filtros, en el idioma de la interfaz. La sugerencia SHALL seguir a los filtros hasta
que la persona edite el título y SHALL NOT pisar lo que escribió.

#### Scenario: Con un año
- **WHEN** una persona arma un Top 10 de álbumes filtrado por 2026, en español
- **THEN** el título sugerido es "Mis 10 discos de 2026"

#### Scenario: Título escrito a mano
- **WHEN** una persona edita el título y después cambia un filtro
- **THEN** el título queda como lo escribió

#### Scenario: A mano
- **WHEN** una persona elige armar a mano
- **THEN** ve sugerencias de título que puede tocar para usarlas
