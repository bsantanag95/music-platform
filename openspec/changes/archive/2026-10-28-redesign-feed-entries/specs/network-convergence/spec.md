## MODIFIED Requirements

### Requirement: Presentación de la convergencia en el feed

`/me/feed` SHALL mostrar la convergencia de la red como un **panel** visualmente separado del listado cronológico: en
el riel lateral desde `lg` y encima del listado por debajo. Si la ventana de 7 días no tiene ninguna obra convergente,
el panel SHALL mirar 30 días con el mismo umbral, y su título SHALL decir qué ventana muestra ("esta semana" o "este
mes"). El panel SHALL
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

Cuando no hay ninguna obra convergente en ninguna de las dos ventanas, el panel NO SHALL renderizarse (sin encabezado
vacío ni hueco). El listado cronológico del feed SHALL permanecer sin cambios: las entradas
individuales que alimentan una convergencia SHALL seguir apareciendo en él.

#### Scenario: Panel con una obra convergente

- **WHEN** el lector abre `/me/feed` y hay un álbum con el que 4 personas que sigue
  interactuaron en la ventana
- **THEN** ve, en el riel (o encima del listado en una pantalla angosta), una fila con la carátula y el título
  enlazado del álbum, el artista, hasta 3 nombres y la cifra "4 personas que seguís"

#### Scenario: Respaldo de 30 días
- **WHEN** ninguna obra alcanza el umbral en 7 días pero una lo alcanza en los últimos 30
- **THEN** el panel se titula "En tu red este mes" y muestra esa obra

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
