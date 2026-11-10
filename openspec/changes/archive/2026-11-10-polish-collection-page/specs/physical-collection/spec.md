## MODIFIED Requirements

### Requirement: Colección propia en formato lista
El sistema SHALL permitir al usuario autenticado ver su colección completa en una superficie
única enriquecida —sin sub-navegación—, con paginación y mostrando por entrada el álbum (con su
carátula cuando exista), su artista, el formato, los atributos y la nota. El sistema SHALL
aceptar, combinables y aplicados en servidor sobre el conjunto completo:

- **búsqueda por texto** (`q`) sobre el título del álbum y el nombre del artista acreditado
  (coincidencia parcial sin distinguir mayúsculas);
- **filtro por formato** y **filtro por atributo** (un valor cada uno);
- **orden** (`sort`): recencia (default), alfabético por título, por artista, o por formato;
- **agrupación** (`group`): sin agrupar (`none`, default), por artista, por formato o por mes de
  alta (`date`).

La respuesta SHALL incluir el **conteo por formato** (`counts`), calculado sobre el conjunto
tras aplicar `q` y el filtro de atributo pero **ignorando** el filtro de formato, de modo que el
encabezado muestre siempre la distribución entre formatos, y el **total** de copias del usuario
sin ningún filtro (`total`). El encabezado SHALL presentar el conteo como **segmentos por
formato** (Todo y los cuatro formatos, cada uno con su cifra) que filtran al elegirlos; un
formato sin copias SHALL NOT mostrarse, salvo que sea el formato elegido (para poder salir de él). El segmento
elegido SHALL usar un estado neutro, no el color de acento, que queda para la pestaña activa. El encabezado SHALL NOT incluir barras de
progreso, pendientes ni insignias de completitud.

#### Scenario: Ver la colección propia
- **WHEN** un usuario autenticado abre su página de colección
- **THEN** ve sus entradas paginadas, con la carátula del álbum cuando está disponible, en el
  modo de visualización que tenga elegido

#### Scenario: Buscar por título de álbum
- **WHEN** el usuario busca "rumours" en su colección
- **THEN** ve únicamente las entradas cuyo álbum coincide parcialmente con ese texto

#### Scenario: Buscar por artista acreditado
- **WHEN** el usuario busca "fleetwood" en su colección
- **THEN** ve las entradas cuyo artista acreditado coincide parcialmente con ese texto, aunque
  el título del álbum no coincida

#### Scenario: Filtrar por formato
- **WHEN** el usuario filtra su colección por `vinyl`
- **THEN** ve únicamente las entradas cuyo formato es `vinyl`, y el conteo por formato del
  encabezado sigue mostrando todos los formatos

#### Scenario: Filtrar por atributo
- **WHEN** el usuario filtra su colección por `limited-edition`
- **THEN** ve únicamente las entradas que tienen ese atributo

#### Scenario: Ordenar y agrupar
- **WHEN** el usuario ordena por artista y agrupa por formato
- **THEN** ve sus entradas seccionadas por formato y, dentro de cada sección, ordenadas por
  artista

#### Scenario: Filtros combinados sin resultados
- **WHEN** los filtros activos no dejan ninguna entrada
- **THEN** ve un estado vacío de "sin resultados" localizado, distinto del estado de colección
  vacía, con la opción de limpiar los filtros

#### Scenario: Colección vacía
- **WHEN** un usuario sin entradas abre su página de colección
- **THEN** ve un estado vacío localizado con una vía para ir a agregar discos desde el catálogo,
  y no un error técnico

#### Scenario: Paginación inválida
- **WHEN** se envía una paginación fuera de rango
- **THEN** la API responde `400` con código `VALIDATION_ERROR` y no ejecuta la lectura

#### Scenario: Sin agrupar por defecto
- **WHEN** el usuario abre su colección sin elegir agrupación
- **THEN** ve todas sus copias en una sola sección, ordenadas por recencia

#### Scenario: Elegir un formato desde el encabezado
- **WHEN** el usuario toca el segmento "Vinilo 3"
- **THEN** ve solo sus vinilos, el segmento queda marcado y los demás conservan su cifra

#### Scenario: Total sin filtros
- **WHEN** el usuario busca "dokken" en una colección de 13 copias
- **THEN** la respuesta sigue trayendo `total: 13`

#### Scenario: Formato sin copias
- **WHEN** el usuario no tiene ninguna copia en cassette
- **THEN** el encabezado no muestra el segmento "Cassette"

### Requirement: Modos de visualización de la colección
El sistema SHALL presentar la colección —propia y en la vista de perfil— en tres modos de
visualización a elegir por el visitante:

- **Estantería**: cuadrícula de carátulas cuadradas donde predomina lo visual, con el título, el
  artista con el año del álbum y el formato con su primer atributo al pie de cada ficha.
- **Lista detallada**: filas compactas separadas por una línea con carátula, título, artista con
  el año, una línea de texto "formato · atributos", nota, audiencia y la fecha de alta rotulada
  como tal ("Añadida el …"). La audiencia Pública o Seguidores SHALL mostrarse solo como un ícono
  discreto (con el nombre en la etiqueta accesible y al pasar el cursor); la Privada SHALL
  conservar su nombre y el color de acento. Cuando la colección se agrupa por artista,
  la fila SHALL NOT repetir el artista del encabezado.
- **Índice**: una tabla con posición, álbum, artista, formato, edición, fecha de alta y las
  acciones de la fila, sin reservar espacio oculto.

La preferencia de modo SHALL guardarse **local por visitante** (no en servidor) y SHALL ser
**global** a la colección (no una preferencia por página ni por usuario mirado). El modo por
defecto SHALL ser **Estantería**. Un valor de preferencia inválido o ausente SHALL caer al modo
por defecto sin error. El modo SHALL NOT viajar en la URL ni alterar la consulta de datos.
Hasta leer la preferencia guardada, la superficie SHALL mostrar un marcador neutro en lugar de
pintar un modo y saltar a otro. Cuando una entrada no tiene carátula resuelta, cualquier modo
SHALL usar la silueta de disco del sistema en lugar de un recuadro vacío.

#### Scenario: Elegir un modo de visualización
- **WHEN** el visitante cambia de "Estantería" a "Índice"
- **THEN** la colección se re-renderiza en ese modo y la preferencia queda guardada localmente

#### Scenario: La preferencia persiste entre páginas y recargas
- **WHEN** el visitante que eligió "Lista detallada" recarga o navega a la colección de otra
  persona
- **THEN** la colección se muestra en "Lista detallada" sin volver a pedirle la elección

#### Scenario: Preferencia inicial o corrupta
- **WHEN** el visitante no tiene preferencia guardada, o el valor guardado no es un modo válido
- **THEN** la colección se muestra en "Estantería" sin error

#### Scenario: Entrada sin carátula
- **WHEN** una entrada apunta a un álbum sin carátula resuelta
- **THEN** su ficha muestra la silueta de disco del sistema en cualquiera de los tres modos

#### Scenario: Sin salto de modo al cargar
- **WHEN** el visitante que eligió "Índice" abre la colección
- **THEN** ve un marcador neutro hasta que se lee su preferencia y luego el Índice, sin pintar
  antes la Estantería

#### Scenario: Año del álbum
- **WHEN** una copia es de un álbum publicado en 1987
- **THEN** su ficha dice "Guns N' Roses · 1987" junto al título

#### Scenario: Audiencia en la Lista detallada
- **WHEN** el usuario ve en Lista detallada una copia para Seguidores y otra Privada
- **THEN** la primera muestra solo el ícono de audiencia y la segunda el ícono con "Privado"
