## MODIFIED Requirements

### Requirement: Encabezado compacto con resultados

Con una consulta, `/search` SHALL dejar el título "Buscar", la etiqueta del campo y el resumen "Resultados para «texto»" solo
para lectores de pantalla. SHALL mostrar el campo grande de la página (selector de tipo, texto y Buscar) en una sola fila,
también en móvil, y debajo las pestañas de tipo, con la cifra de resultados en la pestaña activa.
La cifra SHALL ser exacta hasta 1.000 y "más de 1.000" por encima (el total de MusicBrainz no es lo que se recorre). La
sugerencia para acotar una consulta genérica SHALL usar la misma cifra ("Más de 1.000 álbumes coinciden…"). La cifra SHALL
NOT ser menor que la cantidad de resultados listados: si el total informado por MusicBrainz es menor (por ejemplo, 0 con
coincidencias locales), SHALL mostrarse la cantidad listada.
Por debajo de `lg`, las pastillas de categoría y década de Álbumes SHALL plegarse tras un botón **Filtros** que indica
cuántos hay activos. Desde `lg` SHALL verse siempre, en la columna lateral. El primer resultado SHALL quedar en la primera
pantalla de un móvil de 375 × 812.

#### Scenario: Álbumes en móvil
- **WHEN** una persona abre `/search?type=album&q=the wall` en 375 px
- **THEN** ve el campo en una fila, las pestañas con "más de 1.000" en Álbumes, "Filtros" y los primeros resultados sin
  desplazarse

#### Scenario: Filtro activo en móvil
- **WHEN** la búsqueda tiene la década 1970s
- **THEN** el botón dice "Filtros · 1" y al pulsarlo muestra las pastillas con 1970s marcada

#### Scenario: Total remoto menor que la lista
- **WHEN** una persona busca `radiohed` en Artistas, MusicBrainz informa un total de 0 y la lista muestra 8 artistas del
  catálogo
- **THEN** la pestaña Artistas dice "8 resultados", nunca "0 resultados"

#### Scenario: Filtros de Álbumes en escritorio
- **WHEN** una persona abre `/search?type=album&q=the wall` en 1440 px
- **THEN** las pastillas de categoría y década se ven en la columna lateral, sin botón **Filtros**, y el primer disco
  aparece justo debajo de las pestañas

## ADDED Requirements

### Requirement: Marco ancho con columna lateral

Con una consulta, `/search` SHALL usar el marco de 88rem del resto del sitio. Desde `lg` SHALL repartirlo en una columna
de resultados (8 de 12) y una columna lateral (4 de 12) que queda fija bajo el Header al desplazarse. La columna lateral
SHALL reunir los filtros del tipo (Persona/Grupo en Artistas, categoría y década en Álbumes) y la sugerencia para acotar
por artista (Álbumes y Canciones). Cuando el tipo no tiene nada que mostrar ahí, la columna de resultados SHALL conservar
su ancho de 8 columnas. Por debajo de `lg`, la página SHALL tener una sola columna y ese contenido SHALL ir sobre los
resultados. `/search/advanced` SHALL NOT cambiar.

#### Scenario: Escritorio con filtros
- **WHEN** una persona abre `/search?type=artist&q=pink` en 1440 px
- **THEN** los resultados ocupan la columna izquierda y Todos/Persona/Grupo se ven en la columna lateral, que sigue
  visible al desplazarse por la lista

#### Scenario: Teléfono
- **WHEN** una persona abre la misma búsqueda en 390 px
- **THEN** la página tiene una sola columna sin desbordes, con Todos/Persona/Grupo sobre los resultados

#### Scenario: Búsqueda avanzada sin cambios
- **WHEN** una persona abre `/search/advanced?type=album&q=the wall`
- **THEN** la página conserva su formulario, su resumen y su lista, sin columna lateral

### Requirement: Encabezados de los grupos de resultados

En la búsqueda rápida, los grupos de resultados ("Otros artistas llamados «x»", "Más resultados", "Otras canciones con
este título") SHALL llevar un encabezado de sección visible (tipografía de display, de mayor peso que los nombres de las
filas) y, cuando se conoce, la cantidad del grupo. Estos encabezados SHALL ser de un nivel inferior al título oculto de los
resultados.

#### Scenario: Homónimos
- **WHEN** una persona busca `kiss` en Artistas
- **THEN** sobre los otros KISS se ve el encabezado "Otros artistas llamados «kiss»" con su cantidad, como `h3`

### Requirement: Marca de presencia en el catálogo

Los resultados y las sugerencias cuya discografía o tracklist ya está en la plataforma SHALL marcarse como "en el catálogo"
("in the catalog"), con o sin sesión, y SHALL NOT decir "en tu catálogo": el catálogo es de la plataforma, no de quien busca.

#### Scenario: Visitante sin sesión
- **WHEN** una persona sin sesión busca `the wall` en Álbumes
- **THEN** el disco de Pink Floyd, con su tracklist ya guardada, lleva la marca "en el catálogo"
