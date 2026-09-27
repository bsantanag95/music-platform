## ADDED Requirements

### Requirement: Sugerencias locales instantáneas

Mientras una persona escribe en el buscador (Header o `/search`), el sistema SHALL mostrar hasta
seis sugerencias del tipo activo obtenidas **exclusivamente de la base propia** mediante
`GET /api/search/suggest?type=<tipo>&q=<texto>`. Las sugerencias SHALL pedirse a partir de 2
caracteres tras normalizar y con debounce, y SHALL descartarse las respuestas de consultas
superadas. El endpoint SHALL NOT realizar ninguna solicitud a MusicBrainz ni persistir nada.

#### Scenario: Escribir un artista conocido
- **WHEN** una persona escribe `sabr` con el tipo Artistas y Sabrina Carpenter existe en la base
  local
- **THEN** Sabrina Carpenter aparece entre las sugerencias sin esperar a MusicBrainz

#### Scenario: Presupuesto cero
- **WHEN** se resuelve cualquier solicitud a `/api/search/suggest`
- **THEN** no se emite ninguna solicitud a MusicBrainz

#### Scenario: Menos de dos caracteres
- **WHEN** el campo contiene un solo carácter
- **THEN** no se piden sugerencias

### Requirement: Coincidencia tolerante y orden de sugerencias

Las sugerencias SHALL coincidir sin distinguir mayúsculas ni acentos y SHALL tolerar diferencias
menores de escritura (similitud por trigramas). SHALL ordenarse: coincidencia exacta, luego
prefijo, luego similitud; a igualdad, primero las entidades con actividad en la plataforma. Una
entidad cuyo nombre solo contiene la consulta a mitad de palabra (p. ej. "Morricone" para
`icon`) SHALL quedar detrás de las que coinciden por palabra completa.

#### Scenario: Acentos
- **WHEN** una persona escribe `motorhead` en Artistas
- **THEN** Motörhead aparece como sugerencia

#### Scenario: Palabra completa primero
- **WHEN** una persona escribe `icon` en Artistas y existen "Icon", "Despised Icon" y "Ennio
  Morricone"
- **THEN** "Icon" aparece antes que "Despised Icon" y ambos antes que "Ennio Morricone"

### Requirement: Puente artista + título en las sugerencias

Con el tipo Artistas, si la consulta empieza o termina con el nombre de un artista local y el
resto coincide con el título de un álbum de ese artista en la base local, las sugerencias SHALL
incluir una fila de ese álbum marcada con su tipo ("Álbum"). Elegirla SHALL abrir el álbum. El
puente SHALL calcularse solo con datos locales.

#### Scenario: Artista y álbum en Artistas
- **WHEN** una persona escribe `dokken back for` en Artistas y *Back for the Attack* de Dokken
  existe localmente
- **THEN** las sugerencias incluyen "Álbum · Back for the Attack — Dokken"

### Requirement: Acciones del desplegable

Debajo de las sugerencias, el desplegable SHALL ofrecer "Ver todos los resultados de «<texto>»
en <tipo>" y accesos "Buscar en otro tipo" para los demás tipos, que cambian el tipo del campo
conservando el texto. Si no hay sugerencias locales, el desplegable SHALL mostrar igualmente
estas acciones.

#### Scenario: Sin sugerencias locales
- **WHEN** una persona escribe `farruko` en Artistas y no hay coincidencias locales
- **THEN** el desplegable muestra "Ver todos los resultados de «farruko» en artistas" y los
  accesos a los otros tipos

#### Scenario: Cambiar de tipo desde el desplegable
- **WHEN** una persona pulsa "Álbumes" en "Buscar en otro tipo"
- **THEN** el selector pasa a Álbumes, el texto se conserva y las sugerencias se recalculan para
  álbumes

### Requirement: Navegación desde una sugerencia

Elegir una sugerencia SHALL navegar directamente a la entidad (`/artist/<id>`, `/album/<id>` o
`/users/<username>`); una sugerencia de canción SHALL navegar a
`/search?type=song&q=<artista> - <título>`. Enviar el formulario sin una sugerencia activa SHALL
navegar a `/search?type=<tipo>&q=<texto>`.

#### Scenario: Elegir artista sugerido
- **WHEN** una persona selecciona la sugerencia "Icon · US, Arizona hair metal band"
- **THEN** la aplicación abre el perfil de ese artista sin pasar por `/search`

#### Scenario: Enviar sin elegir
- **WHEN** una persona escribe `kiss` y pulsa Enter sin mover la selección
- **THEN** la aplicación navega a `/search?type=artist&q=kiss`

### Requirement: Accesibilidad y teclado del desplegable

El campo SHALL implementar el patrón combobox: `role="combobox"` con `aria-expanded` y
`aria-controls`, lista con `role="listbox"`, opción activa vía `aria-activedescendant`. Flecha
abajo/arriba SHALL mover la opción activa, Enter SHALL elegirla y Escape SHALL cerrar el
desplegable. La tecla Tab SHALL NOT reasignarse: sigue moviendo el foco. El número de
sugerencias SHALL anunciarse de forma no intrusiva.

#### Scenario: Recorrer con flechas
- **WHEN** una persona escribe `kiss`, pulsa flecha abajo dos veces y Enter
- **THEN** se abre la segunda sugerencia

#### Scenario: Escape
- **WHEN** el desplegable está abierto y la persona pulsa Escape
- **THEN** el desplegable se cierra y el foco sigue en el campo con el texto intacto

### Requirement: Falla silenciosa de sugerencias

Si `/api/search/suggest` falla, el buscador SHALL seguir funcionando: el desplegable muestra solo
las acciones y el envío navega a `/search` con normalidad, sin mensaje de error.

#### Scenario: Endpoint caído
- **WHEN** la solicitud de sugerencias falla
- **THEN** la persona puede enviar la búsqueda y llegar a los resultados
