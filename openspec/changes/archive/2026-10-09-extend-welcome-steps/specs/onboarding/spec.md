## REMOVED Requirements

### Requirement: Ruta de bienvenida con onboarding guiado en tres pasos

**Reason**: se agrega un cuarto paso (Pendientes); el requisito se reemplaza por «Ruta de bienvenida con onboarding guiado», que no fija la cantidad de pasos en el nombre.

**Migration**: ver el requisito nuevo; el contenido y los escenarios se conservan con cuatro pasos.

## ADDED Requirements

### Requirement: Ruta de bienvenida con onboarding guiado

El sistema SHALL exponer una ruta `/[locale]/welcome` que presente el onboarding como **cuatro pasos** con un indicador de progreso («Paso N de 4»): (1) «Álbumes que te definen» (identidad), (2) «Artistas que quieres seguir», (3) «¿Qué estás escuchando ahora?» (presente) y (4) «Para escuchar después» (Pendientes). Un solo paso SHALL estar visible a la vez; el usuario SHALL poder avanzar, retroceder y saltar cualquier paso, y lo elegido en un paso SHALL conservarse al ir y volver y al recargar la pestaña (el paso actual, los álbumes elegidos, los artistas seguidos, las escuchas registradas y lo guardado en Pendientes, por persona). Lo conservado SHALL descartarse al cerrar el onboarding. Ningún paso SHALL ser obligatorio. La ruta SHALL requerir sesión: un visitante sin sesión SHALL ser redirigido al login.

#### Scenario: Usuario nuevo abre la bienvenida

- **WHEN** un usuario autenticado que no completó el onboarding abre `/welcome`
- **THEN** ve el paso 1 de 4 con su indicador de progreso, un botón para avanzar y la opción de saltar

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

- **WHEN** el usuario elige un álbum, sigue a un artista, registra una escucha, guarda un disco en Pendientes, llega al paso 4 y recarga la pestaña
- **THEN** vuelve al paso 4, el álbum sigue elegido, el artista figura como seguido, la escucha figura como registrada (con su acción Deshacer) y el disco figura en Pendientes (con su acción Quitar), sin poder repetir ninguna de esas acciones

#### Scenario: Otra cuenta en la misma pestaña

- **WHEN** otra persona inicia sesión en la misma pestaña y abre `/welcome`
- **THEN** empieza de cero, sin la selección de la persona anterior

### Requirement: Paso de Pendientes

En el paso 4 el usuario SHALL poder buscar álbumes o artistas (un tipo por búsqueda) y, al elegir uno, el sistema SHALL guardarlo en sus Pendientes con el flujo existente de Want to Listen. Lo guardado SHALL salir de los resultados y mostrarse aparte con una acción «Quitar». Elegir el mismo resultado varias veces seguidas SHALL guardarlo una sola vez, y guardar SHALL NOT quitar un objetivo que ya estaba en Pendientes. El paso SHALL decir que Pendientes es una lista propia, SHALL NOT exigir una cantidad mínima ni máxima y SHALL NOT cerrar el onboarding.

#### Scenario: Guardar un disco para después

- **WHEN** el usuario elige un álbum en el paso 4
- **THEN** el álbum queda en sus Pendientes, se lista como guardado y deja de aparecer en los resultados

#### Scenario: Quitar de Pendientes

- **WHEN** el usuario toca «Quitar» en un elemento guardado desde el paso 4
- **THEN** el elemento sale de sus Pendientes y vuelve a poder elegirse

#### Scenario: Objetivo que ya estaba en Pendientes

- **WHEN** el usuario elige un objetivo que ya estaba en sus Pendientes
- **THEN** sigue en sus Pendientes y se lista como guardado

## MODIFIED Requirements

### Requirement: Resumen al terminar el onboarding

Al cerrar el onboarding con éxito, el sistema SHALL mostrar un resumen de lo hecho en el flujo (favoritos guardados, artistas seguidos, escuchas registradas, elementos en Pendientes; solo los conteos mayores que cero) y los siguientes pasos —ir a Inicio, buscar gente y, solo entre las cosas que la persona aún no hizo, elegir sus géneros en el perfil, valorar un disco y explorar cuando esté activo—, en lugar de redirigir de inmediato a Inicio. El botón de salida SHALL decir «Saltar por ahora» si el usuario no hizo nada y «Terminar ahora» si ya hay algo, y en ambos casos SHALL guardar los álbumes elegidos.

#### Scenario: Resumen con lo hecho

- **WHEN** el usuario eligió 3 álbumes, siguió a 2 artistas, registró 1 escucha y guardó 2 elementos en Pendientes, y termina
- **THEN** ve «Todo listo» con 3 favoritos, 2 artistas seguidos, 1 escucha y 2 en Pendientes, y los siguientes pasos

#### Scenario: Terminar sin haber hecho nada

- **WHEN** el usuario salta el onboarding sin elegir, seguir, registrar ni guardar nada
- **THEN** el onboarding queda cerrado y el resumen no menciona conteos

#### Scenario: Terminar antes del último paso

- **WHEN** el usuario eligió dos álbumes en el paso 1 y toca «Terminar ahora» en el paso 2
- **THEN** los dos álbumes se guardan como favoritos y el onboarding queda cerrado

#### Scenario: Sugerencias de lo que falta

- **WHEN** el usuario terminó sin registrar ninguna escucha
- **THEN** el resumen sugiere valorar un disco, y si sí registró una escucha no lo sugiere
