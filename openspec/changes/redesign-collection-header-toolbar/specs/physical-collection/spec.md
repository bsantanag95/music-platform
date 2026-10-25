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
formato sin copias SHALL quedar deshabilitado. El encabezado SHALL NOT incluir barras de
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

### Requirement: Página de la colección propia
La página `/me/collection` SHALL usar el mismo ancho y encabezado alineado a la izquierda que las
demás páginas propias de biblioteca, con una línea de descripción y, en la pestaña Tengo, la
acción **"Añadir copia"**, que abre el diálogo de acciones rápidas en la acción Colección. Las
pestañas Tengo y Busco SHALL mostrar el total de cada una y la cifra de la pestaña abierta SHALL
actualizarse al quitar, deshacer o agregar. La barra de herramientas SHALL ocupar una sola fila
en pantallas anchas; en pantallas angostas los filtros de edición, agrupación y orden SHALL
quedar detrás de un botón "Filtros" que indica cuántos hay activos. Los filtros activos de cada
pestaña (pestaña, búsqueda, formato, atributo, orden y agrupación) SHALL escribirse en la URL
cuando difieren del valor por defecto, sin recargar la página, de modo que una recarga o un
enlace copiado muestren la misma selección. Con puntero grueso, los controles de cada entrada,
las pestañas, el conmutador de modo y la barra de selección SHALL medir al menos 44 px de alto.
En modo selección, tocar la ficha de una copia SHALL marcarla o desmarcarla (sin abrir el álbum)
y la copia marcada SHALL distinguirse visualmente.

#### Scenario: Filtros en la URL
- **WHEN** el dueño filtra por `vinyl` y busca "dokken"
- **THEN** la URL pasa a incluir `format=vinyl&q=dokken` y, al recargar, ve la misma selección

#### Scenario: Valores por defecto fuera de la URL
- **WHEN** el dueño limpia los filtros
- **THEN** la URL queda en `/me/collection` sin parámetros

#### Scenario: Marcar tocando la ficha
- **WHEN** el dueño está en modo selección y toca la carátula de una copia
- **THEN** la copia queda marcada y resaltada, y la página no navega al álbum

#### Scenario: Pestañas con total
- **WHEN** el dueño tiene 13 copias y 6 variantes en búsqueda
- **THEN** las pestañas dicen "Tengo 13" y "Busco 6"

#### Scenario: La cifra sigue a los cambios
- **WHEN** el dueño quita una copia en Tengo
- **THEN** la pestaña pasa a "Tengo 12" sin recargar, y vuelve a 13 si deshace

#### Scenario: Añadir una copia desde la página
- **WHEN** el dueño pulsa "Añadir copia" y agrega un álbum en vinilo desde el diálogo
- **THEN** la estantería se recarga y muestra la copia nueva

#### Scenario: Filtros en móvil
- **WHEN** el dueño abre la página en una pantalla angosta con un atributo filtrado
- **THEN** ve el buscador y un botón "Filtros 1" que despliega edición, agrupación y orden
