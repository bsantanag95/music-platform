## MODIFIED Requirements

### Requirement: Superficie de descubrimiento de álbumes

El sistema SHALL exponer una vista pública en `/{locale}/explore` para los locales
soportados, accesible con y sin sesión, que presenta el descubrimiento de álbumes. La vista
SHALL componer, en este orden, las secciones que tengan contenido:

1. Selección editorial
2. Descubre por datos
3. Exploración por género
4. Novedades
5. Próximos lanzamientos
6. Premios
7. Mejor valorados de la comunidad
8. Más reseñados
9. Exploración por década

Selección editorial y Descubre por datos SHALL ser **secciones independientes**: la primera muestra las
colecciones curadas por el equipo y la segunda las generadas por plantilla, cada una con su orden, su tope y su
enlace "Ver todas" a la página de colecciones. Novedades, Próximos lanzamientos, Exploración por década y
Exploración por género SHALL ser
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

### Requirement: Colecciones destacadas

La vista `/explore` SHALL mostrar las colecciones destacadas en **dos riles**, ambos con filas **vigentes** de
`user_list_featured` (`starts_at` pasado y `expires_at` nulo o futuro) y listas públicas, visibles y de álbumes:

- **Selección editorial:** filas `source='curated'` de listas oficiales no retiradas.
- **Descubre por datos:** filas `source='template'`.

Cada rail SHALL ordenarse por `weight` descendente y, a igualdad, por `rank` ascendente, con un máximo de 6 tarjetas
propio, y SHALL mostrarse siempre que exista al menos una colección vigente en su grupo. Cada colección SHALL
presentarse con su título, su conteo de ítems y sus carátulas disponibles, y SHALL enlazar a la página de detalle de
esa lista; las automáticas SHALL mostrar además la etiqueta de su familia. Cada rail SHALL ofrecer un enlace "Ver todas"
a la página de colecciones.

#### Scenario: Con colecciones sembradas

- **WHEN** existen filas curadas y filas generadas vigentes
- **THEN** `/explore` muestra "Selección editorial" solo con las curadas y "Descubre por datos" solo con las generadas,
  cada una ordenada por peso y rank

#### Scenario: Colección vencida

- **WHEN** una fila de `user_list_featured` tiene `expires_at` en el pasado
- **THEN** su colección no aparece en ninguno de los riles

#### Scenario: Tope de tarjetas

- **WHEN** hay más de 6 colecciones vigentes en un grupo
- **THEN** ese rail muestra solo las 6 primeras según el orden definido y el otro rail no se ve afectado

#### Scenario: Sin curaduría publicada

- **WHEN** no hay ninguna colección curada vigente
- **THEN** "Selección editorial" no aparece y "Descubre por datos" se muestra con normalidad

#### Scenario: Sin colecciones destacadas

- **WHEN** ninguna lista tiene fila vigente en `user_list_featured`
- **THEN** ninguno de los dos riles aparece en `/explore`

#### Scenario: Etiqueta de familia

- **WHEN** se muestra una colección generada por `grammy-winners`
- **THEN** su tarjeta lleva la etiqueta "Premios"
