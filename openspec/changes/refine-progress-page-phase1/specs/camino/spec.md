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
recorridos, anunciado con una etiqueta discreta. La pestaña SHALL ofrecer la acción "Nueva lista para completar".
Eliminar un Camino desde el menú SHALL abrir un diálogo que nombra la lista, dice cuántos álbumes se pierden y que
las escuchas siguen en el diario; solo confirmarlo borra. El ⋮ SHALL medir al menos 32 px (44 px con puntero grueso), y
el modo de visualización SHALL leerse antes de pintar el listado, sin saltar de un modo a otro.

"Listas que sigo" SHALL mostrar las listas ajenas sobre las que el usuario activó tracking de
progreso (Requirement "Trackear el progreso propio sobre una lista ajena" de `list-saves`), con
buscador (por título o por nombre de dueño) y orden (recientes / más progreso), sin filtro de
estado (no existe "archivado" para una lista ajena) ni modo de visualización (un único
tratamiento de fila alcanza — no es una curaduría propia). Cada entrada SHALL enlazar al detalle
de esa lista ajena (la ruta de lectura correcta según su `kind`, ver Requirement "Acceso general
desde el Header"). Cada entrada SHALL ofrecer "Dejar de seguir" con el título de la lista en su nombre accesible;
dejar de seguir quita la entrada y muestra un aviso con "Deshacer", que vuelve a activar el seguimiento y repone la
entrada en su lugar. El estado vacío SHALL titularse "Todavía no sigues ninguna lista" y enlazar al descubrimiento de
listas para completar.

En las dos pestañas, la búsqueda, el orden y (en "Mis listas") el filtro de estado SHALL reflejarse en la URL (`q`,
`sort`, `state`, solo cuando difieren del defecto, sin crear historial y conservando `tab`), y la página SHALL abrirse con
ellos; un valor inválido SHALL ignorarse.

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

#### Scenario: Eliminar un Camino desde el listado
- **WHEN** el propietario elige "Eliminar" en el menú de un Camino de "Mis listas"
- **THEN** se abre un diálogo con el título del Camino y cuántos álbumes se pierden, y nada se borra hasta confirmar

#### Scenario: Dejar de seguir y deshacer
- **WHEN** el usuario elige "Dejar de seguir" en una entrada de "Listas que sigo" y luego "Deshacer" en el aviso
- **THEN** la entrada desaparece, el aviso ofrece deshacer, y al deshacer el seguimiento vuelve a activarse y la entrada
  reaparece en su posición

#### Scenario: Filtros en la URL
- **WHEN** el usuario busca en "Mis listas" y recarga la página
- **THEN** la URL lleva `tab=lists&q=…` y el buscador conserva el texto

#### Scenario: Redirección desde la ruta anterior
- **WHEN** un usuario con sesión abre `/me/caminos?tab=tracked`
- **THEN** llega a `/me/progress?tab=following`

#### Scenario: Sin sesión
- **WHEN** una persona sin sesión abre `/me/progress?tab=lists`
- **THEN** es redirigida al inicio de sesión
