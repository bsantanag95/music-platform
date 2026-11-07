# top-laminas Specification

## Purpose
Dejar que una persona arme un ranking de álbumes o canciones (Top 5, Top 10 o Grilla 3×3) para mostrar y compartir su gusto: modelo sobre `user_list`, editor, página pública y notas opcionales, apagadas por defecto. Es la primera Lámina de autor (`docs/05-features/sharing.md` §4.2).
## Requirements
### Requirement: Lámina Top N
Una persona con sesión SHALL poder crear una Lámina Top N con título, formato (**Top 5**, **Top 10** o **Grilla 3×3**) y tipo de ítem (álbumes o
canciones). Una Lámina SHALL tener un solo tipo de ítem, sin repetidos, y como máximo los ítems de su formato. El orden de los ítems SHALL ser el
ranking.

#### Scenario: Crear un Top 5
- **WHEN** una persona crea un Top 5 de álbumes y agrega 5 discos
- **THEN** la Lámina los guarda en ese orden

#### Scenario: Pasar el tope
- **WHEN** una persona intenta agregar un sexto disco a un Top 5
- **THEN** la API responde `400` con `VALIDATION_ERROR` y no agrega nada

#### Scenario: Ítem repetido
- **WHEN** una persona agrega un disco que ya está
- **THEN** la Lámina no cambia

#### Scenario: Tipo equivocado
- **WHEN** una persona agrega una canción a una Lámina de álbumes
- **THEN** la API responde `400` con `VALIDATION_ERROR`

### Requirement: Fuera de las superficies de listas
Una Lámina SHALL NOT aparecer en listados, descubrimiento, guardados ni selectores de listas. Su audiencia, su moderación y su exportación SHALL
seguir las reglas de las listas.

#### Scenario: Mis listas
- **WHEN** una persona con una Lámina abre `/me/lists`
- **THEN** la Lámina no aparece

#### Scenario: Exportación
- **WHEN** una persona exporta sus datos
- **THEN** el archivo incluye sus Láminas con sus ítems

### Requirement: Editor
`/me/laminas` SHALL listar las Láminas propias y `/me/laminas/<id>` SHALL permitir buscar y quitar ítems, ordenarlos con controles operables con
teclado y toque, y cambiar título, formato, audiencia y notas. Bajar a un formato con menos lugares SHALL avisar qué ítems se quitan antes de
guardar.

#### Scenario: Ordenar con teclado
- **WHEN** una persona sube un ítem con el teclado
- **THEN** cambia de puesto y el orden se guarda

#### Scenario: Bajar de formato
- **WHEN** una persona pasa de Top 10 a Top 5 con 8 ítems
- **THEN** ve qué 3 ítems se quitarían y puede cancelar

### Requirement: Página pública
`/users/<usuario>/laminas/<id>` SHALL mostrar la Lámina con los puestos, título, dueño y enlaces a cada ítem, según su audiencia, sin sesión si es
pública. Una Lámina que el visitante no puede ver, oculta por moderación o de una cuenta desactivada SHALL responder `404`. Su dueño SHALL llegar a su
gestión.

#### Scenario: Lámina pública sin sesión
- **WHEN** un visitante sin sesión abre una Lámina pública
- **THEN** la ve completa, con el botón Compartir

#### Scenario: Lámina para seguidores
- **WHEN** un anónimo abre una Lámina para seguidores
- **THEN** la respuesta es `404`

### Requirement: Notas de una Lámina
Una Lámina SHALL nacer sin notas. Si su dueño las enciende, la Lámina SHALL mostrar a quien pueda verla la nota vigente de cada ítem, con su puntaje
detallado si existe y, si no, las estrellas; un ítem sin valorar SHALL ir sin nota. Apagarlas SHALL ocultarlas en la página y en la imagen.

#### Scenario: Sin notas
- **WHEN** un anónimo abre una Lámina con las notas apagadas de una persona que valoró esos discos
- **THEN** no ve ninguna nota, ni en la página ni en la imagen

#### Scenario: Con notas
- **WHEN** el dueño enciende las notas y valoró un disco con 86
- **THEN** la página y la imagen muestran 86

#### Scenario: Nota cambiada
- **WHEN** el dueño cambia su valoración de un disco de una Lámina con notas
- **THEN** la Lámina muestra la nota nueva y su imagen cambia de versión

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

### Requirement: Arma la tuya
La página pública de una Lámina SHALL ofrecer el llamado **"Arma la tuya"** a quien no es su dueño, sin ocultar ni recortar la Lámina. Con sesión SHALL llevar a
`/me/laminas?desde=<id>`. Sin sesión SHALL llevar al registro, con un enlace al login, conservando la intención como `lamina=<id>`. Después de registrarse o
de iniciar sesión, con contraseña o con Google, la persona SHALL llegar a `/<locale>/me/laminas?desde=<id>`. La intención SHALL ser solo un identificador
de Lámina validado: un valor que no lo sea SHALL descartarse y el destino SHALL armarse en el código, nunca a partir de una URL del cliente.

#### Scenario: Visitante anónimo
- **WHEN** una persona sin sesión abre una Lámina pública
- **THEN** ve la Lámina entera y el llamado que lleva al registro

#### Scenario: Visitante con sesión
- **WHEN** una persona con sesión abre la Lámina de otra
- **THEN** el llamado lleva a `/me/laminas?desde=<id>`

#### Scenario: Dueño
- **WHEN** el dueño abre su Lámina
- **THEN** no ve el llamado

#### Scenario: Registro con la intención
- **WHEN** una persona se registra con contraseña desde `/auth/register?lamina=<id>`
- **THEN** llega a `/<locale>/me/laminas?desde=<id>`, no a `/welcome`

#### Scenario: Pasar del registro al login
- **WHEN** una persona con `lamina=<id>` va del registro al login
- **THEN** la intención se conserva

#### Scenario: Valor que no es un identificador
- **WHEN** una persona abre `/auth/register?lamina=https://otro.example`
- **THEN** el valor se descarta y el alta sigue su camino normal

#### Scenario: Con sesión en el registro
- **WHEN** una persona con sesión abre `/auth/register?lamina=<id>`
- **THEN** llega a `/me/laminas?desde=<id>`

### Requirement: Formulario inspirado en otra Lámina
`/me/laminas?desde=<id>` SHALL preseleccionar el formato y el tipo de ítem de esa Lámina, ofrecer su título como sugerencia para tocar y enlazar de vuelta a
ella. SHALL NOT copiar sus ítems ni sus notas, y SHALL NOT escribir el título en el campo. La lectura SHALL aplicar las reglas de la página pública: si la
persona no puede ver esa Lámina, si no existe o si es propia, el formulario SHALL quedar como siempre, sin error.

#### Scenario: Llegar desde una Lámina
- **WHEN** una persona abre `/me/laminas?desde=<id>` de un Top 10 de canciones titulado "Mis 10 de 2026"
- **THEN** el formulario tiene Top 10 y canciones elegidos, el título vacío y "Mis 10 de 2026" como sugerencia

#### Scenario: Usar el título sugerido
- **WHEN** toca esa sugerencia
- **THEN** el título queda en el campo y lo puede editar

#### Scenario: Sin ítems ajenos
- **WHEN** crea la Lámina
- **THEN** nace sin los ítems de la otra persona

#### Scenario: Lámina que ya no se ve
- **WHEN** la Lámina de `desde` es privada, está oculta por moderación o no existe
- **THEN** el formulario se muestra como siempre y no revela nada de ella

#### Scenario: Lámina propia
- **WHEN** una persona abre `desde` con una Lámina suya
- **THEN** el formulario se muestra como siempre

