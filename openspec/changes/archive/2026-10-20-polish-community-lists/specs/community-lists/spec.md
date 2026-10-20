## MODIFIED Requirements

### Requirement: Superficie pública de listas de la comunidad

El sistema SHALL exponer una vista pública en `/{locale}/lists` para los locales soportados,
accesible **con y sin sesión**, que presenta el descubrimiento de listas de la comunidad. La vista
SHALL tener dos estados de presentación derivados de la URL:

1. **Vitrina** (sin `q`, `type` ni `sort`): SHALL componer, en este orden, las secciones que tengan
   contenido: Destacadas, De usuarios seguidos (solo con sesión), Populares, Para completar y Recientes. Cada lista
   SHALL aparecer una sola vez: una lista que ya se muestra en una sección de más arriba SHALL omitirse en las de más
   abajo.
2. **Explorar** (con al menos uno de `q`, `type` o `sort`): SHALL renderizar una única grilla
   paginada de resultados en lugar de la composición por secciones.

Una sección sin contenido SHALL omitirse: la vista se compone solo con las que tienen contenido,
sin huecos ni mensajes de "vacío" por sección. El descubrimiento SHALL ser editorial y por reglas:
SHALL NOT usar recomendación algorítmica ni personalización por afinidad; ninguna sección SHALL
depender de la actividad del lector salvo "De usuarios seguidos", que depende solo de a quién sigue.

Cuando ninguna sección tiene contenido, la vista SHALL mostrar un estado vacío localizado y SHALL
NOT devolver un error ni redirigir.

Las etiquetas de interfaz SHALL respetar el locale activo; los títulos de listas, nombres de
usuarios y datos de catálogo SHALL conservarse sin traducir.

#### Scenario: Visita pública

- **WHEN** una persona con o sin sesión abre `/es/lists` o `/en/lists` sin parámetros de filtro
- **THEN** ve las secciones de descubrimiento de listas con contenido, con las etiquetas de
  interfaz en el locale activo

#### Scenario: Sección sin contenido se omite

- **WHEN** una sección de la vista no tiene listas que mostrar
- **THEN** esa sección no se renderiza y la vista se compone solo con las demás

#### Scenario: Sin recomendación personalizada

- **WHEN** dos personas distintas con sesión abren `/lists` sin parámetros de filtro
- **THEN** las secciones Destacadas, Populares y Recientes muestran la misma composición
  para ambas; solo "De usuarios seguidos" difiere según a quién sigue cada una

#### Scenario: Superficie completamente vacía

- **WHEN** una persona abre `/lists` en una instancia sin ninguna lista pública
- **THEN** ve un estado vacío localizado y no un error ni una redirección

#### Scenario: Estado explorar reemplaza la composición

- **WHEN** una persona abre `/lists` con al menos uno de `q`, `type` o `sort`
- **THEN** ve una única grilla de resultados y no las secciones Destacadas, Populares, De usuarios
  seguidos ni Recientes

#### Scenario: Limpiar filtros vuelve a la vitrina

- **WHEN** una persona en estado explorar activa "Limpiar filtros"
- **THEN** navega a `/lists` sin parámetros y recupera la composición editorial por secciones

#### Scenario: Una lista en una sola sección

- **WHEN** una lista de alguien que el lector sigue es también popular y reciente
- **THEN** aparece solo en "De usuarios seguidos" y no se repite en "Populares" ni en "Recientes"

#### Scenario: Orden con sesión

- **WHEN** una persona con sesión que sigue a otras abre `/lists`
- **THEN** ve "De usuarios seguidos" antes que "Populares"

### Requirement: Sección "Populares"

La vista `/lists` SHALL mostrar una sección "Populares" con listas de audiencia `public` de
perfiles `public`, ordenadas por conteo agregado de guardados descendente y, a igualdad de
conteo, por fecha de creación descendente. La sección SHALL listar solo listas con al menos
un guardado. Cada entrada SHALL mostrar el conteo de guardados junto a los demás datos de la
tarjeta, sin número de posición ni distintivo de "top". La sección SHALL NOT incluir las colecciones generadas por plantilla de la plataforma (se recorren en
Explorar). La sección SHALL excluir bloqueos en
cualquier dirección y, con sesión, las listas del propio lector. La sección SHALL ser
accesible sin sesión y SHALL poder paginarse.

#### Scenario: Listas ordenadas por guardados

- **WHEN** una persona abre `/lists` y hay listas públicas con guardados
- **THEN** la sección "Populares" las muestra de más a menos guardadas, cada tarjeta con su
  conteo de guardados

#### Scenario: Sin guardados en la comunidad

- **WHEN** ninguna lista pública tiene guardados
- **THEN** la sección "Populares" no aparece

#### Scenario: Exclusión por bloqueo en "Populares"

- **WHEN** existe un bloqueo en cualquier dirección entre el lector y el dueño de una lista
  popular
- **THEN** esa lista no aparece en "Populares"

### Requirement: Sección "Recientes"

La vista `/lists` SHALL mostrar como última sección el descubrimiento cronológico de listas
públicas definido en la capacidad `list-discovery`, accesible con y sin sesión, y SHALL
poder paginarse. SHALL NOT incluir las colecciones generadas por plantilla de la plataforma: son contenido de
Explorar, no lo último que publicó la comunidad. Una búsqueda o un filtro de `/lists` SHALL seguir encontrándolas.

#### Scenario: Recientes con y sin sesión

- **WHEN** una persona con o sin sesión abre `/lists`
- **THEN** la sección "Recientes" muestra listas públicas de la comunidad en orden
  cronológico descendente

#### Scenario: Colecciones generadas fuera de Recientes

- **WHEN** la plataforma generó la colección "Ganadores del Grammy 2025"
- **THEN** no aparece en "Recientes" ni en "Populares", y sí al buscar "Grammy" en `/lists`

## ADDED Requirements

### Requirement: Imágenes y tamaño de las tarjetas de listas

El mosaico de una tarjeta de lista SHALL usar tantas imágenes como tenga la lista, hasta cuatro, sin rellenar huecos con siluetas de
disco: una sola imagen SHALL ocupar la caja, dos SHALL dividirla en mitades, tres SHALL mostrar una grande y dos chicas. Sin ninguna,
SHALL mostrarse una única silueta de disco. Las imágenes SHALL ser la carátula del álbum, la de un álbum representativo de una canción y,
en una lista de artistas, la foto del artista si no fue retirada. Cuando "Destacadas" tiene una sola lista, su tarjeta SHALL ocupar la
fila con un mosaico mayor. "Para completar" SHALL usar la tarjeta compacta de las demás secciones.

#### Scenario: Lista con dos imágenes

- **WHEN** una lista tiene dos álbumes con carátula
- **THEN** su mosaico muestra las dos carátulas en mitades, sin discos vacíos

#### Scenario: Lista de artistas

- **WHEN** una lista de artistas tiene artistas con foto
- **THEN** su mosaico muestra esas fotos

#### Scenario: Una sola destacada

- **WHEN** "Destacadas" tiene una sola lista
- **THEN** su tarjeta ocupa todo el ancho con un mosaico mayor
