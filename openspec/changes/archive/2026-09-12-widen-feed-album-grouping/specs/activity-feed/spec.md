## MODIFIED Requirements

### Requirement: Barrido de álbum en el feed

Cuando una corrida de escuchas, favoritos y/o valoraciones consecutivas del mismo autor —tal
como la define el párrafo "Agrupación de actividad" del requirement "Jerarquía de
presentación del feed"— está compuesta por canciones del **mismo álbum**, con el `kind`
alternando libremente entre escucha, favorito y valoración, ese tramo SHALL tratarse como si
fuera un **barrido de álbum**: la agrupación por tipo que ya aplica a corridas contiguas
(rating/favorito/escucha) SHALL extenderse a este tramo, tratando cada tipo como si sus
entradas fueran contiguas entre sí, aunque en la lista cruda estén intercaladas con
entradas de otros tipos del mismo álbum. Este requirement refina —no contradice— la
presentación de una corrida colapsada descrita en "Jerarquía de presentación del feed"; NO
SHALL introducir una fila ni una presentación nuevas — reusa exactamente la fila de grupo
genérica que ya existe para cada tipo.

**Alcance del tramo.** El `kind` de cada entrada del tramo SHALL ser escucha, favorito o
valoración de una canción con álbum resuelto; una nota de escucha (tier 1) NUNCA SHALL
formar parte del tramo, igual que corta cualquier otra corrida. Comentarios, reseñas y
cualquier objetivo que no sea una canción de ese álbum tampoco SHALL formar parte del tramo.

**Agrupación independiente por tipo.** Dentro del tramo, las entradas SHALL repartirse en un
grupo por `kind` (escucha, favorito, valoración); cada grupo SHALL evaluarse de forma
independiente contra el umbral de la agrupación genérica (`GROUP_MIN`). Una canción con
favorito Y valoración dentro del mismo tramo SHALL participar en el grupo de favoritos y en
el de valoraciones por separado — NO SHALL haber un umbral combinado entre tipos. Un grupo
de escuchas que resulte ser todo del mismo tema SHALL seguir evaluándose primero como pico
de rotación, mismo criterio de precedencia que ya aplica fuera de un tramo de álbum. Un tipo
cuyo recuento no alcanza `GROUP_MIN` NO SHALL agruparse y SHALL mostrarse como entradas
sueltas, sin impedir que los demás tipos del mismo tramo sí se agrupen.

**Cortes.** El tramo SHALL respetar las mismas reglas de corte que una corrida: una entrada
tier 1 (comentario, reseña, nota de escucha, evento de lista), una entrada de otro autor, o
una canción de un álbum **distinto y conocido**, cortan el tramo. Una entrada cuyo álbum no
está resuelto (dato ausente) NO SHALL cortar el tramo por sí sola si el resto de la
condición de continuidad (mismo autor, candidata válida) se cumple. Un favorito agregado y
luego quitado de una canción del mismo álbum, intercalado entre escuchas o valoraciones que
de otro modo formarían su propio grupo, NO SHALL cortar el tramo ni impedir que ese otro
tipo alcance su umbral. El tramo SHALL derivarse únicamente de entradas **consecutivas** de
la página cargada; NO SHALL consultar una fuente de datos adicional ni contar entradas fuera
de ese tramo.

**Presentación.** Cada grupo formado dentro de un tramo de álbum SHALL usar exactamente la
misma presentación que un `FeedEntryGroup` genérico (fila subordinada sin celda de
carátula, verbo según el tipo, hasta 4 títulos enlazados + "y N más", fecha relativa de la
entrada más reciente del grupo). NO SHALL mencionar el álbum ni enlazar a su página — la
agrupación genérica nunca lo hizo. En `/me/feed` y en el preview de feed de seguidos SHALL
nombrar al autor; en el rastro reciente del propio usuario SHALL omitirlo, igual que el
resto de la presentación.

**Tono.** La agrupación de un tramo de álbum SHALL heredar el mismo registro neutro que la
agrupación genérica: sin algoritmo, sin porcentaje, sin barra de progreso, sin contador de
tipo "racha", sin emojis de fuego ni exclamaciones de logro.

**Alcance.** Este requirement SHALL aplicarse en las tres superficies que usan la
presentación por tier: `/me/feed`, el preview del feed de seguidos de Inicio y el bloque de
rastro reciente del propio usuario. El umbral SHALL ser el mismo `GROUP_MIN` con nombre que
ya usa la agrupación genérica.

#### Scenario: 3 canciones del mismo álbum valoradas seguidas se presentan como barrido

- **WHEN** un seguido valora 3 canciones distintas del mismo álbum, de forma consecutiva y
  sin otra actividad entre medio
- **THEN** el feed muestra la fila de grupo genérica "valoró 3 canciones" con las 3
  canciones enlazadas — mismo resultado que produciría la agrupación contigua ya existente

#### Scenario: Escucha y valoración intercaladas por canción también forman el barrido

- **WHEN** un seguido escucha y valora, canción por canción, 3 o más canciones distintas del
  mismo álbum de forma consecutiva (escucha, valoración, escucha, valoración...)
- **THEN** el feed muestra dos filas de grupo separadas — "valoró N canciones" y "registró N
  escuchas" — en vez de filas sueltas alternadas por cambiar de `kind` en cada entrada

#### Scenario: Solo 2 canciones valoradas no alcanza el umbral

- **WHEN** un seguido valora 2 canciones distintas del mismo álbum, de forma consecutiva
- **THEN** no se forma ningún grupo de valoraciones (el umbral es 3) y esas valoraciones se
  muestran como filas individuales

#### Scenario: Una escucha de paso no cuenta para el umbral pero tampoco corta el barrido

- **WHEN** dentro de un tramo de valoraciones del mismo álbum aparece una escucha (sin
  valoración ni favorito) de otra canción del mismo álbum
- **THEN** esa escucha se evalúa dentro de su propio grupo de escuchas, sin sumar al umbral
  de valoraciones ni cortar el tramo para los demás tipos

#### Scenario: Canciones de dos álbumes distintos no se mezclan en un mismo barrido

- **WHEN** un seguido valora 2 canciones de un álbum y, de forma consecutiva, 3 canciones de
  un álbum distinto
- **THEN** el feed no forma un grupo para el primer álbum (no alcanza el umbral) y sí para
  el segundo, sin fundir ambos grupos de canciones en una sola fila

#### Scenario: Un comentario entre medio corta el barrido

- **WHEN** entre valoraciones de canciones del mismo álbum de un seguido aparece un
  comentario de esa persona
- **THEN** el tramo no se colapsa a través del comentario; el comentario se muestra como su
  propia entrada y cada lado se evalúa por separado

#### Scenario: No se mezcla entre autores distintos

- **WHEN** dos autores distintos valoran canciones del mismo álbum de forma consecutiva en
  el feed
- **THEN** el tramo no cruza autores; cada uno se evalúa con su propio tramo

#### Scenario: El barrido no expone métricas de gamificación

- **WHEN** el feed muestra un grupo formado dentro de un tramo de álbum
- **THEN** la fila no incluye el algoritmo, porcentajes, barras de progreso, contadores de
  racha, emojis de fuego ni exclamaciones — el mismo registro neutro que ya usa cualquier
  fila de grupo genérica

#### Scenario: El barrido en el rastro reciente omite el nombre del propio usuario

- **WHEN** el bloque de rastro reciente del propio usuario contiene un grupo formado dentro
  de un tramo de álbum
- **THEN** la fila se muestra sin repetir el `@username` del propio usuario, igual que el
  resto de ese bloque

#### Scenario: Marcar como favorito 3 canciones del mismo álbum también forma el barrido

- **WHEN** un seguido marca como favorito 3 canciones distintas del mismo álbum, de forma
  consecutiva y sin ninguna valoración de por medio
- **THEN** el feed muestra la fila de grupo "marcó 3 favoritos", igual que si esas 3
  canciones hubieran estado consecutivas en la lista cruda

#### Scenario: Un favorito de paso no rompe un barrido de valoraciones que ya calificaría

- **WHEN** un seguido valora una canción, marca como favorito y luego quita el favorito de
  otra canción del mismo álbum, y valora una tercera canción, todo de forma consecutiva
- **THEN** el feed muestra la fila de grupo "valoró 3 canciones"; el favorito intercalado no
  le quita al grupo de valoraciones la chance de alcanzar el umbral, y se muestra como su
  propia entrada suelta

#### Scenario: Favorito y valoración de la misma canción cuentan una sola vez

- **WHEN** un seguido marca como favorito y también valora la misma canción del álbum
- **THEN** esa canción participa en el grupo de favoritos y en el de valoraciones por
  separado, cada uno evaluado con su propio umbral — no se duplica dentro de un mismo grupo
  ni existe un umbral combinado entre tipos
