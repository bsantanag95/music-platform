## MODIFIED Requirements

### Requirement: Secciones por tipo y modos de visualización del listado propio
El listado propio de Want to Listen SHALL separar las entradas en dos secciones —**artistas**
y **álbumes**, en ese orden— cada una con su propio encabezado; una sección sin entradas NO
SHALL renderizarse. El encabezado SHALL mostrar el conteo de la sección solo cuando el listado
está completo (no quedan páginas por cargar); con páginas pendientes NO SHALL mostrar una cifra,
porque contaría solo lo cargado. El sistema SHALL ofrecer tres modos de visualización
intercambiables para ambas secciones a la vez —**Detallada** (fila con carátula o placa
tipográfica), **Índice** (fila de texto compacta) y **Gráfico** (pared de carátulas o
placas)— con el mismo vocabulario y mecánica de conmutador que el detalle de una lista
(`role="radiogroup"`, navegación por flechas, preferencia persistida en `localStorage` del
visitante). El modo elegido SHALL aplicarse por igual a la sección de artistas y a la de
álbumes. Hasta conocer la preferencia guardada, el listado SHALL mostrarse como un marcador
neutro y NO SHALL pintar el modo por defecto para saltar después al guardado; el conmutador
SHALL ocultarse sin perder su espacio.

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

#### Scenario: Sin cifra con páginas pendientes
- **WHEN** el usuario tiene más entradas que las de la primera página
- **THEN** los encabezados de sección no muestran conteo hasta que se cargó la última página

## ADDED Requirements

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
