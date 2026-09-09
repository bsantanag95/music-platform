## MODIFIED Requirements

### Requirement: Audiencia de la escucha

El sistema SHALL permitir configurar la audiencia de cada escucha entre `private`,
`followers` y `public`. Una escucha registrada **sin impresión ni reacción** SHALL nacer
con audiencia **`private`** por defecto. Cuando una escucha propia gana una impresión o una
reacción y el usuario **no ha elegido una audiencia de forma explícita**, su audiencia por
defecto SHALL pasar a `followers`; una vez que el usuario fija una audiencia a mano, esa
elección NUNCA SHALL revertirse automáticamente. El usuario SHALL poder cambiar la
audiencia de cualquier entrada propia en cualquier momento. Este comportamiento por defecto
SHALL aplicarse solo a entradas nuevas; las entradas existentes SHALL conservar su
audiencia. Las escuchas de un perfil privado SHALL ser privadas por defecto y podrán
hacerse públicas explícitamente.

#### Scenario: Audiencia por defecto

- **WHEN** un usuario registra una escucha sin impresión ni reacción y sin especificar
  audiencia
- **THEN** la entrada queda con audiencia `private`

#### Scenario: La audiencia sigue a la intención

- **WHEN** el usuario agrega una impresión o una reacción a una entrada `private` sin haber
  elegido una audiencia de forma explícita
- **THEN** la audiencia por defecto de esa entrada pasa a `followers`, y si luego quita la
  impresión y la reacción vuelve a `private`

#### Scenario: La elección explícita no se revierte

- **WHEN** el usuario fija la audiencia de una entrada a un valor concreto y después cambia
  su impresión o su reacción
- **THEN** la audiencia permanece en el valor que el usuario eligió

#### Scenario: Entrada existente conserva su audiencia

- **WHEN** el usuario edita una entrada creada antes de este comportamiento, cuya audiencia
  es `followers`
- **THEN** la audiencia se mantiene en `followers` salvo que el usuario la cambie a mano

#### Scenario: Cambiar audiencia

- **WHEN** el usuario cambia la audiencia de una entrada propia a `private`
- **THEN** la entrada queda privada y no será visible en superficies para otras personas

### Requirement: Ampliar y modificar una escucha

El sistema SHALL permitir al propietario modificar una entrada propia para completar o
cambiar la impresión, el contexto, la reacción o la audiencia. Cada campo SHALL ser
opcional y al menos uno deberá enviarse en cada modificación. El sistema NO SHALL ofrecer,
en el flujo de ampliar una escucha, ningún campo de valoración numérica ni de reseña: esos
actos pertenecen al modo Obra y son independientes de la escucha.

#### Scenario: Ampliar una entrada mínima

- **WHEN** el usuario completa impresión, contexto, reacción y audiencia de una entrada
  creada al instante
- **THEN** la entrada queda actualizada con todos los campos

#### Scenario: El formulario de ampliar no incluye opinión

- **WHEN** el usuario abre el panel para ampliar una escucha
- **THEN** el panel ofrece impresión, contexto, reacción y audiencia, y ningún control de
  estrellas, puntuación o reseña

#### Scenario: Modificar una entrada ajena

- **WHEN** el sistema recibe una modificación sobre una entrada que no pertenece al usuario
- **THEN** la API responde `404` con `LISTEN_ENTRY_NOT_FOUND` y no modifica la entrada

#### Scenario: Modificación vacía

- **WHEN** el usuario envía una modificación sin ningún campo
- **THEN** la API responde un error de validación

### Requirement: Acción "Marcar como escuchado"

El sistema SHALL ofrecer en las páginas de artista, álbum y canción una acción autenticada
que cree la escucha al instante y permita ampliarla después. La acción SHALL rotularse como
**"Registrar escucha"** (o "Anotar en el diario" en superficies narrativas), NUNCA con un
lenguaje que sugiera marcar algo como completado. La acción SHALL tener estados de carga,
éxito, error y sesión requerida, y no SHALL bloquear la carga del contenido musical. La
escucha así creada SHALL nacer con audiencia `private` (ver "Audiencia de la escucha").

#### Scenario: Acción sin sesión

- **WHEN** un visitante no autenticado pulsa la acción de registrar escucha
- **THEN** se le solicita iniciar sesión y no se crea ninguna escucha

#### Scenario: Registro y ampliación posterior

- **WHEN** un usuario autenticado pulsa la acción de registrar escucha
- **THEN** se crea la escucha con audiencia `private` y se ofrece un panel para ampliarla
  con impresión, contexto, reacción y audiencia

## ADDED Requirements

### Requirement: Encuadre del diario como registro intencional

El sistema SHALL presentar el diario de escucha como un **registro personal e intencional
de experiencias musicales**, no como un historial automático de reproducción ni como una
lista de completitud. En consecuencia:

- El texto de la interfaz NO SHALL usar lenguaje de casilla o de completado ("marcá lo que
  escuchaste", "escuchado" como estado) para la acción de registro.
- El sistema NO SHALL mostrar rachas, medallas, contadores de "escuchas totales" ni metas
  de volumen sobre el diario.
- La **intensidad** de una escucha (registro breve frente a experiencia) SHALL inferirse de
  la combinación de tipo de objetivo, presencia de impresión o reacción y contexto; el
  sistema NO SHALL pedir al usuario que la clasifique.

#### Scenario: La acción de registro no usa lenguaje de completitud

- **WHEN** el usuario ve la acción de registrar una escucha en una página de catálogo
- **THEN** el rótulo y los textos asociados hablan de registrar o anotar, no de marcar algo
  como escuchado o completado

#### Scenario: El diario no muestra métricas de volumen

- **WHEN** el usuario abre su diario
- **THEN** no ve rachas, medallas, un contador de escuchas totales ni una meta de volumen

#### Scenario: No hay selector de intensidad

- **WHEN** el usuario registra o amplía una escucha
- **THEN** no se le pide clasificar la intensidad de la escucha; el sistema la infiere

### Requirement: Vista de cronología del diario propio

El diario propio SHALL ofrecer, además de la vista de lista, una **vista de cronología**
que agrupa las entradas por **mes calendario** de su fecha de registro, con un encabezado
por mes. Dentro de cada mes las entradas SHALL conservar el orden cronológico descendente y
las mismas afordancias de edición y borrado que la vista de lista. La vista de cronología
NO SHALL mostrar conteos por mes, totales ni rachas: es la misma información reordenada, no
un resumen estadístico. El agrupado SHALL operar sobre las entradas ya cargadas, de modo
que también agrupe las que llegan al pedir más.

#### Scenario: Agrupar por mes

- **WHEN** el usuario cambia a la vista de cronología y tiene entradas de varios meses
- **THEN** ve un encabezado por mes y, bajo cada uno, sus entradas en orden cronológico
  descendente

#### Scenario: La cronología no es un resumen

- **WHEN** el usuario ve su diario en modo cronología
- **THEN** no aparece ningún conteo por mes, total ni racha; solo los encabezados de mes y
  las filas

#### Scenario: La cronología agrupa lo que se va cargando

- **WHEN** el usuario, en modo cronología, pide más entradas
- **THEN** las nuevas entradas se ubican bajo el encabezado del mes que les corresponde,
  sin romper la agrupación
