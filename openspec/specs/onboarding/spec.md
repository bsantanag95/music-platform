# onboarding Specification

## Purpose

Define el **onboarding guiado** de `/[locale]/welcome` (cambios `add-two-door-onboarding`, Fase 1 de
`redefine-content-hierarchy`, y `redesign-welcome-flow`): una superficie que se muestra **una sola vez**
por usuario, en **tres pasos** salteables con indicador de progreso — **Puerta 1** "álbumes que te definen"
(que se guardan como favoritos de álbum del usuario, sin fijarlos ni ordenarlos, sin rating ni entrada de
diario, IQ5), **paso de artistas** (seguir artistas) y **Puerta 2** "qué estás escuchando ahora" (que crea
una entrada de diario, sin favorito ni rating) — con aviso de audiencia y un resumen final. La marca
`app_user.onboarded_at` controla la redirección post-alta y el enlace pasivo de Inicio; una vez fijada,
`/welcome` redirige a Inicio. Distinto del bloque de onboarding social de Inicio.
## Requirements
### Requirement: El onboarding se muestra una sola vez

Cada usuario SHALL tener una marca `onboarded_at` (fecha, o nula si está pendiente). Al
**completar o saltar** el flujo de `/welcome`, el sistema SHALL fijar `onboarded_at`.
Mientras `onboarded_at` sea nula, la redirección posterior al alta SHALL llevar a
`/welcome`. Una vez fijada, `/welcome` SHALL redirigir a Inicio y el alta ya no SHALL
desviar hacia el onboarding. Los usuarios que ya existían cuando se introduce esta
capacidad SHALL considerarse onboardeados (no ven `/welcome`).

#### Scenario: Segunda visita a la bienvenida

- **WHEN** un usuario que ya completó o saltó el onboarding abre `/welcome`
- **THEN** es redirigido a Inicio, sin rehacer el flujo

#### Scenario: Redirección tras registrarse

- **WHEN** un usuario se registra (formulario local o Google) y su `onboarded_at` es nula
- **THEN** aterriza en `/welcome`, no en Inicio

#### Scenario: Usuario preexistente

- **WHEN** un usuario creado antes de esta capacidad inicia sesión
- **THEN** no es enviado a `/welcome` en ningún momento

### Requirement: Puerta 2 — registrar lo que estás escuchando

En la Puerta 2 el usuario SHALL buscar un álbum o una canción y, al elegirlo, el sistema
SHALL crear una **entrada de diario** (escucha) con el flujo existente: contexto inferido,
audiencia por defecto, sin exigir impresión ni reacción. La Puerta 2 SHALL NOT crear un
favorito ni una valoración. El usuario SHALL poder registrar varias escuchas. La Puerta 2
por sí sola SHALL NOT cerrar el onboarding. Al buscar canciones, la lista SHALL ofrecer
todas las canciones registrables que devuelve la búsqueda, no solo la primera. Lo ya
registrado SHALL salir de los resultados y mostrarse aparte con una acción **Deshacer** que
borra esa entrada de diario; elegir el mismo resultado varias veces seguidas SHALL crear una
sola entrada.

#### Scenario: Registrar una escucha desde el onboarding

- **WHEN** el usuario elige un álbum en la Puerta 2
- **THEN** se crea una entrada de diario para ese álbum, sin favorito ni valoración, y el
  usuario puede registrar otra o pasar a la Puerta 1 o terminar

#### Scenario: La Puerta 2 no cierra el onboarding

- **WHEN** el usuario registra una escucha en la Puerta 2 y no hace nada más
- **THEN** el onboarding sigue abierto hasta que el usuario use el botón de terminar

#### Scenario: Elegir entre varias canciones

- **WHEN** el usuario busca una canción y la búsqueda devuelve varias canciones registrables
- **THEN** la lista las muestra todas, con su artista, y registra la que el usuario elige

#### Scenario: Clic repetido

- **WHEN** el usuario hace clic dos veces seguidas en el mismo resultado
- **THEN** se crea una sola entrada de diario y el resultado deja de aparecer en la lista

#### Scenario: Deshacer un registro

- **WHEN** el usuario toca Deshacer en una escucha registrada desde la Puerta 2
- **THEN** la entrada de diario se borra, el elemento sale de la lista de registrados y
  vuelve a poder elegirse

### Requirement: Cierre del onboarding

El onboarding SHALL cerrarse mediante una única operación `POST /api/me/onboarding` que
recibe los ids de álbum de la Puerta 1 (posiblemente vacíos), crea los favoritos de álbum que
falten y fija `onboarded_at`. La respuesta SHALL informar `onboardedAt`. La operación SHALL ser
idempotente: invocarla cuando el usuario ya está onboardeado SHALL responder `200` sin volver a
crear favoritos ni re-marcar. Tras un cierre exitoso, la interfaz SHALL mostrar el resumen del
onboarding antes de llevar al usuario a Inicio.

#### Scenario: Terminar el onboarding

- **WHEN** el usuario termina el flujo tras elegir álbumes
- **THEN** se crean esos favoritos de álbum, se fija `onboarded_at`, y el usuario ve el resumen
  desde el que puede ir a Inicio

#### Scenario: Llamada repetida

- **WHEN** el cliente reintenta `POST /api/me/onboarding` para un usuario ya onboardeado
- **THEN** la API responde `200` sin efectos adicionales

### Requirement: Acceso pasivo al onboarding pendiente desde Inicio

Mientras el onboarding de un usuario esté pendiente (`onboarded_at` nula), Inicio SHALL
ofrecer un enlace a `/welcome` ("completá tu perfil musical"), diferenciado del bloque de
onboarding social (buscar gente / listas públicas), que se conserva. Una vez onboardeado,
el enlace SHALL desaparecer.

#### Scenario: Enlace visible mientras está pendiente

- **WHEN** un usuario con onboarding pendiente abre Inicio
- **THEN** ve un enlace a `/welcome`, además del bloque de onboarding social si no sigue a
  nadie

#### Scenario: Enlace ausente tras onboardear

- **WHEN** un usuario que ya completó o saltó el onboarding abre Inicio
- **THEN** no ve el enlace a `/welcome`

### Requirement: Puerta 1 — los álbumes elegidos se guardan como favoritos

En la Puerta 1 (paso 1) el usuario SHALL buscar álbumes y seleccionar hasta **6** (la UI SHALL
sugerir entre 3 y 5). Al guardar, cada álbum seleccionado SHALL convertirse en un **favorito de
álbum** del usuario: el sistema SHALL crear el `favorite` de álbum correspondiente (si no
existe) con la audiencia que resuelve la regla de audiencia por defecto (la preferencia del usuario o,
sin ella, la del tipo favorito), la misma de un favorito creado después por el usuario. La Puerta 1 SHALL NOT fijar ni
ordenar los álbumes, y SHALL NOT crear ninguna valoración ("esto me representa" no es "5
estrellas") ni ninguna entrada de diario. Guardar con cero álbumes SHALL ser válido
(equivale a saltar la puerta). Intentar guardar más de 6, o un álbum inexistente, SHALL
responder `400` con código `VALIDATION_ERROR`. La búsqueda completa de la Puerta 1 SHALL
acotarse a álbumes de estudio, y cada resultado SHALL mostrar su artista y año, y su tipo
cuando no sea de estudio, para distinguir álbumes homónimos.

#### Scenario: Elegir álbumes que te definen

- **WHEN** el usuario selecciona cuatro álbumes en la Puerta 1 y guarda
- **THEN** esos cuatro son favoritos de álbum del usuario y aparecen en su sección Favoritos
  del perfil, sin valoración ni entrada de diario asociada

#### Scenario: Saltar la Puerta 1

- **WHEN** el usuario termina el onboarding sin elegir ningún álbum
- **THEN** no se crea ningún favorito y el onboarding queda cerrado igual

#### Scenario: Exceder el máximo

- **WHEN** el usuario intenta guardar siete álbumes
- **THEN** la API responde `400` con código `VALIDATION_ERROR` y no se crea nada

#### Scenario: Distinguir álbumes homónimos

- **WHEN** la búsqueda devuelve dos álbumes con el mismo título y artista
- **THEN** cada fila muestra su año (y su tipo si no es de estudio) para poder distinguirlos

#### Scenario: Seguir eligiendo tras elegir uno

- **WHEN** el usuario elige un álbum de la lista de resultados
- **THEN** el texto de búsqueda se limpia y el foco vuelve al campo de búsqueda

#### Scenario: Audiencia de los favoritos sembrados

- **WHEN** un usuario sin audiencia por defecto guarda álbumes en la Puerta 1
- **THEN** sus favoritos nacen con audiencia pública, la misma que un favorito creado después desde el catálogo

#### Scenario: Audiencia por defecto del usuario

- **WHEN** un usuario con audiencia por defecto «privado» guarda álbumes en la Puerta 1
- **THEN** sus favoritos nacen privados

### Requirement: Aviso no bloqueante de verificación en la bienvenida

La ruta `/[locale]/welcome` SHALL mostrar, antes de los pasos, un aviso discreto cuando el email de la persona autenticada no esté verificado. El aviso SHALL explicar que puede continuar usando la cuenta, SHALL ofrecer el reenvío existente con un botón secundario y SHALL NOT impedir completar o saltar ningún paso ni empujar el primer campo de búsqueda fuera de la pantalla en móvil.

#### Scenario: Usuario nuevo sin verificar llega a bienvenida

- **WHEN** una persona autenticada con onboarding pendiente y email sin verificar llega a `/welcome`
- **THEN** ve el aviso de verificación antes del primer paso y puede interactuar con todos los pasos

#### Scenario: Usuario continúa sin verificar

- **WHEN** una persona sin verificar completa o salta el onboarding sin verificar el email
- **THEN** el onboarding termina con normalidad y la persona llega a Inicio

### Requirement: Los buscadores del onboarding comparten el motor del diálogo Añadir

Los buscadores de las dos puertas SHALL buscar con el mismo motor que el selector del diálogo «Añadir»: coincidencias locales primero y búsqueda completa después, cancelando la solicitud anterior al cambiar el texto o el tipo. Un fallo de búsqueda SHALL comunicarse como error y SHALL NOT mostrarse como «Sin resultados». El estado de la búsqueda («Buscando…», sin resultados, error) SHALL anunciarse a los lectores de pantalla.

#### Scenario: Fallo de búsqueda

- **WHEN** la búsqueda falla en cualquiera de las dos puertas
- **THEN** el usuario ve un mensaje de error de búsqueda, no «Sin resultados»

#### Scenario: Cambiar el texto cancela la búsqueda anterior

- **WHEN** el usuario sigue escribiendo mientras una búsqueda completa está en curso
- **THEN** la solicitud anterior se aborta y solo cuenta el resultado de la consulta vigente

### Requirement: Uso táctil del onboarding

Los controles de `/welcome` SHALL tener un área táctil de al menos 44 px de alto en móvil y los campos de texto SHALL usar 16 px en móvil para no provocar el zoom automático de iOS. Las carátulas decorativas de las listas de resultados SHALL ocultarse a las tecnologías de asistencia, y cada botón «Quitar» o «Deshacer» SHALL nombrar el elemento al que se refiere.

#### Scenario: Botones del flujo en móvil

- **WHEN** la bienvenida se muestra en un viewport de 375 px
- **THEN** «Saltar por ahora», el botón principal, el conmutador Álbum/Canción, «Quitar» y «Deshacer» miden al menos 44 px de alto y los campos de búsqueda usan 16 px

### Requirement: Paso de artistas a seguir

En el paso 2 el usuario SHALL poder buscar artistas y, al elegir uno, el sistema SHALL seguirlo con el flujo existente de seguir artista. El artista seguido SHALL salir de los resultados y mostrarse aparte con una acción «Dejar de seguir». Elegir el mismo resultado varias veces seguidas SHALL seguirlo una sola vez. El paso SHALL NOT exigir una cantidad mínima ni máxima de artistas y SHALL NOT cerrar el onboarding.

#### Scenario: Seguir un artista desde el onboarding

- **WHEN** el usuario elige un artista en el paso 2
- **THEN** el usuario pasa a seguir a ese artista, el artista se lista como seguido y deja de aparecer en los resultados

#### Scenario: Dejar de seguir

- **WHEN** el usuario toca «Dejar de seguir» en un artista seguido desde el paso 2
- **THEN** el seguimiento se elimina y el artista vuelve a poder elegirse

#### Scenario: Fallo al seguir

- **WHEN** la solicitud de seguir un artista falla
- **THEN** el usuario ve un mensaje de error y el artista no se lista como seguido

### Requirement: Aviso de audiencia en el onboarding

Los pasos de álbumes y de escucha SHALL decir con quién se comparte lo que el usuario elige: la **audiencia efectiva** de un favorito nuevo y de una entrada de diario nueva del usuario (su audiencia por defecto, o la del tipo de contenido si no tiene), con un enlace a Privacidad y audiencia que no descarte lo elegido.

#### Scenario: Usuario sin preferencia de audiencia

- **WHEN** un usuario sin audiencia por defecto abre los pasos 1 y 3
- **THEN** el paso 1 indica que sus favoritos son públicos y el paso 3 indica que su diario es solo suyo

#### Scenario: Usuario con audiencia por defecto

- **WHEN** un usuario con audiencia por defecto «seguidores» abre los pasos 1 y 3
- **THEN** ambos avisos indican «tus seguidores»

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

### Requirement: La bienvenida se muestra con navegación reducida

La ruta `/[locale]/welcome` SHALL mostrarse como pantalla de foco: el Header SHALL reducirse al logo (enlazado a Inicio) y al selector de idioma, y el pie SHALL reducirse a la atribución de fuentes de datos y a los enlaces legales. La bienvenida SHALL NOT mostrar el buscador, la navegación general, las acciones rápidas, el menú de usuario ni los grupos de navegación, cuenta, recursos y redes del pie.

#### Scenario: Navegación reducida

- **WHEN** una persona abre `/welcome`
- **THEN** el Header solo tiene el logo y el selector de idioma, y el pie solo tiene la atribución de fuentes y los enlaces legales

#### Scenario: Salida a Inicio

- **WHEN** la persona toca el logo desde la bienvenida
- **THEN** va a Inicio, el onboarding sigue pendiente y Inicio ofrece el enlace para retomarlo

#### Scenario: Idioma

- **WHEN** la persona cambia de idioma desde el Header de la bienvenida
- **THEN** sigue en `/welcome` en el idioma elegido

#### Scenario: Al terminar, el sitio completo

- **WHEN** la persona cierra el onboarding y va a Inicio
- **THEN** el Header y el pie completos vuelven a mostrarse

