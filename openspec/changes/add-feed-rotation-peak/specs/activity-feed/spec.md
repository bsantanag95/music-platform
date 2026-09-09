## ADDED Requirements

### Requirement: Pico de rotación en el feed

Cuando una corrida colapsable de escuchas sin nota (tier 3) del mismo autor —tal como la
define el párrafo "Agrupación de actividad" del requirement "Jerarquía de presentación del
feed"— está compuesta **íntegramente por entradas del mismo objetivo musical**, y ese
objetivo acumula suficientes registros dentro de una ventana reciente, la lista de feed
SHALL presentar esa corrida como un **pico de rotación**: una síntesis de comportamiento
("En rotación"), en lugar de la fila genérica de grupo que enumera títulos. Este requirement
refina —no contradice— la presentación de una corrida colapsada descrita en "Jerarquía de
presentación del feed".

**Ventana y umbrales.** La ventana SHALL ser de **7 días** contados hacia atrás desde el
momento de lectura. La cantidad relevante SHALL ser el número de entradas de la corrida
cuya fecha cae dentro de esa ventana. Una corrida SHALL presentarse como pico de rotación
solo si:

- el objetivo común es una **canción** y la cantidad en ventana es **≥ 3**, o
- el objetivo común es un **álbum** y la cantidad en ventana es **≥ 2**.

Una corrida cuyo objetivo común es un **artista** NUNCA SHALL producir un pico de rotación
(el artista es un objetivo demasiado grueso para "en rotación", igual criterio que la
sección "En rotación" del perfil). Una corrida cuya cantidad en ventana no alcanza el
umbral NO SHALL presentarse como pico y SHALL seguir la presentación de grupo genérica.

Un pico de rotación de **álbum** SHALL poder formarse a partir de una corrida de solo **2**
entradas consecutivas, aunque ese largo esté por debajo del mínimo de plegado de grupo
genérico; un pico de **canción** requiere el mínimo de plegado habitual.

**Cortes.** El pico de rotación SHALL respetar las mismas reglas de corte que una corrida:
una entrada tier 1 (comentario, reseña, nota de escucha, evento de lista), una escucha de
otro objetivo, o actividad de otro autor entre medio, cortan la corrida y por lo tanto el
pico. El pico SHALL derivarse únicamente de entradas **consecutivas** de la página cargada;
NO SHALL consultar una fuente de datos adicional ni contar entradas fuera de esa corrida.

**Presentación.** El pico de rotación SHALL mostrarse como una fila subordinada, indentada
a la columna del título y **sin celda de carátula**, con el mismo peso visual que una fila
de grupo colapsado. SHALL contener: el rótulo "En rotación", el **título del objetivo
enlazado** a su página (con el nombre del artista acreditado junto al título cuando
exista), y la **cantidad de registros de la semana**, además del marcador de tiempo
relativo de la entrada más reciente de la corrida. En `/me/feed` y en el preview de feed de
seguidos SHALL nombrar al autor; en el rastro reciente del propio usuario SHALL omitirlo,
igual que el resto de la presentación.

**Tono.** El pico de rotación SHALL usar un registro cultural: NO SHALL mostrar el
algoritmo, un porcentaje, una barra de progreso, un contador de tipo "racha", emojis de
fuego ni exclamaciones de logro. La única métrica visible SHALL ser la cantidad de
registros de la semana, redactada de forma neutra ("N registros esta semana").

**Alcance.** Este requirement SHALL aplicarse en las tres superficies que usan la
presentación por tier: `/me/feed`, el preview del feed de seguidos de Inicio y el bloque de
rastro reciente del propio usuario. Los umbrales y la ventana SHALL implementarse como
constantes con nombre, calibrables sin cambio de esta especificación.

#### Scenario: Corrida de escuchas del mismo tema se presenta como pico de rotación

- **WHEN** un seguido registra 4 escuchas sin nota consecutivas de la misma canción, todas
  dentro de los últimos 7 días, antes de cualquier otra actividad
- **THEN** en lugar de la fila genérica "registró 4 escuchas" con la lista de títulos, el
  feed muestra una única fila subordinada "En rotación · {título de la canción} · 4
  registros esta semana", con el título enlazado a la página de la canción y el marcador de
  tiempo de la escucha más reciente

#### Scenario: Dos escuchas del mismo álbum en la semana forman un pico de álbum

- **WHEN** un seguido registra 2 escuchas sin nota consecutivas del mismo álbum, ambas
  dentro de los últimos 7 días, antes de cualquier otra actividad
- **THEN** el feed muestra una fila "En rotación · {título del álbum} · 2 registros esta
  semana", aunque una corrida de 2 entradas no alcanzaría el mínimo de plegado de grupo
  genérico

#### Scenario: Dos escuchas de la misma canción no forman pico

- **WHEN** un seguido registra 2 escuchas sin nota consecutivas de la misma canción dentro
  de la ventana
- **THEN** no se forma un pico de rotación (el umbral de canción es 3) y las dos escuchas
  se muestran como filas individuales

#### Scenario: Corrida del mismo tema pero fuera de la ventana

- **WHEN** un seguido tiene una corrida de 3 escuchas consecutivas de la misma canción,
  pero solo 1 de ellas cae dentro de los últimos 7 días
- **THEN** la corrida no se presenta como pico de rotación y se muestra con la presentación
  de grupo genérica

#### Scenario: Corrida de escuchas de títulos distintos sigue siendo grupo genérico

- **WHEN** un seguido registra 3 o más escuchas sin nota consecutivas de canciones
  distintas
- **THEN** la corrida se pliega en la fila de grupo genérica que nombra al autor, la
  cantidad y lista los títulos enlazados — no como pico de rotación

#### Scenario: Corrida del mismo artista no produce pico

- **WHEN** un seguido registra 3 o más escuchas sin nota consecutivas cuyo objetivo es el
  mismo artista (no un álbum ni una canción)
- **THEN** no se forma un pico de rotación; la corrida se muestra con la presentación de
  grupo genérica

#### Scenario: Una entrada con texto entre medio corta el pico

- **WHEN** entre escuchas de la misma canción de un seguido aparece un comentario o una
  reseña de esa persona
- **THEN** la corrida se corta en ese punto; ninguno de los dos tramos alcanza el umbral y
  no se muestra ningún pico de rotación

#### Scenario: El pico de rotación no expone métricas de gamificación

- **WHEN** el feed muestra un pico de rotación
- **THEN** la fila no incluye el algoritmo, porcentajes, barras de progreso, contadores de
  racha, emojis de fuego ni exclamaciones — solo el rótulo "En rotación", el objetivo
  enlazado y la cantidad neutra de registros de la semana

#### Scenario: El pico de rotación en el rastro reciente omite el nombre del propio usuario

- **WHEN** el bloque de rastro reciente del propio usuario contiene una corrida que
  califica como pico de rotación
- **THEN** la fila "En rotación · {título} · N registros esta semana" se muestra sin
  repetir el `@username` del propio usuario, igual que el resto de ese bloque
