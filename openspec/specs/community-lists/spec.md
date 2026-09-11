# community-lists Specification

## Purpose

Superficie pública `/[locale]/lists` para descubrir listas de la comunidad (cambio
`add-community-lists-surface`), accesible con y sin sesión y enlazada desde la barra general
del Header. Compone cuatro secciones —Destacadas (curaduría editorial vía
`user_list_featured`), Populares (por conteo agregado de guardados), De usuarios seguidos
(solo con sesión) y Recientes (descubrimiento cronológico de `list-discovery`)— omitiendo
las vacías, sin recomendación algorítmica ni personalización por afinidad.

## Requirements
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

### Requirement: Sección "Populares"

La vista `/lists` SHALL mostrar una sección "Populares" con listas de audiencia `public` de
perfiles `public`, ordenadas por conteo agregado de guardados descendente y, a igualdad de
conteo, por fecha de creación descendente. La sección SHALL listar solo listas con al menos
un guardado. Cada entrada SHALL mostrar el conteo de guardados junto a los demás datos de la
tarjeta, sin número de posición ni distintivo de "top". La sección SHALL excluir bloqueos en
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

### Requirement: Sección "De usuarios seguidos"

La vista `/lists` SHALL mostrar, **solo cuando hay sesión**, una sección con listas visibles
para el lector cuyos dueños son usuarios que el lector sigue con relación aceptada, en orden
cronológico descendente por fecha de creación. La sección SHALL considerar visibles las
listas de audiencia `public` y `followers` de esos dueños, SHALL excluir bloqueos y perfiles
que dejaron de ser visibles, y SHALL excluir las listas del propio lector. Para un lector
anónimo la sección SHALL NOT renderizarse, y su API SHALL responder `401` con código
`AUTH_REQUIRED`. La sección SHALL poder paginarse.

#### Scenario: Listas de gente que sigo

- **WHEN** un usuario con sesión que sigue a otras personas abre `/lists`
- **THEN** ve una sección con las listas recientes visibles de esas personas, de la más
  reciente a la más antigua

#### Scenario: Incluye audiencia followers de seguidos

- **WHEN** una persona que el lector sigue tiene una lista de audiencia `followers`
- **THEN** esa lista aparece en la sección "De usuarios seguidos" del lector

#### Scenario: Oculta para visitantes anónimos

- **WHEN** una persona sin sesión abre `/lists`
- **THEN** no ve la sección "De usuarios seguidos" y la petición directa a su API responde
  `401` con código `AUTH_REQUIRED`

#### Scenario: El lector no sigue a nadie

- **WHEN** un usuario con sesión que no sigue a nadie abre `/lists`
- **THEN** la sección "De usuarios seguidos" no aparece

### Requirement: Sección "Recientes"

La vista `/lists` SHALL mostrar como última sección el descubrimiento cronológico de listas
públicas definido en la capacidad `list-discovery`, accesible con y sin sesión, y SHALL
poder paginarse.

#### Scenario: Recientes con y sin sesión

- **WHEN** una persona con o sin sesión abre `/lists`
- **THEN** la sección "Recientes" muestra listas públicas de la comunidad en orden
  cronológico descendente

### Requirement: Acceso desde la navegación global

El sistema SHALL exponer un enlace a `/lists` en la barra general del Header, junto al
buscador y a Explorar, **con y sin sesión**. El enlace SHALL usar la etiqueta localizada de
"Listas" y SHALL apuntar a la superficie pública `/lists`, no a `/me/lists`. En el panel
móvil del Header el enlace SHALL vivir en el bloque de barra general.

#### Scenario: Enlace visible para cualquiera

- **WHEN** se renderiza el Header, con o sin sesión
- **THEN** la barra general muestra un enlace "Listas" hacia `/lists`

#### Scenario: El enlace no lleva a la gestión personal

- **WHEN** una persona activa el enlace "Listas" del Header
- **THEN** llega a `/lists` y no a `/me/lists`

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

