## ADDED Requirements

### Requirement: Registrar una escucha de un álbum desde la vista de selección
El sistema SHALL permitir al propietario registrar una escucha de cualquier álbum de su selección
directamente desde la vista de selección de la página de gestión, sin salir de la página. Registrar
una escucha SHALL crear una entrada de diario privada para ese álbum, con la misma semántica de
registro rápido que el resto del catálogo. Inmediatamente después de crearla, el sistema SHALL
desplegar, sobre esa misma entrada y sin salir de la página, el mismo panel de ampliación
(impresión, contexto, reacción y audiencia) que ya ofrece el registro rápido en el resto del
catálogo, desplazándolo a la vista si hiciera falta — salvo que ya haya otro panel de ampliación
abierto, caso en el que el sistema SHALL NOT reemplazarlo automáticamente: registrar otro álbum
mientras un panel está abierto SHALL marcarlo como escuchado igual, sin abrirle panel ni descartar
lo que el propietario esté completando en el que ya tenía abierto. El propietario SHALL poder
ocultar el panel abierto y volver a desplegarlo después, o desplegar el de otro álbum ya
registrado, mediante un control "Ampliar"/"Cerrar", sin que volver a desplegarlo cree una nueva
entrada. Cada álbum de la selección SHALL indicar si el propietario ya tiene al menos una escucha
registrada para él. El progreso del recorrido (selección escuchada) y su estado derivado (en
curso/completo) SHALL reflejar la escucha recién registrada de inmediato, sin recargar la página.
Un error al registrar SHALL dejar el estado del álbum como estaba, con un aviso, sin descartar el
borrador de selección en curso.

#### Scenario: Registrar una escucha marca el álbum como escuchado
- **WHEN** el propietario activa "Registrar escucha" sobre un álbum de la vista de selección que no
  tenía ninguna escucha registrada
- **THEN** ese álbum pasa a indicarse como escuchado, sin salir de la página de gestión

#### Scenario: El progreso se actualiza al instante
- **WHEN** el propietario registra una escucha de un álbum de su selección
- **THEN** la señal de progreso de la página de gestión refleja la nueva cantidad de álbumes
  escuchados sin recargar la página

#### Scenario: El recorrido pasa a completo al registrar la última escucha pendiente
- **WHEN** el propietario registra la escucha del único álbum de su selección que le faltaba
- **THEN** el recorrido pasa a mostrarse en estado completo, sin acción manual adicional sobre el
  estado

#### Scenario: El panel de ampliación se abre solo tras registrar
- **WHEN** el propietario registra una escucha de un álbum desde la vista de selección, sin tener
  ya otro panel de ampliación abierto
- **THEN** el sistema despliega, debajo de ese álbum, el panel para completar impresión, contexto,
  reacción y audiencia de la entrada recién creada, desplazándolo a la vista si hiciera falta, sin
  ninguna acción adicional

#### Scenario: Registrar otro álbum no reemplaza un panel ya abierto
- **WHEN** el propietario registra una escucha de un álbum mientras ya tiene abierto el panel de
  ampliación de otro álbum
- **THEN** el álbum recién registrado se marca como escuchado, pero el panel abierto sigue siendo
  el mismo, con lo que el propietario haya completado ahí intacto

#### Scenario: Cerrar y volver a abrir el panel no crea otra entrada
- **WHEN** el propietario oculta el panel de ampliación con "Cerrar" y luego lo vuelve a desplegar
  con "Ampliar"
- **THEN** el sistema muestra la misma entrada ya creada, sin registrar una escucha nueva

#### Scenario: Un error al registrar no descarta el borrador de selección
- **WHEN** registrar una escucha falla mientras el propietario tiene cambios sin guardar en el
  borrador de selección
- **THEN** el sistema muestra un aviso de error y el borrador de selección sin guardar no se pierde

#### Scenario: El editor de selección no ofrece esta acción
- **WHEN** el propietario tiene abierto el editor de selección (grilla de casilleros)
- **THEN** no encuentra ahí ninguna acción de registrar escucha — solo en la vista de selección

### Requirement: Quitar el registro de una escucha creada desde la vista de selección
El sistema SHALL ofrecer, junto a la marca de "escuchado" de un álbum, una acción "Quitar
registro" cuando la entrada de diario que lo marcó fue creada por el propietario en la misma
sesión de edición de esta página, que SHALL eliminar esa entrada de forma permanente y revertir la
marca de "escuchado" del álbum si no le queda ninguna otra escucha registrada. Activar "Registrar
escucha" o "Quitar registro" repetidamente sobre el mismo álbum SHALL NOT crear entradas de diario
adicionales: cada álbum SHALL exponer como máximo una de las dos acciones a la vez, nunca ambas, y
nunca una acción de "registrar de nuevo" mientras ya está marcado como escuchado. Un álbum marcado
como escuchado por una entrada que el propietario ya tenía antes de abrir esta sesión de edición
(creada desde el diario o desde la página del álbum) SHALL NOT ofrecer ninguna de las dos acciones
— el sistema no elige por su cuenta cuál de las escuchas existentes de ese álbum eliminar; gestionar
esas entradas sigue siendo una acción del diario propio. Un error al quitar un registro SHALL dejar
el estado del álbum como estaba, con un aviso, sin descartar el borrador de selección en curso. Si
el álbum quitado tenía su panel de ampliación abierto, el sistema SHALL cerrarlo.

#### Scenario: Quitar el registro revierte la marca de escuchado
- **WHEN** el propietario activa "Quitar registro" sobre un álbum cuya única escucha registrada la
  creó en esta misma sesión de edición
- **THEN** la entrada de diario se elimina y el álbum deja de indicarse como escuchado, sin salir
  de la página de gestión

#### Scenario: Un álbum solo ofrece una de las dos acciones a la vez
- **WHEN** el propietario ve un álbum de la vista de selección, esté o no marcado como escuchado
- **THEN** encuentra "Registrar escucha" o "Quitar registro", nunca ambas ni ninguna acción de
  "registrar de nuevo" sobre un álbum ya marcado

#### Scenario: Un álbum ya escuchado antes de esta sesión no ofrece ninguna de las dos acciones
- **WHEN** el propietario ve un álbum que ya estaba marcado como escuchado al abrir la página de
  gestión, sin haber registrado ni quitado ninguna escucha de él en esta sesión
- **THEN** el álbum se indica como escuchado sin ofrecer "Registrar escucha" ni "Quitar registro"

#### Scenario: Quitar el registro cierra su panel de ampliación
- **WHEN** el propietario quita el registro de un álbum cuyo panel de ampliación está abierto
- **THEN** el panel se cierra junto con la eliminación de la entrada

#### Scenario: Un error al quitar el registro no descarta el borrador de selección
- **WHEN** quitar un registro falla mientras el propietario tiene cambios sin guardar en el
  borrador de selección
- **THEN** el sistema muestra un aviso de error, el álbum sigue marcado como escuchado, y el
  borrador de selección sin guardar no se pierde

### Requirement: Indicador de escuchado con contraste suficiente en modo gráfico
En el modo gráfico de la vista de selección, el control de escuchado sobre cada carátula SHALL
distinguirse por forma además de color entre marcado y sin marcar — no solo por una diferencia de
tono que pueda perderse contra la propia carátula —, y SHALL permanecer perceptible como marcado
incluso cuando no ofrece ninguna acción (Requirement "Quitar el registro de una escucha creada
desde la vista de selección").

#### Scenario: El estado marcado se distingue por forma, no solo por color
- **WHEN** el propietario ve la grilla de carátulas del modo gráfico con álbumes marcados y sin
  marcar como escuchados
- **THEN** puede distinguir unos de otros por la forma del control (relleno sólido vs. hueco), sin
  depender únicamente de percibir la diferencia de color

#### Scenario: Un álbum escuchado sin acción disponible sigue marcado visualmente
- **WHEN** un álbum ya escuchado antes de esta sesión no ofrece "Registrar escucha" ni "Quitar
  registro" (Requirement "Quitar el registro de una escucha creada desde la vista de selección")
- **THEN** su control sigue mostrándose con el mismo relleno sólido que un álbum marcado con acción
  disponible, sin verse atenuado
