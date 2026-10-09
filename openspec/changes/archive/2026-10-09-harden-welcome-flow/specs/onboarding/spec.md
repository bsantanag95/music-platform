## MODIFIED Requirements

### Requirement: Ruta de bienvenida con onboarding guiado en tres pasos

El sistema SHALL exponer una ruta `/[locale]/welcome` que presente el onboarding como **tres pasos** con un indicador de progreso («Paso N de 3»): (1) «Álbumes que te definen» (identidad), (2) «Artistas que quieres seguir» y (3) «¿Qué estás escuchando ahora?» (presente). Un solo paso SHALL estar visible a la vez; el usuario SHALL poder avanzar, retroceder y saltar cualquier paso, y lo elegido en un paso SHALL conservarse al ir y volver y al recargar la pestaña (el paso actual, los álbumes elegidos, los artistas seguidos y las escuchas registradas, por persona). Lo conservado SHALL descartarse al cerrar el onboarding. Ningún paso SHALL ser obligatorio. La ruta SHALL requerir sesión: un visitante sin sesión SHALL ser redirigido al login.

#### Scenario: Usuario nuevo abre la bienvenida

- **WHEN** un usuario autenticado que no completó el onboarding abre `/welcome`
- **THEN** ve el paso 1 de 3 con su indicador de progreso, un botón para avanzar y la opción de saltar

#### Scenario: Visitante sin sesión

- **WHEN** una persona sin sesión abre `/welcome`
- **THEN** es redirigida al login

#### Scenario: Volver a un paso anterior

- **WHEN** el usuario elige dos álbumes en el paso 1, avanza al paso 2 y vuelve al paso 1
- **THEN** los dos álbumes siguen elegidos

#### Scenario: Saltar un paso

- **WHEN** el usuario toca «Saltar este paso» en el paso 2 sin haber seguido a nadie
- **THEN** pasa al paso 3 sin seguir a ningún artista

#### Scenario: Recargar la pestaña

- **WHEN** el usuario elige un álbum, sigue a un artista, registra una escucha, llega al paso 3 y recarga la pestaña
- **THEN** vuelve al paso 3, el álbum sigue elegido, el artista figura como seguido y la escucha figura como registrada (con su acción Deshacer) sin poder registrarla de nuevo

#### Scenario: Otra cuenta en la misma pestaña

- **WHEN** otra persona inicia sesión en la misma pestaña y abre `/welcome`
- **THEN** empieza de cero, sin la selección de la persona anterior
