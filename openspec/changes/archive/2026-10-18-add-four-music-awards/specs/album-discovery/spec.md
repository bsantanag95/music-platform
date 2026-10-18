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
7. Mejor valorados de la comunidad
8. Exploración por década

Colecciones SHALL ser **una sola sección**, con un único orden, un único tope y un único enlace "Ver todas" a la
página de colecciones: la vista SHALL NOT separar las colecciones curadas de las generadas por plantilla, porque la
forma en que se mantiene una colección no es información para quien mira. Novedades, Próximos lanzamientos,
Exploración por década y
Exploración por género SHALL ser
**secciones independientes**, cada una con su propia lógica de navegación (Novedades y
Próximos lanzamientos abren sus listados completos; Década y Género abren listados filtrados
con parámetros distintos). Premios SHALL mostrar una tarjeta por premio, con su ceremonia más reciente, enlazada a su página de ceremonia, y un enlace al hub de
premios (capacidad `music-awards`). El descubrimiento SHALL ser editorial y por reglas: SHALL
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

#### Scenario: La comunidad antes que la década

- **WHEN** `/explore` muestra Premios, Mejor valorados y Exploración por década
- **THEN** el riel de mejor valorados aparece antes que la exploración por década, que cierra la página

#### Scenario: Colecciones abre la página

- **WHEN** `/explore` renderiza la sección Colecciones
- **THEN** es la primera sección de la página y encabeza el recorrido, antes de Popular ahora y de la exploración por género

#### Scenario: Popular ahora después de Colecciones

- **WHEN** `/explore` renderiza Colecciones y Popular ahora
- **THEN** Popular ahora es la segunda sección, antes de la exploración por género
