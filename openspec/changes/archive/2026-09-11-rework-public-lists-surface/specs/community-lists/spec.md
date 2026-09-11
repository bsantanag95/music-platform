## MODIFIED Requirements

### Requirement: Superficie pública de listas de la comunidad

El sistema SHALL exponer una vista pública en `/{locale}/lists` para los locales soportados,
accesible **con y sin sesión**, que presenta el descubrimiento de listas de la comunidad. La vista
SHALL tener dos estados de presentación derivados de la URL:

1. **Vitrina** (sin `q`, `type` ni `sort`): SHALL componer, en este orden, las secciones que tengan
   contenido: Destacadas, Populares, De usuarios seguidos (solo con sesión) y Recientes.
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

### Requirement: Sección "Destacadas"

La vista `/lists` SHALL mostrar como primera sección las listas editoriales oficiales publicadas
seguidas de las listas con fila en `user_list_featured`, ordenadas estas últimas de forma ascendente
por `rank`, sin filtrar por tipo de entidad y sin duplicar una lista que aparezca en ambos
conjuntos. Una lista editorial oficial SHALL ser una lista de la cuenta curadora de `/explore`
(`@exploracion`), de audiencia `public`, `moderation_status = visible` y no retirada
(`official_withdrawn_at IS NULL`). Cada entrada SHALL presentar título, dueño (con enlace al
perfil), tipo de entidad, conteo de ítems y carátulas disponibles, y SHALL enlazar al detalle de esa
lista; las oficiales SHALL distinguirse con la insignia de contenido oficial. La sección SHALL
mostrarse siempre que exista al menos una lista oficial o destacada y SHALL NOT paginar.

#### Scenario: Con listas destacadas

- **WHEN** existen listas con fila en `user_list_featured` y ninguna lista editorial oficial
- **THEN** `/lists` las muestra como primera sección en orden ascendente de `rank`, cada una
  enlazando a su detalle

#### Scenario: Editorial oficial dentro de Destacadas

- **WHEN** existe una lista editorial oficial publicada
- **THEN** aparece en la sección "Destacadas", con la insignia de contenido oficial, antes de las
  listas destacadas por `rank`

#### Scenario: Sin listas destacadas ni oficiales

- **WHEN** no hay listas con fila en `user_list_featured` ni listas editoriales oficiales publicadas
- **THEN** la sección "Destacadas" no aparece en `/lists`

#### Scenario: Oficial retirada no se destaca

- **WHEN** una lista editorial oficial fue retirada por un administrador
- **THEN** no aparece en "Destacadas"

## ADDED Requirements

### Requirement: Toolbar de exploración de listas

La vista `/lists` SHALL mostrar un toolbar de exploración, siempre visible, con búsqueda por texto,
filtro por tipo de entidad (`artist`, `release-group`, `recording`) y orden (`popular` o `recent`).
El estado de los filtros SHALL vivir en la URL (`?q=&type=&sort=`) para ser enlazable y sobrevivir a
la recarga. La búsqueda por texto SHALL coincidir con el título y la descripción de la lista. El
toolbar SHALL ofrecer una acción para limpiar los filtros. Con filtros activos, la vista SHALL
mostrar el número de resultados y SHALL aplicar los filtros y el orden en el servidor sobre el
conjunto completo, no solo sobre la página ya cargada. Sin filtros, el toolbar SHALL existir pero
SHALL NOT modificar la composición por secciones. Un conjunto de resultados vacío SHALL mostrar un
estado "sin resultados" localizado, distinto del estado vacío global de la vitrina.

#### Scenario: Filtrar por texto y tipo

- **WHEN** una persona escribe texto y elige un tipo de entidad en el toolbar
- **THEN** la URL refleja `q` y `type` y la grilla muestra solo las listas públicas que coinciden

#### Scenario: Ordenar los resultados

- **WHEN** una persona elige el orden "Populares"
- **THEN** la URL refleja `sort=popular` y la grilla ordena por conteo agregado de guardados
  descendente, dejando las listas sin guardados al final

#### Scenario: Sin resultados

- **WHEN** los filtros activos no coinciden con ninguna lista pública
- **THEN** la vista muestra un estado "sin resultados" localizado con la opción de limpiar filtros

#### Scenario: Filtros en el servidor

- **WHEN** hay filtros activos y la lista tiene más resultados que una página
- **THEN** paginar mantiene los filtros aplicados y trae resultados coherentes con el conjunto
  completo, no solo con la página ya cargada
