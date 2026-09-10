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
accesible **con y sin sesión**, que presenta el descubrimiento de listas de la comunidad. La
vista SHALL componer, en este orden, las secciones que tengan contenido:

1. **Destacadas**
2. **Populares**
3. **De usuarios seguidos** (solo con sesión)
4. **Recientes**

Una sección sin contenido SHALL omitirse: la vista se compone solo con las que tienen
contenido, sin huecos ni mensajes de "vacío" por sección. El descubrimiento SHALL ser
editorial y por reglas: SHALL NOT usar recomendación algorítmica ni personalización por
afinidad; ninguna sección SHALL depender de la actividad del lector salvo "De usuarios
seguidos", que depende solo de a quién sigue.

Cuando ninguna sección tiene contenido, la vista SHALL mostrar un estado vacío localizado y
SHALL NOT devolver un error ni redirigir.

Las etiquetas de interfaz SHALL respetar el locale activo; los títulos de listas, nombres de
usuarios y datos de catálogo SHALL conservarse sin traducir.

#### Scenario: Visita pública

- **WHEN** una persona con o sin sesión abre `/es/lists` o `/en/lists`
- **THEN** ve las secciones de descubrimiento de listas con contenido, con las etiquetas de
  interfaz en el locale activo

#### Scenario: Sección sin contenido se omite

- **WHEN** una sección de la vista no tiene listas que mostrar
- **THEN** esa sección no se renderiza y la vista se compone solo con las demás

#### Scenario: Sin recomendación personalizada

- **WHEN** dos personas distintas con sesión abren `/lists`
- **THEN** las secciones Destacadas, Populares y Recientes muestran la misma composición
  para ambas; solo "De usuarios seguidos" difiere según a quién sigue cada una

#### Scenario: Superficie completamente vacía

- **WHEN** una persona abre `/lists` en una instancia sin ninguna lista pública
- **THEN** ve un estado vacío localizado y no un error ni una redirección

### Requirement: Sección "Destacadas"

La vista `/lists` SHALL mostrar como primera sección las listas con fila en
`user_list_featured`, ordenadas de forma ascendente por `rank`, sin filtrar por tipo de
entidad. Cada entrada SHALL presentar título, dueño (con enlace al perfil), tipo de entidad,
conteo de ítems y carátulas disponibles, y SHALL enlazar al detalle de esa lista. La sección
SHALL mostrarse siempre que exista al menos una lista destacada y SHALL NOT paginar.

#### Scenario: Con listas destacadas

- **WHEN** existen listas con fila en `user_list_featured`
- **THEN** `/lists` las muestra como primera sección en orden ascendente de `rank`, cada una
  enlazando a su detalle

#### Scenario: Sin listas destacadas

- **WHEN** ninguna lista tiene fila en `user_list_featured`
- **THEN** la sección "Destacadas" no aparece en `/lists`

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

