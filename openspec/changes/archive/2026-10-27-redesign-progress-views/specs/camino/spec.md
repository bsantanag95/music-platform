## MODIFIED Requirements

### Requirement: Listado propio de Caminos en /me/progress, en pestañas
Los Caminos propios y las listas ajenas con seguimiento de progreso SHALL mostrarse como dos
pestañas del panel unificado `/me/progress` (capability `progress-hub`), que requiere sesión:
**"Listas para completar"** (`?tab=lists`, los Caminos propios) y **"Listas que sigo"** (`?tab=following`,
las listas ajenas trackeadas), junto a la pestaña Discografías de los recorridos de artista. La
pestaña activa vive en `?tab=` (enlazable, sobrevive a la recarga). `/me/caminos` SHALL redirigir
a la pestaña equivalente de `/me/progress`. El sistema SHALL NOT mezclar Caminos propios y listas
ajenas trackeadas en una sola lista ordenable — decisión tomada tras comparar mockups de diseño:
una lista unificada mezcla dos semánticas de "Estado" distintas (un Camino propio puede
archivarse, una lista trackeada no) y una acción por fila distinta (archivar/eliminar vs. dejar
de seguir) para el mismo campo de "Estado" y de acción.

"Listas para completar" SHALL mostrar los Caminos dinámicos propios del usuario con buscador (por título),
orden (recientes / alfabético / más avanzadas), segmentos de estado con su cantidad (todas / en curso /
completas / archivadas) y los mismos tres modos de visualización que la pestaña Discografías (Detallada /
Índice / Gráfico, con preferencia de modo persistida en el navegador) — esta pestaña es homogénea
(todo propio, misma acción por entrada), así que admite el mismo mecanismo completo sin las
asimetrías de una lista mezclada. Progreso discreto sin fracción numérica, mismo criterio que los
recorridos, anunciado con una etiqueta discreta. Con el segmento "todas", el listado SHALL agruparse en las mismas
secciones que Discografías (Archivadas plegada), y en Detallada cada entrada SHALL nombrar el siguiente álbum sin escuchar
según el orden manual de la lista y la fecha de la última escucha, sin decir cuántos faltan; la etiqueta de estado solo
aparece si no está en curso. La acción "Nueva lista para completar" SHALL vivir en la
cabecera del panel y abrir el diálogo de acciones rápidas en esa acción; el estado vacío SHALL ofrecer la misma acción.
Eliminar un Camino desde el menú SHALL abrir un diálogo que nombra la lista, dice cuántos álbumes se pierden y que
las escuchas siguen en el diario; solo confirmarlo borra. El ⋮ SHALL medir al menos 32 px (44 px con puntero grueso), y
el modo de visualización SHALL leerse antes de pintar el listado, sin saltar de un modo a otro.

"Listas que sigo" SHALL mostrar las listas ajenas sobre las que el usuario activó tracking de
progreso (Requirement "Trackear el progreso propio sobre una lista ajena" de `list-saves`), con
buscador (por título o por nombre de dueño) y orden (recientes / más avanzadas), sin filtro de
estado (no existe "archivado" para una lista ajena) ni modo de visualización (un único
tratamiento de fila alcanza — no es una curaduría propia). Cada entrada SHALL enlazar al detalle
de esa lista ajena (la ruta de lectura correcta según su `kind`, ver Requirement "Acceso general
desde el Header"). Cada entrada SHALL mostrar la misma línea de siguiente álbum y última escucha (calculada sobre el
diario de quien sigue la lista) y SHALL agrupar sus acciones en un menú ⋯ con el título de la lista en su nombre
accesible: "Ver lista" y "Dejar de seguir"; dejar de seguir quita la entrada y muestra un aviso con "Deshacer", que vuelve a activar el seguimiento y repone la
entrada en su lugar. El estado vacío SHALL titularse "Todavía no sigues ninguna lista" y enlazar al descubrimiento de
listas para completar.

En las dos pestañas, la búsqueda, el orden y (en "Listas para completar") el filtro de estado SHALL reflejarse en la URL (`q`,
`sort`, `state`, solo cuando difieren del defecto, sin crear historial y conservando `tab`), y la página SHALL abrirse con
ellos; un valor inválido SHALL ignorarse.

#### Scenario: Pestañas separadas, no una lista mezclada
- **WHEN** un usuario con Caminos propios y listas ajenas trackeadas abre `/me/progress`
- **THEN** ve las pestañas "Listas para completar" y "Listas que sigo" (además de Discografías), nunca ambos
  orígenes en una sola lista ordenable

#### Scenario: Buscador y orden completos en "Mis Caminos"
- **WHEN** el propietario tiene varios Caminos propios y usa el buscador, el orden o el filtro de
  estado en la pestaña "Listas para completar"
- **THEN** ve el subconjunto filtrado/ordenado, sin ida y vuelta al servidor

#### Scenario: "Trackeados" sin filtro de estado ni modo de vista
- **WHEN** el usuario abre la pestaña "Listas que sigo"
- **THEN** encuentra buscador y orden, pero no un filtro de estado ni un conmutador de modo de
  visualización

#### Scenario: Pestaña vacía
- **WHEN** un usuario sin Caminos propios abre "Listas para completar", o sin tracking activo abre
  "Listas que sigo"
- **THEN** ve el estado vacío localizado de esa pestaña, sin error

#### Scenario: Eliminar un Camino desde el listado
- **WHEN** el propietario elige "Eliminar" en el menú de un Camino de "Listas para completar"
- **THEN** se abre un diálogo con el título del Camino y cuántos álbumes se pierden, y nada se borra hasta confirmar

#### Scenario: Dejar de seguir y deshacer
- **WHEN** el usuario elige "Dejar de seguir" en una entrada de "Listas que sigo" y luego "Deshacer" en el aviso
- **THEN** la entrada desaparece, el aviso ofrece deshacer, y al deshacer el seguimiento vuelve a activarse y la entrada
  reaparece en su posición

#### Scenario: Filtros en la URL
- **WHEN** el usuario busca en "Listas para completar" y recarga la página
- **THEN** la URL lleva `tab=lists&q=…` y el buscador conserva el texto

#### Scenario: Nueva lista para completar desde la cabecera
- **WHEN** el usuario pulsa "+ Nueva lista para completar", la crea en el diálogo y lo cierra
- **THEN** la pestaña "Listas para completar" muestra la lista nueva y su total sube en uno

#### Scenario: Siguiente álbum de una lista seguida
- **WHEN** el usuario sigue una lista de cuatro álbumes y ya escuchó los dos primeros según el orden de su dueño
- **THEN** la fila dice "Siguiente:" con el tercero y la fecha de su última escucha, sin cifras de álbumes restantes

#### Scenario: Redirección desde la ruta anterior
- **WHEN** un usuario con sesión abre `/me/caminos?tab=tracked`
- **THEN** llega a `/me/progress?tab=following`

#### Scenario: Sin sesión
- **WHEN** una persona sin sesión abre `/me/progress?tab=lists`
- **THEN** es redirigida al inicio de sesión
