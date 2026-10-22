## MODIFIED Requirements

### Requirement: Listado propio de Want to Listen
El sistema SHALL permitir al usuario autenticado listar su propia lista Want to Listen,
paginada, por defecto en orden cronológico descendente por fecha de creación de la entrada.
Cada entrada SHALL incluir su objetivo (tipo, id, título y carátula cuando el objetivo es un
álbum). El listado SHALL mostrar únicamente entradas del usuario que lo consulta — Want to
Listen no SHALL tener ninguna vista pública ni de terceros. El listado SHALL admitir un filtro
opcional por tipo (`artist` o `release-group`) y un orden opcional — `recent` (por defecto),
`oldest` o `alpha` (por título, sin distinguir mayúsculas) — aplicados en el servidor sobre
toda la lista, y SHALL devolver la cantidad de entradas por tipo calculada sin el filtro de
tipo. Un tipo u orden inválido SHALL responder `400` con `VALIDATION_ERROR`.

#### Scenario: Listar Want to Listen propio
- **WHEN** un usuario autenticado abre su lista Want to Listen
- **THEN** ve sus entradas ordenadas de la más reciente a la más antigua, paginadas, cada una
  con su objetivo y su carátula si es un álbum

#### Scenario: Lista vacía
- **WHEN** un usuario sin entradas abre su lista Want to Listen
- **THEN** ve un estado vacío localizado y no un error técnico

#### Scenario: Sesión requerida
- **WHEN** una request sin sesión pide el listado propio de Want to Listen
- **THEN** la API responde `401` con código `AUTH_REQUIRED`

#### Scenario: Sin superficie pública
- **WHEN** un visitante intenta consultar la lista Want to Listen de otro usuario por su
  `username`
- **THEN** el sistema no ofrece ninguna ruta ni endpoint para esa consulta

#### Scenario: Filtro por tipo con conteos completos
- **WHEN** un usuario con 2 artistas y 4 álbumes pide su lista con `type=artist`
- **THEN** recibe solo los 2 artistas y `counts` dice 2 artistas y 4 álbumes

#### Scenario: Orden alfabético
- **WHEN** pide su lista con `sort=alpha`
- **THEN** las entradas vienen por título sin distinguir mayúsculas, también en las páginas siguientes

#### Scenario: Parámetro inválido
- **WHEN** pide su lista con `type=recording` o `sort=random`
- **THEN** la API responde `400` con `VALIDATION_ERROR`

### Requirement: Secciones por tipo y modos de visualización del listado propio
El listado propio de Want to Listen SHALL separar las entradas en dos secciones —**artistas**
y **álbumes**, en ese orden— cada una con su propio encabezado y la cantidad total de entradas
de ese tipo según el servidor (no solo las cargadas); una sección sin entradas NO SHALL
renderizarse, y con un filtro de tipo activo solo SHALL renderizarse la sección de ese tipo.
El sistema SHALL ofrecer tres modos de visualización intercambiables para ambas secciones a la
vez —**Detallada** (fila con carátula o placa tipográfica), **Índice** (fila de texto compacta)
y **Gráfico** (pared de carátulas o placas)— con el mismo vocabulario y mecánica de conmutador
que el detalle de una lista (`role="radiogroup"`, navegación por flechas, preferencia persistida
en `localStorage` del visitante). El modo elegido SHALL aplicarse por igual a la sección de
artistas y a la de álbumes. Hasta conocer la preferencia guardada, el listado SHALL mostrarse
como un marcador neutro y NO SHALL pintar el modo por defecto para saltar después al guardado;
el conmutador SHALL ocultarse sin perder su espacio.

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

#### Scenario: Conteo completo con páginas pendientes
- **WHEN** el usuario tiene 30 álbumes y solo se cargaron 20
- **THEN** el encabezado de la sección dice "Álbumes (30)"

## ADDED Requirements

### Requirement: Cabecera de Pendientes con "Anotar algo"
`/me/want-to-listen` SHALL mostrar, bajo el título, una línea que describe la página y un botón
"Anotar algo" que abre el diálogo global de acciones rápidas ya en la acción Pendiente. Lo
anotado desde ese diálogo SHALL aparecer en la lista sin recargar la página, respetando el filtro
y el orden activos.

#### Scenario: Anotar desde la página
- **WHEN** el usuario pulsa "Anotar algo", busca un álbum y lo marca como pendiente
- **THEN** el diálogo se abrió en Pendiente y, al guardar, el álbum aparece en la lista sin recargar

### Requirement: Barra de tipo y orden de Pendientes
Con al menos una entrada, la página SHALL ofrecer segmentos Todo / Artistas / Álbumes con la
cantidad de cada tipo (calculada sin el filtro de tipo) y un selector de orden (Recientes, Más
antiguos, A–Z). Un tipo sin entradas SHALL verse deshabilitado salvo que esté activo. El tipo y el
orden SHALL reflejarse en la URL (`?type=&sort=`) sin crear entradas de historial, la página SHALL
abrir con los de la URL y SHALL ignorar valores inválidos. Al cambiar un filtro, la lista anterior
SHALL marcarse como ocupada hasta que llegan los resultados, y una respuesta vieja NO SHALL pisar
a una más nueva.

#### Scenario: Filtrar por tipo
- **WHEN** el usuario elige "Artistas"
- **THEN** solo se ve la sección de artistas, la URL dice `?type=artist` y los segmentos conservan
  sus cantidades

#### Scenario: URL con valor inválido
- **WHEN** el usuario abre `/me/want-to-listen?sort=random`
- **THEN** la página abre con el orden por defecto, sin error
