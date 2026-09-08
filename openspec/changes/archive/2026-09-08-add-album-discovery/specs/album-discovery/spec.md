## ADDED Requirements

### Requirement: Superficie de descubrimiento de álbumes

El sistema SHALL exponer una vista pública en `/{locale}/explore` para los locales
soportados, accesible con y sin sesión, que presenta el descubrimiento de álbumes. La vista
SHALL componer, en este orden, las secciones que tengan contenido:

1. Colecciones destacadas
2. Novedades
3. Exploración por década
4. Exploración por género
5. Mejor valorados de la comunidad
6. Más reseñados

Novedades, Exploración por década y Exploración por género SHALL ser **tres secciones
independientes**, cada una con su propia lógica de navegación (Novedades no navega a ningún
listado; Década y Género abren listados filtrados con parámetros distintos). El
descubrimiento SHALL ser editorial y por reglas: SHALL NOT usar recomendación algorítmica
ni personalización por afinidad. En Fase 1 la vista SHALL centrarse en álbumes; SHALL NOT
ofrecer pestañas de artistas, canciones ni listas.

#### Scenario: Visita pública

- **WHEN** una persona con o sin sesión abre `/es/explore` o `/en/explore`
- **THEN** ve las secciones de descubrimiento de álbumes con las etiquetas de interfaz en
  el locale activo y los datos musicales sin traducir

#### Scenario: Sección sin contenido se omite

- **WHEN** una sección de la vista no tiene contenido que mostrar
- **THEN** esa sección no se renderiza — la vista se compone solo con las que sí tienen
  contenido, sin huecos ni mensajes de "vacío"

#### Scenario: Sin recomendación personalizada

- **WHEN** dos usuarios distintos con sesión abren `/explore`
- **THEN** ambos ven la misma composición: el contenido no depende de a quién siguen ni de
  su actividad

### Requirement: Colecciones destacadas

La vista `/explore` SHALL mostrar las listas públicas de álbumes que tienen una fila en
`user_list_featured`, ordenadas de forma ascendente por `rank`, como el riel de colecciones
editoriales. Cada colección SHALL presentarse con su título, su conteo de ítems y sus
carátulas disponibles, y SHALL enlazar a la página de detalle de esa lista. El riel SHALL
mostrarse siempre que exista al menos una lista destacada.

#### Scenario: Con colecciones sembradas

- **WHEN** existen listas de álbumes con fila en `user_list_featured`
- **THEN** `/explore` las muestra en el riel de colecciones destacadas, en orden ascendente
  de `rank`, cada una enlazando a su detalle

#### Scenario: Sin colecciones destacadas

- **WHEN** ninguna lista tiene fila en `user_list_featured`
- **THEN** el riel de colecciones destacadas no aparece en `/explore`

### Requirement: Exploración por década y por género

La vista `/explore` SHALL ofrecer navegación por **década** (derivada de
`release_group.first_release_year`) y por **género** (derivado de `release_group_tag`,
como un top de géneros por frecuencia). Al elegir una década o un género, el sistema SHALL
mostrar un listado paginado de álbumes de ese corte en `/{locale}/explore` acotado por un
parámetro de consulta (`?decada=` o `?genero=`), aplicando **un solo corte a la vez**. El
listado SHALL ordenarse de forma determinista: por valoración agregada del álbum cuando
alcanza `MIN_RATINGS_PER_ALBUM`, luego por `first_release_year` descendente, con desempate
estable. Los álbumes sin año conocido SHALL NOT aparecer en un listado por década.

#### Scenario: Listado por década

- **WHEN** una persona elige la década de 1990 en `/explore`
- **THEN** ve un listado paginado de álbumes cuyo `first_release_year` cae en 1990–1999,
  con orden determinista

#### Scenario: Listado por género

- **WHEN** una persona elige un género en `/explore`
- **THEN** ve un listado paginado de álbumes etiquetados con ese género, con orden
  determinista

#### Scenario: Un corte a la vez

- **WHEN** la URL incluye tanto `decada` como `genero`
- **THEN** el sistema aplica solo uno de los dos (el documentado como prioritario) y
  compone el listado sin combinarlos

#### Scenario: Álbum sin año en el browse por década

- **WHEN** un álbum no tiene `first_release_year`
- **THEN** no aparece en ningún listado por década, pero sigue siendo alcanzable por
  género, novedades y búsqueda

### Requirement: Novedades

La vista `/explore` SHALL incluir un riel de novedades con los release-groups de categoría
`studio` o `single_ep` ordenados por `first_release_year` descendente, acotado a un número
fijo de álbumes. El riel SHALL excluir los álbumes sin año conocido.

#### Scenario: Riel de novedades

- **WHEN** hay release-groups con `first_release_year` reciente
- **THEN** `/explore` muestra un riel de novedades con los más recientes, sin paginar

### Requirement: Rieles por reglas con degradación grácil

La vista `/explore` SHALL incluir un riel de **mejor valorados** (álbumes por valoración
agregada de `rating`) y un riel de **más reseñados** (álbumes por conteo de `review`). El
sistema SHALL distinguir dos umbrales, con nombres y significados diferentes:

- **Elegibilidad del álbum** (`MIN_RATINGS_PER_ALBUM` para el riel de valorados,
  `MIN_REVIEWS_PER_ALBUM` para el de reseñados): un álbum solo entra en el riel si su
  conteo de valoraciones (o reseñas) alcanza ese mínimo. Esto evita que un promedio alto
  con muy pocas señales quede por encima de uno respaldado por muchas.
- **Visibilidad del riel** (`MIN_ALBUMS_FOR_SECTION`): el riel se muestra solo si el número
  de álbumes elegibles alcanza ese mínimo.

Cada riel por reglas SHALL calcularse **bajo demanda, sin tabla materializada**, y SHALL
**omitirse por completo** cuando no alcanza `MIN_ALBUMS_FOR_SECTION` álbumes elegibles — no
SHALL mostrarse vacío ni con un texto de "todavía no hay datos". Los umbrales SHALL vivir
en constantes del servicio, ajustables sin migración.

#### Scenario: Riel oculto por falta de datos

- **WHEN** menos de `MIN_ALBUMS_FOR_SECTION` álbumes tienen al menos
  `MIN_RATINGS_PER_ALBUM` valoraciones
- **THEN** el riel de mejor valorados no aparece en `/explore`

#### Scenario: Riel visible cuando hay datos

- **WHEN** al menos `MIN_ALBUMS_FOR_SECTION` álbumes alcanzan `MIN_RATINGS_PER_ALBUM`
  valoraciones
- **THEN** el riel de mejor valorados aparece, ordenado por la valoración agregada de esos
  álbumes elegibles, sin tabla materializada

#### Scenario: Un promedio alto con pocas señales no domina el riel

- **WHEN** un álbum tiene un promedio de 5,0 con una sola valoración y otro tiene 4,7 con
  muchas
- **THEN** el primero no aparece en "mejor valorados" (no alcanza `MIN_RATINGS_PER_ALBUM`)
  y el riel no lo pone por encima del segundo

#### Scenario: Más reseñados

- **WHEN** al menos `MIN_ALBUMS_FOR_SECTION` álbumes alcanzan `MIN_REVIEWS_PER_ALBUM`
  reseñas
- **THEN** `/explore` muestra un riel de más reseñados ordenado por conteo de reseñas

### Requirement: Acceso desde la navegación global

El sistema SHALL exponer un enlace a `/explore` en la navegación global (encabezado y pie),
visible con y sin sesión. La aparición del enlace y la disponibilidad de la ruta SHALL
estar controladas por un flag de configuración leído en el servidor: con el flag apagado,
el enlace SHALL NOT mostrarse y `/explore` SHALL redirigir a Inicio.

#### Scenario: Flag encendido

- **WHEN** el flag de descubrimiento está encendido
- **THEN** el enlace a `/explore` aparece en el encabezado y el pie para cualquier
  visitante, y la ruta responde con la superficie de descubrimiento

#### Scenario: Flag apagado

- **WHEN** el flag de descubrimiento está apagado
- **THEN** el enlace no aparece en ninguna parte y abrir `/explore` redirige a Inicio

### Requirement: Cuenta curadora como fuente del contenido editorial

El sistema SHALL disponer de una cuenta de usuario **curadora** —`app_user` con
`username` `exploracion`, `display_name` `Exploración`, sin `password_hash`, con
`profile_visibility` público— cuyas listas públicas de álbumes son la fuente del contenido
editorial de `/explore`. La cuenta SHALL NOT poder iniciar sesión (no tiene credenciales ni
`auth_identity`). El contenido editorial SHALL sembrarse mediante un script idempotente, no
mediante una interfaz de administración en la aplicación.

#### Scenario: La cuenta curadora no puede autenticarse

- **WHEN** alguien intenta iniciar sesión con el `username` de la cuenta curadora
- **THEN** el intento falla como cualquier credencial inválida y no se crea sesión

#### Scenario: El seed es idempotente

- **WHEN** el script de siembra se ejecuta dos veces
- **THEN** la segunda ejecución no duplica la cuenta, las listas ni sus ítems

#### Scenario: Álbum de una colección que no está en el catálogo local

- **WHEN** el script de siembra referencia un álbum por `mbid` que aún no fue ingerido
- **THEN** ese ítem se omite con un aviso y el resto de la colección se siembra igual
