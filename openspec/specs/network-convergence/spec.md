# network-convergence Specification

## Purpose

La capa "relevante" del feed: detectar y presentar las **obras** con las que varias
personas distintas de la red del lector se relacionaron en una ventana corta ("en qué
coincide mi red ahora"), como una síntesis social única en la cabecera de `/me/feed`,
distinta del listado cronológico y del pico de rotación personal.

## Requirements
### Requirement: Detección de convergencia de la red

El sistema SHALL calcular, para un usuario autenticado, el conjunto de **obras** con las
que **al menos 3 personas distintas** de su red —seguidos con relación aceptada, excluidos
los bloqueados en cualquier dirección— se relacionaron dentro de una **ventana reciente**.
El cálculo SHALL ser bajo demanda, sin tabla materializada, y SHALL memoizarse dentro del
request (el mismo criterio que la huella de gusto y la sección "En rotación" del perfil).

**Interacción.** SHALL contar como interacción de una persona con una obra: una entrada de
diario (`listen_entry`), una valoración (`rating`), una reseña (`review`) o un favorito
(`favorite`) cuyo objetivo sea esa obra. En Fase 1 los cuatro tipos SHALL contar por
igual; la ponderación relativa entre tipos queda fuera de alcance. La actividad del
**propio lector** NUNCA SHALL contar para su propia convergencia.

**Objetivo.** Una obra SHALL ser un `release-group` **o** un `recording`; los objetivos de
tipo artista NUNCA producen convergencia. Un `release-group` y un `recording` SHALL contarse
como obras **separadas** (sin roll-up de canción a álbum).

**Ventana.** La ventana SHALL ser de 7 días contados hacia atrás desde el momento de
lectura. Para `listen_entry` y `favorite` la fecha relevante SHALL ser la de creación; para
`rating` y `review`, la de última actualización (el valor vigente).

**Visibilidad.** SHALL contar únicamente interacciones que el lector tiene permitido ver:
para `listen_entry` y `favorite`, audiencia `followers` o `public`; `rating` y `review` se
tratan como públicos implícitos. Un bloqueo en cualquier dirección entre el lector y la
persona SHALL excluir a esa persona por completo.

**Umbral y orden.** Una obra SHALL aparecer solo si el número de **personas distintas** que
interactuaron con ella en la ventana es **≥ 3**. Las obras SHALL ordenarse por número de
personas descendente y, a igualdad, por interacción más reciente descendente, y SHALL
limitarse a un máximo acotado. El umbral, la ventana, el máximo de obras y el máximo de
nombres mostrados SHALL implementarse como constantes con nombre, calibrables sin cambio de
esta especificación.

#### Scenario: Tres seguidos distintos sobre la misma obra en la ventana

- **WHEN** tres personas que el lector sigue con relación aceptada registran una escucha,
  una valoración y un favorito del mismo álbum, todas dentro de los últimos 7 días
- **THEN** ese álbum aparece en la convergencia de la red del lector con un recuento de 3
  personas

#### Scenario: Distintos tipos de interacción cuentan por igual

- **WHEN** de las tres personas, una escuchó el álbum, otra lo valoró y otra lo reseñó
- **THEN** las tres cuentan igual hacia el umbral de 3 personas

#### Scenario: Varias interacciones de una misma persona no inflan el recuento

- **WHEN** una sola persona registra 5 escuchas del mismo álbum en la ventana y nadie más
  interactúa con él
- **THEN** ese álbum no aparece en la convergencia (cuenta personas distintas, no
  interacciones)

#### Scenario: La actividad del propio lector no cuenta

- **WHEN** el lector y dos personas que sigue interactúan con la misma obra en la ventana
- **THEN** la obra no alcanza el umbral (el lector no cuenta para su propia convergencia) y
  no aparece

#### Scenario: Interacción fuera de la ventana

- **WHEN** tres seguidos interactuaron con la misma obra pero una de esas interacciones
  ocurrió hace más de 7 días
- **THEN** solo se cuentan las personas con interacción dentro de la ventana; si quedan
  menos de 3, la obra no aparece

#### Scenario: Interacción no visible para el lector

- **WHEN** una de las tres interacciones es una escucha con audiencia `private`, o proviene
  de una persona con bloqueo mutuo
- **THEN** esa persona no cuenta y, si el total baja de 3, la obra no aparece

#### Scenario: Objetivo de tipo artista

- **WHEN** tres seguidos marcan como favorito al mismo artista en la ventana
- **THEN** eso no genera una convergencia (el artista no es una obra a estos efectos)

#### Scenario: Convergencia sobre una canción

- **WHEN** tres seguidos distintos registran escuchas de la misma canción en la ventana
- **THEN** esa canción aparece en la convergencia como su propia obra, sin agregarse al
  álbum que la contiene

#### Scenario: Sin convergencia

- **WHEN** ninguna obra alcanza 3 personas distintas de la red del lector en la ventana
- **THEN** el cálculo devuelve un conjunto vacío

### Requirement: Presentación de la convergencia en el feed

`/me/feed` SHALL mostrar la convergencia de la red como un **panel en la cabecera**, encima
del listado cronológico de actividad y visualmente separado de él. El panel SHALL
representar la capa "relevante" (en qué coincide la red), distinta de la capa "social" (qué
hizo cada persona, en orden) y del pico de rotación (el propio comportamiento del lector).

Cada obra convergente SHALL mostrarse como **una sola síntesis**: la carátula (o el disco
cuando no hay arte), el título enlazado a la página de la obra, el nombre del artista
acreditado cuando exista, y una línea con una **muestra de nombres** de las personas (hasta
un máximo acotado, con "y N más" cuando el recuento lo supera) junto a la cifra de personas
de la red. El panel NUNCA SHALL renderizar la convergencia como filas separadas por persona
ni SHALL desglosar qué tipo de interacción tuvo cada persona.

El tono SHALL ser cultural: el panel NO SHALL mostrar la palabra "tendencia", un contador
de tipo racha, emojis de fuego, una insignia de número destacado ni ningún ranking de
popularidad global. La única cifra SHALL ser el número de personas de la red del lector.

Cuando no hay ninguna obra convergente, el panel NO SHALL renderizarse (sin encabezado
vacío ni hueco). El listado cronológico del feed SHALL permanecer sin cambios: las entradas
individuales que alimentan una convergencia SHALL seguir apareciendo en él.

#### Scenario: Panel con una obra convergente

- **WHEN** el lector abre `/me/feed` y hay un álbum con el que 4 personas que sigue
  interactuaron en la ventana
- **THEN** ve, encima del listado cronológico, una fila con la carátula y el título
  enlazado del álbum, el artista, hasta 3 nombres y la cifra "4 personas que seguís"

#### Scenario: Síntesis única, no filas por persona

- **WHEN** una obra convergente tiene interacciones de 3 personas de tipos distintos
- **THEN** el panel muestra una única fila para esa obra, sin una fila por persona y sin
  indicar que una escuchó, otra valoró y otra reseñó

#### Scenario: Muestra de nombres acotada

- **WHEN** una obra tiene 6 personas convergentes
- **THEN** el panel muestra los primeros nombres hasta el máximo y "y N más", y la cifra
  total es 6

#### Scenario: Sin convergencia no hay panel

- **WHEN** el lector abre `/me/feed` y ninguna obra alcanza el umbral
- **THEN** no se renderiza ningún encabezado ni panel de convergencia, y el listado
  cronológico ocupa el lugar habitual

#### Scenario: El listado cronológico no cambia

- **WHEN** un álbum aparece en el panel de convergencia
- **THEN** las escuchas, valoraciones, reseñas y favoritos individuales de ese álbum siguen
  apareciendo en el listado cronológico de abajo, con su presentación por tier habitual

#### Scenario: Tono sin gamificación

- **WHEN** el panel de convergencia se muestra
- **THEN** no incluye la palabra "tendencia", contadores de racha, emojis de fuego,
  insignias de número destacado ni ranking global — solo los nombres y la cifra de personas
  de la red

