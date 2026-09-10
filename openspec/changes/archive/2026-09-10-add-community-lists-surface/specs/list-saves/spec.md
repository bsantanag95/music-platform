## ADDED Requirements

### Requirement: Conteo agregado de guardados como dato público

El sistema SHALL exponer el **número total de guardados** de una lista de audiencia `public`
como dato público, legible con y sin sesión. Este conteo SHALL mostrarse en las tarjetas de
lista de la superficie `/lists` y en el encabezado de detalle de una lista pública. El
sistema SHALL NOT exponer la identidad de quienes guardaron una lista: el registro
individual de guardado sigue siendo un marcador privado por `(saver, list)`. El sistema
SHALL NOT exponer el conteo de guardados de listas de audiencia `followers` o `private` a
nadie salvo su dueño. La ordenación de la sección "Populares" de `/lists` por este conteo
SHALL presentarse como vitrina —"N guardados" en la tarjeta— y SHALL NOT incluir posiciones
numeradas ni distintivos de "top".

#### Scenario: Conteo visible en una lista pública

- **WHEN** una persona (con o sin sesión) abre `/lists` o el detalle de una lista de
  audiencia `public` que otras personas guardaron
- **THEN** ve el número total de guardados de esa lista, sin ver quiénes la guardaron

#### Scenario: Conteo oculto en listas no públicas

- **WHEN** una lista es de audiencia `followers` o `private`
- **THEN** su conteo de guardados no se muestra a otros usuarios, ni siquiera a sus
  seguidores

#### Scenario: "Populares" es una vitrina, no un ranking

- **WHEN** la sección "Populares" de `/lists` ordena listas por su conteo de guardados
- **THEN** cada tarjeta muestra "N guardados" sin número de posición ni distintivo de "top",
  y solo se listan listas con al menos un guardado

#### Scenario: La identidad de quien guarda sigue privada

- **WHEN** un usuario guarda una lista ajena
- **THEN** el conteo total de esa lista aumenta para todos, pero ningún tercero puede saber
  que fue esa persona quien la guardó
