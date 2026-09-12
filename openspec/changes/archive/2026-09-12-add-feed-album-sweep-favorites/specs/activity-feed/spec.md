## MODIFIED Requirements

### Requirement: Barrido de álbum en el feed

Cuando una corrida de escuchas, favoritos y/o valoraciones consecutivas del mismo autor —tal
como la define el párrafo "Agrupación de actividad" del requirement "Jerarquía de
presentación del feed"— está compuesta por canciones del **mismo álbum**, con el `kind`
alternando libremente entre escucha, favorito y valoración, y esa corrida incluye al menos
**3 canciones distintas valoradas y/o marcadas como favorito**, la lista de feed SHALL
presentar esa corrida como un **barrido de álbum**: una síntesis de comportamiento ("Álbum
completo"), en lugar de una fila por escucha/favorito/valoración o de la fila genérica de
grupo partida por tipo. Este requirement refina —no contradice— la presentación de una
corrida colapsada descrita en "Jerarquía de presentación del feed".

**Alcance de la corrida.** El `kind` de cada entrada de la corrida SHALL ser escucha,
favorito o valoración de una canción con álbum resuelto; una escucha de una canción del álbum
sin valoración ni favorito SHALL contar como parte de la corrida (de paso) pero NO SHALL
contar para el umbral de 3 canciones distintas. Una canción con favorito Y valoración dentro
de la misma corrida SHALL contar **una sola vez** hacia ese umbral. Comentarios, reseñas y
cualquier objetivo que no sea una canción de ese álbum NO SHALL formar parte de la corrida.

**Umbral.** El umbral de 3 canciones distintas (valoradas, marcadas como favorito, o ambas)
SHALL ser una constante con nombre, calibrable sin cambio de esta especificación. Una corrida
que no alcanza el umbral NO SHALL presentarse como barrido y SHALL seguir la presentación de
agrupación por tipo o de filas individuales que le corresponda.

**Cortes.** El barrido SHALL respetar las mismas reglas de corte que una corrida: una entrada
tier 1 (comentario, reseña, nota de escucha, evento de lista), una entrada de otro autor, o
una canción de un álbum **distinto y conocido**, cortan la corrida y por lo tanto el barrido.
Una entrada cuyo álbum no está resuelto (dato ausente) NO SHALL cortar el barrido por sí
sola si el resto de la condición de continuidad (mismo autor, candidata válida) se cumple. Un
favorito agregado y luego quitado de una canción del mismo álbum, intercalado entre escuchas
o valoraciones que de otro modo formarían un barrido, NO SHALL cortar esa corrida. El barrido
SHALL derivarse únicamente de entradas **consecutivas** de la página cargada; NO SHALL
consultar una fuente de datos adicional ni contar entradas fuera de esa corrida.

**Presentación.** El barrido de álbum SHALL mostrarse como una fila subordinada, indentada a
la columna del título y **sin celda de carátula**, con el mismo peso visual que una fila de
grupo colapsado o de pico de rotación. SHALL contener: el rótulo "Álbum completo", la
**cantidad de canciones distintas** que alcanzaron el umbral, el **título del álbum
enlazado** a su página (con el nombre del artista acreditado de las canciones junto al
título cuando exista), y el marcador de tiempo relativo de la entrada más reciente de la
corrida. En `/me/feed` y en el preview de feed de seguidos SHALL nombrar al autor; en el
rastro reciente del propio usuario SHALL omitirlo, igual que el resto de la presentación.

**Tono.** El barrido de álbum SHALL usar un registro neutro, mismo criterio que el pico de
rotación: NO SHALL mostrar el algoritmo, un porcentaje, una barra de progreso, un contador de
tipo "racha", emojis de fuego ni exclamaciones de logro.

**Alcance.** Este requirement SHALL aplicarse en las tres superficies que usan la
presentación por tier: `/me/feed`, el preview del feed de seguidos de Inicio y el bloque de
rastro reciente del propio usuario. El umbral SHALL implementarse como constante con nombre.

#### Scenario: 3 canciones del mismo álbum valoradas seguidas se presentan como barrido

- **WHEN** un seguido valora 3 canciones distintas del mismo álbum, de forma consecutiva y
  sin otra actividad entre medio
- **THEN** en lugar de la fila genérica "valoró 3 canciones", el feed muestra una única fila
  subordinada "Álbum completo · 3 canciones", con el álbum enlazado a su página

#### Scenario: Escucha y valoración intercaladas por canción también forman el barrido

- **WHEN** un seguido escucha y valora, canción por canción, 3 o más canciones distintas del
  mismo álbum de forma consecutiva (escucha, valoración, escucha, valoración...)
- **THEN** el feed muestra una única fila de barrido de álbum, en vez de filas sueltas
  alternadas por cambiar de `kind` en cada entrada

#### Scenario: Solo 2 canciones valoradas no alcanza el umbral

- **WHEN** un seguido valora 2 canciones distintas del mismo álbum, de forma consecutiva
- **THEN** no se forma un barrido de álbum (el umbral es 3) y esas valoraciones siguen la
  presentación que les corresponda por agrupación de tipo o como filas individuales

#### Scenario: Una escucha de paso no cuenta para el umbral pero tampoco corta el barrido

- **WHEN** dentro de una corrida de valoraciones del mismo álbum aparece una escucha
  (sin valoración ni favorito) de otra canción del mismo álbum
- **THEN** esa escucha queda absorbida en la corrida sin romperla, y no suma al recuento de
  canciones distintas que determina si se alcanza el umbral

#### Scenario: Canciones de dos álbumes distintos no se mezclan en un mismo barrido

- **WHEN** un seguido valora 2 canciones de un álbum y, de forma consecutiva, 3 canciones de
  un álbum distinto
- **THEN** el feed no forma un barrido para el primer álbum (no alcanza el umbral) y sí para
  el segundo, sin fundir ambos grupos de canciones en una sola fila

#### Scenario: Un comentario entre medio corta el barrido

- **WHEN** entre valoraciones de canciones del mismo álbum de un seguido aparece un
  comentario de esa persona
- **THEN** la corrida no se colapsa a través del comentario; el comentario se muestra como
  su propia entrada y el barrido se evalúa por separado a cada lado

#### Scenario: No se mezcla entre autores distintos

- **WHEN** dos autores distintos valoran canciones del mismo álbum de forma consecutiva en
  el feed
- **THEN** el barrido no cruza autores; cada uno se evalúa con su propia corrida

#### Scenario: El barrido no expone métricas de gamificación

- **WHEN** el feed muestra un barrido de álbum
- **THEN** la fila no incluye el algoritmo, porcentajes, barras de progreso, contadores de
  racha, emojis de fuego ni exclamaciones — solo el rótulo "Álbum completo", la cantidad de
  canciones y el álbum enlazado

#### Scenario: El barrido en el rastro reciente omite el nombre del propio usuario

- **WHEN** el bloque de rastro reciente del propio usuario contiene una corrida que
  califica como barrido de álbum
- **THEN** la fila se muestra sin repetir el `@username` del propio usuario, igual que el
  resto de ese bloque

#### Scenario: Marcar como favorito 3 canciones del mismo álbum también forma el barrido

- **WHEN** un seguido marca como favorito 3 canciones distintas del mismo álbum, de forma
  consecutiva y sin ninguna valoración de por medio
- **THEN** el feed muestra la fila de barrido de álbum, igual que si esas canciones hubieran
  sido valoradas

#### Scenario: Un favorito de paso no rompe un barrido de valoraciones que ya calificaría

- **WHEN** un seguido valora una canción, marca como favorito y luego quita el favorito de
  otra canción del mismo álbum, y valora una tercera canción, todo de forma consecutiva
- **THEN** el feed muestra una única fila de barrido de álbum; el favorito intercalado no
  corta la corrida en dos mitades que no alcanzarían el umbral por separado

#### Scenario: Favorito y valoración de la misma canción cuentan una sola vez

- **WHEN** un seguido marca como favorito y también valora la misma canción, dentro de una
  corrida que en total cubre menos de 3 canciones distintas
- **THEN** esa canción cuenta una sola vez hacia el umbral, no dos, y el barrido no se forma
  si el resto de canciones distintas de la corrida no alcanza las 3
