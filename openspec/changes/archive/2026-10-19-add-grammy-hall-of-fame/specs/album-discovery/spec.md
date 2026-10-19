## MODIFIED Requirements

### Requirement: Superficie de descubrimiento de álbumes

El sistema SHALL exponer una vista pública en `/{locale}/explore` para los locales
soportados, accesible con y sin sesión, que presenta el descubrimiento de álbumes. La vista
SHALL componer, en este orden, las secciones que tengan contenido:

1. Colecciones
2. Popular ahora
3. Exploración por género
4. Novedades
5. Próximos lanzamientos
6. Premios
7. Salón de la Fama
8. Mejor valorados de la comunidad
9. Exploración por década

Colecciones SHALL ser **una sola sección**, con un único orden, un único tope y un único enlace "Ver todas" a la
página de colecciones: la vista SHALL NOT separar las colecciones curadas de las generadas por plantilla, porque la
forma en que se mantiene una colección no es información para quien mira. Novedades, Próximos lanzamientos,
Exploración por década y
Exploración por género SHALL ser
**secciones independientes**, cada una con su propia lógica de navegación (Novedades y
Próximos lanzamientos abren sus listados completos; Década y Género abren listados filtrados
con parámetros distintos). Premios SHALL mostrar una tarjeta por premio competitivo, con su ceremonia más reciente, enlazada a su página de ceremonia, y un enlace al hub de
premios (capacidad `music-awards`). Salón de la Fama SHALL mostrar la última clase cerrada de cada salón de la fama, sin mezclarse con Premios. El descubrimiento SHALL ser editorial y por reglas: SHALL
NOT usar recomendación algorítmica ni personalización por afinidad. La vista SHALL centrarse en
álbumes; la única sección que muestra artistas y canciones SHALL ser Popular ahora, con sus pestañas,
y la vista SHALL NOT ofrecer listas como objetivo de descubrimiento.

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

#### Scenario: Sección Premios

- **WHEN** hay ceremonias de premios cargadas
- **THEN** `/explore` muestra, después de Próximos lanzamientos, una tarjeta por cada premio, con su ceremonia más reciente y su
  ganador destacado, y un enlace a `/awards`; sin ceremonias, la sección se omite

#### Scenario: Premios de varios premios

- **WHEN** hay cargadas ceremonias de cinco premios, tres de ellas de febrero
- **THEN** la sección muestra cinco tarjetas, una por premio, de la ceremonia más reciente a la más antigua, y ningún premio queda fuera por haber otros con ceremonias más recientes

#### Scenario: Sección Salón de la Fama

- **WHEN** hay una clase cerrada de un salón de la fama cargada
- **THEN** `/explore` muestra, inmediatamente después de Premios y antes de Mejor valorados, la sección Salón de la Fama con las
  incorporaciones de esa clase y un enlace a todas las clases; sin clases cerradas, la sección se omite

#### Scenario: Premios sin salones de la fama

- **WHEN** hay cargados premios competitivos y un salón de la fama
- **THEN** la sección Premios muestra una tarjeta por cada premio competitivo y ninguna del salón

#### Scenario: La comunidad antes que la década

- **WHEN** `/explore` muestra Premios, Salón de la Fama, Mejor valorados y Exploración por década
- **THEN** el riel de mejor valorados aparece antes que la exploración por década, que cierra la página

#### Scenario: Colecciones abre la página

- **WHEN** `/explore` renderiza la sección Colecciones
- **THEN** es la primera sección de la página y encabeza el recorrido, antes de Popular ahora y de la exploración por género

#### Scenario: Popular ahora después de Colecciones

- **WHEN** `/explore` renderiza Colecciones y Popular ahora
- **THEN** Popular ahora es la segunda sección, antes de la exploración por género

### Requirement: Navegación rápida de Explorar

La vista `/explore` SHALL mostrar, bajo el título, una fila de enlaces ("En esta página") con un enlace por cada
sección que se renderiza, en el mismo orden de la página, cada uno hacia el ancla de su sección: `colecciones`,
`popular`, `generos`, `decadas`, `novedades`, `proximos`, `premios`, `salon-de-la-fama` y `mejor-valorados`. La fila SHALL NOT
enlazar a una sección omitida y SHALL omitirse por completo cuando se rendericen menos de 4 secciones. La fila SHALL
funcionar sin JavaScript y SHALL NOT ser fija ni resaltar la sección activa. Las etiquetas SHALL ser cortas y estar en
el locale activo.

#### Scenario: Fila con todas las secciones

- **WHEN** `/es/explore` renderiza las 9 secciones
- **THEN** la fila muestra "Colecciones, Popular, Géneros, Décadas, Novedades, Próximos, Premios, Salón de la Fama, Mejor valorados",
  cada una enlazada a su ancla

#### Scenario: Sección omitida

- **WHEN** Novedades y Próximos lanzamientos no tienen contenido
- **THEN** la fila no los incluye y ninguno de sus enlaces apunta a un ancla inexistente

#### Scenario: Pocas secciones

- **WHEN** `/explore` renderiza solo 3 secciones
- **THEN** la fila de navegación rápida no aparece

#### Scenario: Salto a una sección

- **WHEN** una persona activa "Premios" en la fila
- **THEN** la página se desplaza a la sección Premios sin que el encabezado global tape su título

## ADDED Requirements

### Requirement: Sección Salón de la Fama de Explorar

La sección Salón de la Fama de `/explore` (ancla `salon-de-la-fama`) SHALL mostrar, por cada salón de la fama con al menos una clase
cerrada, su nombre, la última clase y la cantidad de grabaciones incorporadas, y un riel horizontal con una tarjeta por cada
incorporación de esa clase, con su carátula, título y artista. Las canciones SHALL mostrar la carátula de su disco ancla. Cada tarjeta
SHALL enlazar a su ficha de álbum o de canción cuando esté en el catálogo y, si no, mostrarse como texto. La sección SHALL ofrecer un
enlace "Ver todas las clases" a la página del salón y SHALL omitirse por completo sin clases cerradas. SHALL NOT mostrar descripciones
del sitio de la organización ni su logo.

#### Scenario: Última clase

- **WHEN** el Grammy Hall of Fame tiene cargadas sus cinco clases (2020, 2021, 2024, 2025 y 2026)
- **THEN** la sección muestra la clase de 2026 con sus 14 grabaciones en el riel y un enlace "Ver todas las clases" a
  `/es/awards/grammy-hall-of-fame`

#### Scenario: Canción de la clase

- **WHEN** una incorporación es una canción cuyo disco ancla está en el catálogo
- **THEN** su tarjeta muestra la carátula de ese disco y enlaza a la ficha de la canción

#### Scenario: Incorporación sin ficha

- **WHEN** una incorporación no se pudo enlazar al catálogo
- **THEN** su tarjeta muestra el texto curado, sin enlace

#### Scenario: Sin clases

- **WHEN** ningún salón de la fama tiene una clase cerrada cargada
- **THEN** `/explore` no renderiza la sección ni un mensaje de vacío
