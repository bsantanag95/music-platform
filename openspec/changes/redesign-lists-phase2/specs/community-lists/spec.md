## RENAMED Requirements

- FROM: `### Requirement: Tarjetas en estantería`
- TO: `### Requirement: Filas del lector`

## REMOVED Requirements

### Requirement: Riel de contexto

**Reason**: La columna lateral de 280 px recortaba sus textos y en el teléfono quedaba al final de la página, detrás de todas
las listas (auditoría del 2026-11-21). Sus tres piezas pasan a otros lugares.

**Migration**: "Para completar" es una pestaña del lector ("Lector de listas"); "Tus listas" es una línea bajo la frase de
entrada y la invitación sin sesión es una banda después del lector ("Tus listas y la invitación a crear cuenta").

## MODIFIED Requirements

### Requirement: Superficie pública de listas de la comunidad

El sistema SHALL exponer una vista pública en `/{locale}/lists` para los locales soportados,
accesible **con y sin sesión**, que presenta el descubrimiento de listas de la comunidad. La vista
SHALL tener dos estados de presentación derivados de la URL:

1. **Vitrina** (sin `q`, `type` ni `sort`): SHALL componer, en este orden, Destacadas (si tiene contenido) y el
   **lector** (ver "Lector de listas"), con las pestañas que tengan contenido: De usuarios seguidos (solo con sesión),
   Populares, Recientes y Para completar. Sin sesión, una banda con la invitación a crear una cuenta SHALL seguir al lector
   (ver "Tus listas y la invitación a crear cuenta"). Una lista que ya se muestra en Destacadas SHALL omitirse en las
   pestañas; entre pestañas una lista SHALL poder repetirse, porque solo se ve una pestaña a la vez.
2. **Explorar** (con al menos uno de `q`, `type` o `sort`): SHALL renderizar el lector con una única lista
   paginada de resultados, sin pestañas, en lugar de la composición de la vitrina, encabezada por un rótulo con el número
   de resultados, el orden aplicado y la acción de limpiar filtros. En este estado SHALL NOT mostrarse Destacadas ni la
   banda.

Una sección o una pestaña sin contenido SHALL omitirse: la vista se compone solo con las que tienen contenido,
sin huecos ni mensajes de "vacío" por sección. El descubrimiento SHALL ser editorial y por reglas:
SHALL NOT usar recomendación algorítmica ni personalización por afinidad; ninguna sección SHALL
depender de la actividad del lector salvo "De usuarios seguidos", que depende solo de a quién sigue.

Cuando ninguna sección tiene contenido, la vista SHALL mostrar un estado vacío localizado con una acción (crear la primera
lista con sesión; iniciar sesión para crearla sin ella) y SHALL NOT devolver un error ni redirigir.

Las etiquetas de interfaz SHALL respetar el locale activo; los títulos de listas, nombres de
usuarios y datos de catálogo SHALL conservarse sin traducir, salvo los títulos de las colecciones generadas, que SHALL
mostrarse en el idioma activo.

#### Scenario: Visita pública

- **WHEN** una persona con o sin sesión abre `/es/lists` o `/en/lists` sin parámetros de filtro
- **THEN** ve Destacadas y el lector con las pestañas que tienen contenido, con las etiquetas de
  interfaz en el locale activo

#### Scenario: Sección sin contenido se omite

- **WHEN** una sección o una pestaña del lector no tiene listas que mostrar
- **THEN** no se renderiza y la vista se compone solo con las demás

#### Scenario: Sin recomendación personalizada

- **WHEN** dos personas distintas con sesión abren `/lists` sin parámetros de filtro
- **THEN** Destacadas y las pestañas Populares, Recientes y Para completar muestran la misma composición
  para ambas; solo la pestaña "De usuarios seguidos" y la línea "Tus listas" difieren según cada una

#### Scenario: Superficie completamente vacía

- **WHEN** una persona abre `/lists` en una instancia sin ninguna lista pública
- **THEN** ve un estado vacío localizado con una acción para crear la primera lista (o iniciar sesión para crearla), y
  no un error ni una redirección

#### Scenario: Estado explorar reemplaza la composición

- **WHEN** una persona abre `/lists` con al menos uno de `q`, `type` o `sort`
- **THEN** ve una única lista de resultados en el lector, con su rótulo ("12 listas · Más guardadas"), sin pestañas, sin
  Destacadas y sin la banda

#### Scenario: Limpiar filtros vuelve a la vitrina

- **WHEN** una persona en estado explorar activa "Limpiar filtros"
- **THEN** navega a `/lists` sin parámetros y recupera Destacadas y el lector con sus pestañas

#### Scenario: Una lista en una sola sección

- **WHEN** una lista destacada es también popular y reciente
- **THEN** aparece solo en Destacadas y no se repite en las pestañas "Populares" ni "Recientes"

#### Scenario: Orden con sesión

- **WHEN** una persona con sesión que sigue a otras abre `/lists`
- **THEN** la pestaña "De usuarios seguidos" va antes que "Populares" y es la que está abierta al cargar

### Requirement: Sección "Populares"

La vista `/lists` SHALL mostrar una pestaña "Populares" en el lector con listas de audiencia `public` de
perfiles `public`, ordenadas por conteo agregado de guardados descendente y, a igualdad de
conteo, por fecha de creación descendente. La pestaña SHALL listar solo listas con al menos
un guardado. Cada entrada SHALL mostrar el conteo de guardados junto a los demás datos de la
fila, sin número de posición ni distintivo de "top". La pestaña SHALL NOT incluir las colecciones generadas por plantilla de la plataforma (se recorren en
Explorar). La pestaña SHALL excluir bloqueos en
cualquier dirección y, con sesión, las listas del propio lector. La pestaña SHALL ser
accesible sin sesión y SHALL poder paginarse.

#### Scenario: Listas ordenadas por guardados

- **WHEN** una persona abre `/lists` y hay listas públicas con guardados
- **THEN** la pestaña "Populares" las muestra de más a menos guardadas, cada fila con su
  conteo de guardados

#### Scenario: Sin guardados en la comunidad

- **WHEN** ninguna lista pública tiene guardados
- **THEN** la pestaña "Populares" no aparece

#### Scenario: Exclusión por bloqueo en "Populares"

- **WHEN** existe un bloqueo en cualquier dirección entre el lector y el dueño de una lista
  popular
- **THEN** esa lista no aparece en "Populares"

### Requirement: Sección "De usuarios seguidos"

La vista `/lists` SHALL mostrar, **solo cuando hay sesión**, una pestaña del lector con listas visibles
para el lector cuyos dueños son usuarios que el lector sigue con relación aceptada, en orden
cronológico descendente por fecha de creación. La pestaña SHALL considerar visibles las
listas de audiencia `public` y `followers` de esos dueños, SHALL excluir bloqueos y perfiles
que dejaron de ser visibles, SHALL excluir las listas del propio lector y SHALL excluir las listas
sin ítems (aparecen cuando tienen el primero; el filtro va en la consulta, así la paginación no
devuelve páginas cortas). Para un lector
anónimo la pestaña SHALL NOT renderizarse, y su API SHALL responder `401` con código
`AUTH_REQUIRED`. La pestaña SHALL poder paginarse.

#### Scenario: Listas de gente que sigo

- **WHEN** un usuario con sesión que sigue a otras personas abre `/lists`
- **THEN** ve una pestaña con las listas recientes visibles de esas personas, de la más
  reciente a la más antigua

#### Scenario: Lista vacía de alguien que sigo

- **WHEN** una persona que sigo crea una lista y todavía no le agrega ítems
- **THEN** la lista no aparece en "De la gente que sigues" hasta que tenga su primer ítem

#### Scenario: Incluye audiencia followers de seguidos

- **WHEN** una persona que el lector sigue tiene una lista de audiencia `followers`
- **THEN** esa lista aparece en la pestaña "De usuarios seguidos" del lector

#### Scenario: Oculta para visitantes anónimos

- **WHEN** una persona sin sesión abre `/lists`
- **THEN** no ve la pestaña "De usuarios seguidos" y la petición directa a su API responde
  `401` con código `AUTH_REQUIRED`

#### Scenario: El lector no sigue a nadie

- **WHEN** un usuario con sesión que no sigue a nadie abre `/lists`
- **THEN** la pestaña "De usuarios seguidos" no aparece

### Requirement: Sección "Recientes"

La vista `/lists` SHALL mostrar como pestaña "Recientes" del lector el descubrimiento cronológico de listas
públicas definido en la capacidad `list-discovery`, accesible con y sin sesión, y SHALL
poder paginarse. SHALL NOT incluir las colecciones generadas por plantilla de la plataforma: son contenido de
Explorar, no lo último que publicó la comunidad. En el modo explorar, una búsqueda por texto (`q`) SHALL seguir
encontrándolas; un cambio de orden o de tipo sin texto SHALL NOT incluirlas.

#### Scenario: Recientes con y sin sesión

- **WHEN** una persona con o sin sesión abre `/lists`
- **THEN** la pestaña "Recientes" muestra listas públicas de la comunidad en orden
  cronológico descendente

#### Scenario: Colecciones generadas fuera de Recientes

- **WHEN** la plataforma generó la colección "Ganadores del Grammy 2025"
- **THEN** no aparece en "Recientes", en "Populares", con `?sort=popular` ni con `?type=release-group`, y sí al buscar
  "Grammy" en `/lists`

### Requirement: Filas del lector

Las pestañas del lector y la lista del modo explorar SHALL presentar cada lista como una **fila**: el mosaico de la lista
(64 px; 56 px en el teléfono) a la izquierda y, al lado, el título en una línea, el dueño y cuándo se actualizó ("Fran ·
hace 3 meses") y una línea de datos con el tipo y el conteo de elementos ("4 álbumes") y, si tiene, el conteo de guardados
("12 guardadas"). El conteo de guardados SHALL mostrarse en todas las pestañas y en el modo explorar, no solo en Populares,
porque es lo que distingue dos listas con el mismo título. Con sesión, la fila SHALL ofrecer la acción Guardar con un área
táctil de al menos 44×44px. Las filas SHALL ir en una sola columna, separadas por un filete, y cada pestaña SHALL ofrecer
"Ver más" para cargar la siguiente página. Desde `lg`, activar una fila SHALL abrir esa lista en la vista previa (ver
"Vista previa de la lista elegida"); por debajo de `lg`, y sin JavaScript en cualquier ancho, la fila SHALL ser un enlace a
la lista.

#### Scenario: Carátulas reconocibles

- **WHEN** una persona abre `/lists` en un viewport de 375px
- **THEN** cada fila muestra su mosaico de 56 px junto al título, el dueño y la línea de datos, y tocarla abre la lista

#### Scenario: Guardar en táctil

- **WHEN** una persona con sesión toca Guardar en una fila en móvil
- **THEN** el área táctil del botón mide al menos 44×44px

#### Scenario: Dos listas con el mismo título

- **WHEN** Dario y Bea tienen cada uno una lista "Artistas que sigo de cerca"
- **THEN** sus filas se distinguen por el dueño, la fecha y el conteo de guardados, visibles sin abrirlas

#### Scenario: Ver más

- **WHEN** la pestaña "Recientes" tiene más listas que una página
- **THEN** "Ver más" agrega la siguiente página a la misma pestaña sin recargar

## ADDED Requirements

### Requirement: Lector de listas

En la vitrina, `/lists` SHALL mostrar el **lector**: una barra de pestañas y, debajo, las filas de la pestaña abierta (ver
"Filas del lector"); desde `lg`, a su derecha, la vista previa de la lista elegida (ver "Vista previa de la lista elegida").
Las pestañas SHALL ser, en este orden y solo las que tienen contenido: "De la gente que sigues" (solo con sesión),
"Populares", "Recientes" y "Para completar". Al cargar SHALL abrirse la primera con contenido. Cambiar de pestaña SHALL NOT
recargar la página y SHALL ser accesible por teclado (`tablist`, flechas). Sin JavaScript SHALL verse la primera pestaña y
los demás contenidos SHALL seguir siendo alcanzables por sus listados (`?sort=popular`, `?sort=recent`, `/caminos`).

"Para completar" SHALL mostrar hasta 8 de las listas de `/caminos` con trackeo activo, en el mismo orden, como filas cuya línea de
datos dice cuántas personas las están completando ("1 persona la está completando"), con un enlace "Ver todas" hacia
`/caminos`; cada fila SHALL llevar a la lectura de esa lista en `/caminos`.

#### Scenario: Pestañas sin sesión

- **WHEN** una persona sin sesión abre `/lists` y hay listas recientes, populares y con trackeo
- **THEN** ve las pestañas "Populares", "Recientes" y "Para completar", con "Populares" abierta, y no "De la gente que sigues"

#### Scenario: Sin guardados

- **WHEN** ninguna lista tiene guardados
- **THEN** no hay pestaña "Populares" y la primera abierta es "Recientes"

#### Scenario: Para completar

- **WHEN** dos listas tienen personas completándolas
- **THEN** la pestaña "Para completar" las muestra con "1 persona la está completando" y un enlace "Ver todas" a `/caminos`

#### Scenario: Cambio de pestaña con teclado

- **WHEN** una persona enfoca la pestaña abierta y pulsa la flecha derecha
- **THEN** se abre la siguiente pestaña sin recargar la página

### Requirement: Vista previa de la lista elegida

Desde `lg`, el lector SHALL mostrar a la derecha de las filas una **vista previa** fija al desplazar, con la lista elegida:
su mosaico, el tipo y el conteo de elementos, el título, el dueño ("por <nombre>") y cuándo se actualizó, la descripción
(si tiene), el conteo de guardados, la acción "Abrir la lista" y, con sesión y si la lista no es propia, Guardar; debajo,
los primeros 8 elementos numerados con su carátula, título y artista, y "Ver la lista completa". Al cargar, la vista previa
SHALL mostrar la primera lista de la pestaña abierta, resuelta en el servidor. Al elegir otra fila, sus elementos SHALL
pedirse a `GET /api/users/{username}/lists/{listId}`, la fila elegida SHALL quedar marcada (`aria-current`) y, mientras
llegan, la vista previa SHALL mostrar los datos de la fila y un estado de carga. Si la petición falla o la lista dejó de
estar visible, la vista previa SHALL decirlo y ofrecer abrir la lista. Al cambiar de pestaña, la vista previa SHALL pasar a
la primera lista de la nueva pestaña. En "Para completar", "Abrir la lista" SHALL llevar a su lectura en `/caminos`. Por
debajo de `lg` la vista previa SHALL NOT renderizarse.

#### Scenario: Primera lista resuelta

- **WHEN** una persona abre `/lists` a 1440 px
- **THEN** la vista previa ya muestra la primera lista de la pestaña abierta con sus primeros elementos, sin esperar a un clic

#### Scenario: Elegir otra lista

- **WHEN** una persona hace clic en la fila "Para escuchar completos"
- **THEN** la fila queda marcada, la vista previa muestra su título y su dueño de inmediato y, al llegar, sus primeros elementos
  numerados

#### Scenario: Lista que ya no está

- **WHEN** la lista elegida se volvió privada antes del clic
- **THEN** la vista previa dice que no se pudo cargar y ofrece abrir la lista, sin romper el resto del lector

#### Scenario: Teléfono

- **WHEN** se abre `/lists` a 390 px
- **THEN** no hay vista previa y tocar una fila abre la lista

### Requirement: Tus listas y la invitación a crear cuenta

Con sesión, `/lists` SHALL mostrar bajo la frase de entrada una línea "Tus listas" con la lista propia con actividad más
reciente (mismo criterio que "Retoma una lista" de Inicio), enlazada, y accesos a las listas propias y a las guardadas; sin
listas propias, SHALL invitar a crear la primera. Sin sesión, la vitrina SHALL mostrar después del lector una banda "Arma
tus propias listas" con la acción de crear una cuenta y la de iniciar sesión. Ni una ni otra SHALL ir en una columna lateral.

#### Scenario: Retomar una lista propia

- **WHEN** una persona con sesión que editó una lista hace dos días abre `/lists`
- **THEN** bajo la frase de entrada ve "Tus listas" con esa lista enlazada y accesos a "Mis listas" y "Guardadas"

#### Scenario: Sin listas propias

- **WHEN** una persona con sesión sin listas propias abre `/lists`
- **THEN** la línea "Tus listas" invita a crear la primera y enlaza al formulario de nueva lista

#### Scenario: Visitante sin sesión

- **WHEN** una persona sin sesión abre `/lists`
- **THEN** después del lector ve la banda "Arma tus propias listas" con "Crear cuenta" e "Iniciar sesión", y no "Tus listas"
