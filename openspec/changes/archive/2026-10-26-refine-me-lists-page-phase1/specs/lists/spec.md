## MODIFIED Requirements

### Requirement: Lista de listas propias
El sistema SHALL permitir al usuario autenticado listar sus propias listas con paginación,
incluyendo por cada lista su título, descripción, tipo de entidad, audiencia, **cantidad de
ítems (`itemCount`) y las primeras carátulas disponibles de sus ítems (`coverThumbs`, hasta
un máximo fijo)** para la representación visual de la tarjeta. La respuesta SHALL aceptar
parámetros opcionales de **búsqueda por texto sobre el título de la lista (`q`), filtro por
tipo de entidad (`entityType`) y orden (`sort`, entre recencia y alfabético)**, combinables y
aplicados en el servidor sobre el conjunto completo de listas propias, no solo sobre la página
cargada. Las **listas fijadas** por el propietario SHALL aparecer primero, y dentro de cada
grupo (fijadas y no fijadas) el orden SHALL respetar el `sort` solicitado. Sin ningún
parámetro, el comportamiento SHALL ser equivalente al listado paginado por recencia previo,
ampliado con `itemCount` y `coverThumbs`. En `/me/lists`, la búsqueda, el tipo y el orden elegidos SHALL reflejarse
en la URL (`q`, `type`, `sort`, solo cuando difieren del valor por defecto y sin crear entradas de historial) y la página
SHALL abrirse con esos filtros; un valor inválido SHALL ignorarse. Cada acción de una tarjeta propia SHALL nombrar la
lista en su nombre accesible.

#### Scenario: Listar listas propias
- **WHEN** un usuario autenticado abre su página de listas
- **THEN** ve sus listas paginadas, con las fijadas primero y el resto ordenado por la más
  reciente, cada una con su conteo de ítems y sus carátulas disponibles

#### Scenario: Sin listas
- **WHEN** un usuario sin listas abre su página de listas
- **THEN** ve un estado vacío localizado y no un error técnico

#### Scenario: Buscar entre las listas propias
- **WHEN** el usuario filtra sus listas con `q` coincidiendo parcialmente con el título de
  alguna
- **THEN** solo aparecen sus listas cuyo título coincide, sin distinguir mayúsculas ni acentos
  exactos, con paginación válida

#### Scenario: Filtrar y ordenar las listas propias
- **WHEN** el usuario filtra por `entityType=release-group` y pide `sort=alpha`
- **THEN** solo aparecen sus listas de álbumes, ordenadas alfabéticamente, con las fijadas
  primero

#### Scenario: Conteo y carátulas de una lista sin ítems
- **WHEN** una lista propia no tiene ítems
- **THEN** su `itemCount` es `0` y su `coverThumbs` es una colección vacía, sin error

#### Scenario: Parámetros inválidos
- **WHEN** el usuario envía un `entityType` o un `sort` fuera de los valores permitidos, o una
  paginación fuera de rango
- **THEN** la API responde `400` con código `VALIDATION_ERROR` y no ejecuta la lectura

#### Scenario: Filtros que sobreviven a la recarga
- **WHEN** el usuario busca "aor", elige Canciones y recarga la página
- **THEN** la URL lleva `?q=aor&type=recording` y la página abre con esos filtros aplicados

### Requirement: Borrado de la lista
El sistema SHALL permitir al propietario borrar una lista propia de forma física e
irreversible, eliminando también sus ítems. El borrado de una lista ajena SHALL responder
`404` con `LIST_NOT_FOUND`. La confirmación SHALL nombrar la lista, decir cuántos elementos se pierden
y avisar que no se puede deshacer; si el borrado falla, el error SHALL mostrarse junto a esa lista.

#### Scenario: Borrar una lista propia
- **WHEN** el propietario borra una lista propia tras confirmar la acción destructiva
- **THEN** la lista y sus ítems se eliminan de forma permanente

#### Scenario: Borrar una lista ajena
- **WHEN** un usuario intenta borrar una lista que no le pertenece
- **THEN** la API responde `404` con `LIST_NOT_FOUND` y no borra la lista

#### Scenario: Confirmación que nombra la lista
- **WHEN** el propietario elige eliminar "Best AOR songs", que tiene 4 elementos
- **THEN** un diálogo pregunta "¿Eliminar «Best AOR songs»?", dice que se pierden sus 4 elementos y que no se puede
  deshacer, y la lista solo se borra al confirmar

### Requirement: Orden manual de la lista
El sistema SHALL permitir al propietario reordenar los ítems de una lista de forma manual,
persistiendo el nuevo orden en una única operación de reordenamiento. Las afordancias de
reordenamiento SHALL estar disponibles en cada modo de presentación del detalle: en los modos
Detallada e Índice mediante controles de mover una posición arriba o abajo, y en el modo
Gráfico mediante la selección de un ítem y una barra de acciones sobre la selección. El
sistema SHALL ofrecer además mover un ítem **al principio** o **al final** de la lista.
Cualquiera de estas afordancias SHALL producir el mismo efecto: una única operación de
reordenamiento con el orden completo resultante. Cada control de reordenar y Quitar SHALL medir al menos 32 px
(44 px con puntero grueso), y un control que no aplica (mover al principio en el primer ítem, al final en el último)
SHALL NOT mostrarse, conservando su lugar para no desalinear las filas.

#### Scenario: Reordenar los ítems
- **WHEN** el propietario envía el orden deseado de los ítems de su lista
- **THEN** el sistema persiste el nuevo orden y el detalle lo refleja

#### Scenario: Reordenar una lista ajena
- **WHEN** un usuario intenta reordenar una lista que no le pertenece
- **THEN** la API responde `404` con `LIST_NOT_FOUND` y no modifica la lista

#### Scenario: Mover un ítem una posición
- **WHEN** el propietario mueve un ítem una posición arriba o abajo desde el modo Detallada o
  Índice
- **THEN** el orden se persiste en una sola operación y el nuevo orden se refleja en todos los
  modos

#### Scenario: Reordenar desde el modo Gráfico
- **WHEN** el propietario selecciona un ítem en el modo Gráfico y usa la barra de acciones
  para moverlo
- **THEN** el orden se persiste en una sola operación y la selección se anuncia de forma
  accesible

#### Scenario: Mover al principio o al final
- **WHEN** el propietario elige mover un ítem al principio o al final de la lista
- **THEN** el ítem queda en esa posición extrema y el resto conserva su orden relativo

#### Scenario: Extremos que no aplican
- **WHEN** el propietario ve el primer ítem de su lista
- **THEN** no aparecen "al principio" ni "subir" para ese ítem, y los demás controles quedan alineados con los de las
  otras filas

### Requirement: Modos de visualización del detalle de lista
El sistema SHALL presentar los ítems del detalle de una lista —propia o ajena visible— en uno
de tres modos de visualización conmutables, aplicables por igual a listas de artistas, álbumes
o canciones:

- **Detallada**: una fila por ítem con número de posición, carátula (o silueta de disco),
  título y, cuando corresponda, nombre del artista; los controles de gestión del propietario
  se muestran junto a cada fila.
- **Índice**: una fila de texto compacta por ítem, con número de posición y título, pensada
  para escanear y reordenar listas largas; los controles de gestión SHALL estar siempre
  visibles en la misma fila y ser accesibles por teclado.
- **Gráfico**: una cuadrícula de carátulas (o siluetas de disco) donde predomina lo visual; el
  título de cada ítem SHALL seguir siendo accesible como texto, no sólo como información
  auxiliar.

El conmutador de modo SHALL tener semántica de grupo de opciones excluyentes y ser navegable
por teclado. El modo elegido SHALL recordarse **por visitante y de forma global** (no por
lista) en el almacenamiento local del navegador; en ausencia de preferencia guardada el modo
por defecto SHALL ser **Detallada**. La preferencia guardada SHALL NOT viajar al servidor ni
afectar a otros visitantes. Hasta leer la preferencia, el detalle SHALL mostrar un marcador neutro en lugar de los
ítems, para no pintar el modo por defecto y saltar al guardado. El servidor SHALL renderizar el modo por defecto y la
reconciliación con la preferencia guardada SHALL ocurrir en el cliente sin pérdida de
contenido. Con `prefers-reduced-motion` el cambio de modo SHALL NOT animarse.

#### Scenario: Elegir un modo de visualización
- **WHEN** el visitante cambia el modo de visualización en el detalle de una lista
- **THEN** los ítems se re-presentan en ese modo y la elección se recuerda para las próximas
  listas que abra

#### Scenario: Preferencia global entre listas
- **WHEN** el visitante eligió el modo Gráfico en una lista y abre otra lista distinta
- **THEN** la segunda lista también se muestra en modo Gráfico

#### Scenario: Sin preferencia guardada
- **WHEN** un visitante sin preferencia guardada abre el detalle de una lista
- **THEN** ve el modo Detallada

#### Scenario: Almacenamiento local no disponible
- **WHEN** el navegador no permite leer ni escribir la preferencia
- **THEN** el detalle se muestra en el modo por defecto sin error

#### Scenario: Título accesible en el modo Gráfico
- **WHEN** el visitante recorre la cuadrícula del modo Gráfico con lector de pantalla o
  teclado
- **THEN** cada ítem expone su título como texto, no sólo como atributo visual

#### Scenario: Sin salto al modo guardado
- **WHEN** un visitante con el modo Gráfico guardado abre el detalle de una lista
- **THEN** los ítems aparecen directamente en Gráfico, sin pintarse antes en Detallada
