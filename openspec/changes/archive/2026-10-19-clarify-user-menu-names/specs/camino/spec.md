## RENAMED Requirements

- FROM: `### Requirement: Listado propio en /me/caminos, en pestañas`
- TO: `### Requirement: Listado propio de Caminos en /me/progress, en pestañas`

## MODIFIED Requirements

### Requirement: Listado propio de Caminos en /me/progress, en pestañas
Los Caminos propios y las listas ajenas con seguimiento de progreso SHALL mostrarse como dos
pestañas del panel unificado `/me/progress` (capability `progress-hub`), que requiere sesión:
**"Mis listas"** (`?tab=lists`, los Caminos propios) y **"Listas que sigo"** (`?tab=following`,
las listas ajenas trackeadas), junto a la pestaña Discografías de los recorridos de artista. La
pestaña activa vive en `?tab=` (enlazable, sobrevive a la recarga). `/me/caminos` SHALL redirigir
a la pestaña equivalente de `/me/progress`. El sistema SHALL NOT mezclar Caminos propios y listas
ajenas trackeadas en una sola lista ordenable — decisión tomada tras comparar mockups de diseño:
una lista unificada mezcla dos semánticas de "Estado" distintas (un Camino propio puede
archivarse, una lista trackeada no) y una acción por fila distinta (archivar/eliminar vs. dejar
de seguir) para el mismo campo de "Estado" y de acción.

"Mis listas" SHALL mostrar los Caminos dinámicos propios del usuario con buscador (por título),
orden (recientes / alfabético / por estado), filtro por estado (todo / en curso / completo /
archivado) y los mismos tres modos de visualización que la pestaña Discografías (Detallada /
Índice / Gráfico, con preferencia de modo persistida en el navegador) — esta pestaña es homogénea
(todo propio, misma acción por entrada), así que admite el mismo mecanismo completo sin las
asimetrías de una lista mezclada. Progreso discreto sin fracción numérica, mismo criterio que los
recorridos. La pestaña SHALL ofrecer la acción "Nueva lista para completar".

"Listas que sigo" SHALL mostrar las listas ajenas sobre las que el usuario activó tracking de
progreso (Requirement "Trackear el progreso propio sobre una lista ajena" de `list-saves`), con
buscador (por título o por nombre de dueño) y orden (recientes / más progreso), sin filtro de
estado (no existe "archivado" para una lista ajena) ni modo de visualización (un único
tratamiento de fila alcanza — no es una curaduría propia). Cada entrada SHALL enlazar al detalle
de esa lista ajena (la ruta de lectura correcta según su `kind`, ver Requirement "Acceso general
desde el Header").

#### Scenario: Pestañas separadas, no una lista mezclada
- **WHEN** un usuario con Caminos propios y listas ajenas trackeadas abre `/me/progress`
- **THEN** ve las pestañas "Mis listas" y "Listas que sigo" (además de Discografías), nunca ambos
  orígenes en una sola lista ordenable

#### Scenario: Buscador y orden completos en "Mis Caminos"
- **WHEN** el propietario tiene varios Caminos propios y usa el buscador, el orden o el filtro de
  estado en la pestaña "Mis listas"
- **THEN** ve el subconjunto filtrado/ordenado, sin ida y vuelta al servidor

#### Scenario: "Trackeados" sin filtro de estado ni modo de vista
- **WHEN** el usuario abre la pestaña "Listas que sigo"
- **THEN** encuentra buscador y orden, pero no un filtro de estado ni un conmutador de modo de
  visualización

#### Scenario: Pestaña vacía
- **WHEN** un usuario sin Caminos propios abre "Mis listas", o sin tracking activo abre
  "Listas que sigo"
- **THEN** ve el estado vacío localizado de esa pestaña, sin error

#### Scenario: Redirección desde la ruta anterior
- **WHEN** un usuario con sesión abre `/me/caminos?tab=tracked`
- **THEN** llega a `/me/progress?tab=following`

#### Scenario: Sin sesión
- **WHEN** una persona sin sesión abre `/me/progress?tab=lists`
- **THEN** es redirigida al inicio de sesión

### Requirement: Acceso desde el menú de usuario y el panel de gestión del perfil
El sistema SHALL alcanzar los Caminos propios y las listas que se siguen desde el único acceso
"Progreso" (`/me/progress`) del menú de usuario del Header y del panel de gestión del perfil
propio, el mismo que lleva a los recorridos de artista. El sistema SHALL NOT ofrecer en esas
superficies un acceso separado a Caminos: la distinción entre discografías y listas vive en las
pestañas del panel, con nombres que describen su contenido.

#### Scenario: Acceso visible junto al de Recorridos
- **WHEN** un usuario autenticado abre el menú de usuario del Header y activa "Progreso"
- **THEN** llega a `/me/progress`, donde Discografías, Mis listas y Listas que sigo son pestañas
  distintas y distinguibles
- **AND** el menú no tiene un acceso propio a Caminos

### Requirement: Sin comparación entre Caminos propios y ajenos en la superficie personal
El sistema SHALL NOT mostrar en `/me/progress` ningún agregado o comparación entre los Caminos
propios del usuario y los de otros usuarios — esa comparación solo existe, de forma agregada y
anónima, en la capability `camino-discovery`.

#### Scenario: Sin comparación en la superficie personal
- **WHEN** un usuario abre la pestaña "Mis listas" o "Listas que sigo" de `/me/progress`
- **THEN** no ve ningún conteo ni ranking que lo compare con otros usuarios
