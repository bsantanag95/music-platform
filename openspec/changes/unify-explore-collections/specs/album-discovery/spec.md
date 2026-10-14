## MODIFIED Requirements

### Requirement: Superficie de descubrimiento de álbumes

El sistema SHALL exponer una vista pública en `/{locale}/explore` para los locales
soportados, accesible con y sin sesión, que presenta el descubrimiento de álbumes. La vista
SHALL componer, en este orden, las secciones que tengan contenido:

1. Colecciones
2. Exploración por género
3. Novedades
4. Próximos lanzamientos
5. Premios
6. Mejor valorados de la comunidad
7. Más reseñados
8. Exploración por década

Colecciones SHALL ser **una sola sección**, con un único orden, un único tope y un único enlace "Ver todas" a la
página de colecciones: la vista SHALL NOT separar las colecciones curadas de las generadas por plantilla, porque la
forma en que se mantiene una colección no es información para quien mira. Novedades, Próximos lanzamientos,
Exploración por década y Exploración por género SHALL ser
**secciones independientes**, cada una con su propia lógica de navegación (Novedades y
Próximos lanzamientos abren sus listados completos; Década y Género abren listados filtrados
con parámetros distintos). Premios SHALL enlazar a las páginas de ceremonia y al índice de
premios (capacidad `music-awards`). El descubrimiento SHALL ser editorial y por reglas: SHALL
NOT usar recomendación algorítmica ni personalización por afinidad. En Fase 1 la vista SHALL
centrarse en álbumes; SHALL NOT ofrecer pestañas de artistas, canciones ni listas.

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
- **THEN** `/explore` muestra, después de Próximos lanzamientos, una tarjeta por cada una de
  las últimas 5 ceremonias y un enlace a `/awards`; sin ceremonias, la sección se omite

#### Scenario: La comunidad antes que la década

- **WHEN** `/explore` muestra Premios, Mejor valorados, Más reseñados y Exploración por década
- **THEN** los dos rieles de comunidad aparecen antes que la exploración por década, que cierra la página

#### Scenario: Colecciones abre la página

- **WHEN** `/explore` renderiza la sección Colecciones
- **THEN** es la primera sección de la página y encabeza el recorrido, antes de la exploración por género

### Requirement: Colecciones destacadas

La vista `/explore` SHALL mostrar las colecciones destacadas en **un solo riel**, con las filas **vigentes** de
`user_list_featured` (`starts_at` pasado y `expires_at` nulo o futuro) cuya lista sea pública, visible y de álbumes,
sin distinguir el origen: las curadas a mano (`source='curated'`, de listas oficiales no retiradas) y las generadas
por plantilla (`source='template'`) SHALL compartir el riel, el orden y el tope.

El riel SHALL ordenarse por `weight` descendente y, a igualdad, por `rank` ascendente, con un máximo de 10 tarjetas, y
SHALL mostrarse siempre que exista al menos una colección vigente. Cada colección SHALL presentarse con su título, la
etiqueta de su familia, su conteo de ítems y sus carátulas disponibles, y SHALL enlazar a su página de detalle. El
riel SHALL ofrecer un enlace "Ver todas" a la página de colecciones.

El riel SHALL desplazarse horizontalmente y SHALL ofrecer controles de desplazamiento anterior y siguiente con
etiqueta accesible, que SHALL desactivarse en cada extremo y SHALL omitirse cuando todas las tarjetas caben sin
desplazar. El desplazamiento SHALL funcionar con el gesto táctil nativo y SHALL respetar la preferencia de movimiento
reducido del sistema. La tarjeta SHALL NOT indicar si la colección se armó a mano o por plantilla.

#### Scenario: Con colecciones sembradas

- **WHEN** existen filas curadas y filas generadas vigentes
- **THEN** `/explore` muestra un solo riel "Colecciones" con las dos clases mezcladas, ordenadas por peso y rank, sin
  rótulo que distinga su origen

#### Scenario: Colección vencida

- **WHEN** una fila de `user_list_featured` tiene `expires_at` en el pasado
- **THEN** su colección no aparece en el riel

#### Scenario: Tope de tarjetas

- **WHEN** hay más de 10 colecciones vigentes
- **THEN** el riel muestra solo las 10 primeras según el orden definido

#### Scenario: Sin curaduría publicada

- **WHEN** no hay ninguna colección curada vigente
- **THEN** el riel se muestra con normalidad solo con las generadas, sin un bloque vacío ni un mensaje aparte

#### Scenario: Sin colecciones destacadas

- **WHEN** ninguna lista tiene fila vigente en `user_list_featured`
- **THEN** el riel no aparece en `/explore`

#### Scenario: Etiqueta de familia

- **WHEN** se muestra una colección generada por `grammy-winners`
- **THEN** su tarjeta lleva la etiqueta "Premios"

#### Scenario: Familia de una colección manual

- **WHEN** se muestra una colección curada a la que se asignó la familia `discovery`
- **THEN** su tarjeta lleva la etiqueta "Descubrimiento", igual que una generada de esa familia

#### Scenario: Controles de desplazamiento

- **WHEN** hay más colecciones vigentes de las que caben en el ancho visible
- **THEN** el riel ofrece los controles anterior y siguiente, el anterior está desactivado al inicio y el siguiente al
  llegar al final

#### Scenario: Todo cabe en pantalla

- **WHEN** las colecciones vigentes caben sin desplazar
- **THEN** el riel no muestra los controles de desplazamiento
