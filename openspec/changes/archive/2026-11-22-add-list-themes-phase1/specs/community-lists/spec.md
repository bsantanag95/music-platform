## MODIFIED Requirements

### Requirement: Toolbar de exploración de listas

La vista `/lists` SHALL mostrar un toolbar de exploración, siempre visible, con búsqueda por texto,
filtro por tipo de entidad (`artist`, `release-group`, `recording`) presentado como un control segmentado (Todas · Álbumes ·
Artistas · Canciones), filtro por tema (un selector "Tema" / "Theme" con "Todos los temas" más los diez temas del vocabulario,
en su orden de presentación) y orden (`popular` o `recent`). Cada segmento, el campo de búsqueda, el selector de tema y el
control de orden SHALL medir al menos 44 px de alto. Desde `lg` los cuatro SHALL ir en una sola fila (búsqueda, segmentos,
tema y orden); por debajo, la búsqueda y el orden SHALL compartir la primera fila, los segmentos SHALL ocupar una fila propia a
todo el ancho, con los cuatro visibles sin desplazar, y el selector de tema SHALL ocupar una fila propia a todo el ancho debajo
de los segmentos. El orden `popular` SHALL etiquetarse "Más guardadas" ("Most saved"), para no
confundirlo con la sección "Populares", que exige un mínimo de guardados. En la vitrina, el control de orden SHALL NOT
mostrar un valor elegido. El estado de los filtros SHALL vivir en la URL (`?q=&type=&theme=&sort=`) para ser enlazable y
sobrevivir a la recarga; un `theme` fuera del vocabulario SHALL ignorarse. El filtro de tema SHALL devolver solo las listas
con ese tema: las listas sin tema SHALL aparecer únicamente sin filtro de tema. La búsqueda por texto SHALL coincidir con el
título y la descripción de la lista. La vista SHALL ofrecer una acción para limpiar los filtros. Con filtros activos, la vista
SHALL mostrar el número de resultados y SHALL aplicar los filtros y el orden en el servidor sobre el
conjunto completo, no solo sobre la página ya cargada. Sin filtros, el toolbar SHALL existir pero
SHALL NOT modificar la composición por secciones. Un conjunto de resultados vacío SHALL mostrar un
estado "sin resultados" localizado, distinto del estado vacío global de la vitrina.

#### Scenario: Filtrar por texto y tipo

- **WHEN** una persona escribe texto y elige el chip de un tipo de entidad
- **THEN** la URL refleja `q` y `type`, el segmento queda marcado y la grilla muestra solo las listas públicas que coinciden

#### Scenario: Filtrar por tema

- **WHEN** una persona elige el tema "Recomendaciones"
- **THEN** la URL refleja `theme=recommendations`, la vista pasa al modo filtrado y muestra solo las listas públicas con ese
  tema, con el número de resultados

#### Scenario: Tema desconocido en la URL

- **WHEN** alguien abre `/lists?theme=recs`
- **THEN** la vista ignora el parámetro y se comporta como sin filtro de tema

#### Scenario: Ordenar los resultados

- **WHEN** una persona elige el orden "Más guardadas"
- **THEN** la URL refleja `sort=popular` y la grilla ordena por conteo agregado de guardados
  descendente, dejando las listas sin guardados al final

#### Scenario: Sin resultados

- **WHEN** los filtros activos no coinciden con ninguna lista pública
- **THEN** la vista muestra un estado "sin resultados" localizado con la opción de limpiar filtros

#### Scenario: Filtros en el servidor

- **WHEN** hay filtros activos y la lista tiene más resultados que una página
- **THEN** paginar mantiene los filtros aplicados y trae resultados coherentes con el conjunto
  completo, no solo con la página ya cargada

#### Scenario: Tipos visibles en el teléfono

- **WHEN** se abre `/lists` a 390 px
- **THEN** los cuatro segmentos de tipo se ven completos en su propia fila, sin desplazamiento horizontal, cada uno de al menos
  44 px de alto, la búsqueda y el orden comparten la fila de arriba y el selector de tema ocupa la fila de abajo

### Requirement: Filas del lector

Las pestañas del lector y la lista del modo explorar SHALL presentar cada lista como una **fila**: el mosaico de la lista
(64 px; 56 px en el teléfono) a la izquierda y, al lado, el título en una línea, el dueño y cuándo se actualizó ("Fran ·
hace 3 meses") y una línea de datos con el tipo y el conteo de elementos ("4 álbumes") y, si tiene, el conteo de guardados
("12 guardadas"). Si la lista tiene tema, la fila SHALL mostrar encima del título el chip del tema y, si tiene "sobre", el
texto "sobre <nombre>" en la misma línea. El conteo de guardados SHALL mostrarse en todas las pestañas y en el modo explorar,
no solo en Populares, porque es lo que distingue dos listas con el mismo título. Con sesión, la fila SHALL ofrecer la acción
Guardar con un área táctil de al menos 44×44px. Las filas SHALL ir en una sola columna, separadas por un filete, y cada
pestaña SHALL ofrecer "Ver más" para cargar la siguiente página. Desde `lg`, activar una fila SHALL abrir esa lista en la
vista previa (ver "Vista previa de la lista elegida"), que SHALL mostrar también el chip del tema y el "sobre"; por debajo de
`lg`, y sin JavaScript en cualquier ancho, la fila SHALL ser un enlace a la lista.

#### Scenario: Carátulas reconocibles

- **WHEN** una persona abre `/lists` en un viewport de 375px
- **THEN** cada fila muestra su mosaico de 56 px junto al título, el dueño y la línea de datos, y tocarla abre la lista

#### Scenario: Tema y "sobre" en la fila

- **WHEN** el lector muestra "Pink Floyd, de a poco", con tema Por dónde empezar y "sobre" Pink Floyd
- **THEN** la fila muestra el chip "Por dónde empezar" y "sobre Pink Floyd" encima del título, y la vista previa repite ambos

#### Scenario: Guardar en táctil

- **WHEN** una persona con sesión toca Guardar en una fila en móvil
- **THEN** el área táctil del botón mide al menos 44×44px

#### Scenario: Dos listas con el mismo título

- **WHEN** Dario y Bea tienen cada uno una lista "Artistas que sigo de cerca"
- **THEN** sus filas se distinguen por el dueño, la fecha y el conteo de guardados, visibles sin abrirlas

#### Scenario: Ver más

- **WHEN** la pestaña "Recientes" tiene más listas que una página
- **THEN** "Ver más" agrega la siguiente página a la misma pestaña sin recargar
