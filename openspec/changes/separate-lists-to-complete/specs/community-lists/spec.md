## MODIFIED Requirements

### Requirement: Superficie pública de listas de la comunidad

El sistema SHALL exponer una vista pública en `/{locale}/lists` para los locales soportados,
accesible **con y sin sesión**, que presenta el descubrimiento de listas de la comunidad. La vista
SHALL tener dos estados de presentación derivados de la URL:

1. **Vitrina** (sin `q`, `type` ni `sort`): SHALL componer, en este orden, Destacadas (si tiene contenido), **Para
   completar** (ver "Sección Para completar") y el **lector** (ver "Lector de listas"), con las pestañas que tengan contenido:
   De usuarios seguidos (solo con sesión), Populares y Recientes. Sin sesión, una banda con la invitación a crear una cuenta SHALL seguir al lector
   (ver "Tus listas y la invitación a crear cuenta"). Una lista que ya se muestra en Destacadas SHALL omitirse en las
   pestañas; entre pestañas una lista SHALL poder repetirse, porque solo se ve una pestaña a la vez.
2. **Explorar** (con al menos uno de `q`, `type` o `sort`): SHALL renderizar el lector con una única lista
   paginada de resultados, sin pestañas, en lugar de la composición de la vitrina, encabezada por un rótulo con el número
   de resultados, el orden aplicado y la acción de limpiar filtros. En este estado SHALL NOT mostrarse Destacadas ni la
   banda; "Para completar" SHALL mostrarse encima del lector según los filtros (ver "Sección Para completar").

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

### Requirement: Lector de listas

En la vitrina, `/lists` SHALL mostrar el **lector**: una barra de pestañas y, debajo, las filas de la pestaña abierta (ver
"Filas del lector"); desde `lg`, a su derecha, la vista previa de la lista elegida (ver "Vista previa de la lista elegida").
Las pestañas SHALL ser, en este orden y solo las que tienen contenido: "De la gente que sigues" (solo con sesión),
"Populares" y "Recientes". Al cargar SHALL abrirse la primera con contenido. Cambiar de pestaña SHALL NOT
recargar la página y SHALL ser accesible por teclado (`tablist`, flechas). Sin JavaScript SHALL verse la primera pestaña y
los demás contenidos SHALL seguir siendo alcanzables por sus listados (`?sort=popular`, `?sort=recent`). "Para completar" SHALL NOT
ser una pestaña del lector: es una sección propia (ver "Sección Para completar").

#### Scenario: Pestañas sin sesión

- **WHEN** una persona sin sesión abre `/lists` y hay listas recientes, populares y con trackeo
- **THEN** ve las pestañas "Populares" y "Recientes", con "Populares" abierta, y no "De la gente que sigues"; "Para completar" va
  en su propia sección, encima del lector

#### Scenario: Sin guardados

- **WHEN** ninguna lista tiene guardados
- **THEN** no hay pestaña "Populares" y la primera abierta es "Recientes"

#### Scenario: Para completar

- **WHEN** dos listas tienen personas completándolas
- **THEN** no aparecen como pestaña del lector sino en la sección "Para completar", encima de él

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
la primera lista de la nueva pestaña. Por
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

## ADDED Requirements

### Requirement: Sección Para completar

`/lists` SHALL mostrar "Para completar" como una **sección propia**, con encabezado de página, después de Destacadas y antes
del lector, porque completar una lista es una acción y no otra forma de descubrir listas. El encabezado SHALL explicar en una
frase qué es completar una lista y SHALL ofrecer "Ver todas" hacia `/caminos`. La sección SHALL mostrar hasta 4 de las listas
de `/caminos` con trackeo activo, en el mismo orden, como **tarjetas con acción**: una tira de hasta cuatro carátulas de la
lista, el título, el dueño, cuántas personas la están completando ("1 persona la está completando") y un botón "Completarla"
que lleva a su lectura en `/caminos`. Desde `lg` las tarjetas SHALL ir en una fila de hasta cuatro columnas; por debajo, en
dos columnas y, en el teléfono, en una fila con desplazamiento táctil. Sin ninguna lista con trackeo activo, la sección SHALL
omitirse.

Como estas listas son siempre de álbumes, con filtros activos la sección SHALL mostrarse solo cuando el tipo es "Todas" o
"Álbumes", y con una búsqueda por texto SHALL mostrar solo las que contienen ese texto en el título (sin distinguir mayúsculas);
con el tipo "Artistas" o "Canciones", o si ninguna coincide con la búsqueda, SHALL omitirse.

#### Scenario: Sección propia tras Destacadas

- **WHEN** una persona abre `/lists` sin filtros y hay dos listas con trackeo activo
- **THEN** después de Destacadas ve la sección "Para completar" con dos tarjetas, cada una con sus carátulas, "1 persona la está
  completando" y "Completarla", y el lector viene después

#### Scenario: Filtro de álbumes

- **WHEN** una persona filtra por "Álbumes"
- **THEN** la sección "Para completar" sigue visible encima de los resultados

#### Scenario: Filtro de artistas

- **WHEN** una persona filtra por "Artistas"
- **THEN** la sección "Para completar" no aparece, porque no hay listas de artistas para completar

#### Scenario: Búsqueda por texto

- **WHEN** una persona busca "sabrina" sin elegir tipo
- **THEN** la sección muestra solo las listas para completar cuyo título contiene "sabrina", y se omite si ninguna lo contiene

#### Scenario: Sin trackeo

- **WHEN** ninguna lista tiene trackeo activo
- **THEN** la sección "Para completar" no aparece
