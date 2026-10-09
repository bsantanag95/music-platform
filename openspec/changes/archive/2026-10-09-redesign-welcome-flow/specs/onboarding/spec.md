## REMOVED Requirements

### Requirement: Ruta de bienvenida con onboarding de dos puertas

**Reason**: el onboarding deja de presentarse como dos secciones simultáneas y pasa a tres pasos guiados con progreso; el requisito se reemplaza por «Ruta de bienvenida con onboarding guiado en tres pasos».

**Migration**: ver el requisito nuevo; la exigencia de sesión y la redirección de visitantes se conservan.

## ADDED Requirements

### Requirement: Ruta de bienvenida con onboarding guiado en tres pasos

El sistema SHALL exponer una ruta `/[locale]/welcome` que presente el onboarding como **tres pasos** con un indicador de progreso («Paso N de 3»): (1) «Álbumes que te definen» (identidad), (2) «Artistas que quieres seguir» y (3) «¿Qué estás escuchando ahora?» (presente). Un solo paso SHALL estar visible a la vez; el usuario SHALL poder avanzar, retroceder y saltar cualquier paso, y lo elegido en un paso SHALL conservarse al ir y volver. Ningún paso SHALL ser obligatorio. La ruta SHALL requerir sesión: un visitante sin sesión SHALL ser redirigido al login.

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

Al cerrar el onboarding con éxito, el sistema SHALL mostrar un resumen de lo hecho en el flujo (favoritos guardados, artistas seguidos, escuchas registradas; solo los conteos mayores que cero) y los siguientes pasos —ir a Inicio, Explorar cuando esté activo, buscar gente—, en lugar de redirigir de inmediato a Inicio. El botón de salida SHALL decir «Saltar por ahora» si el usuario no hizo nada y «Terminar ahora» si ya hay algo, y en ambos casos SHALL guardar los álbumes elegidos.

#### Scenario: Resumen con lo hecho

- **WHEN** el usuario eligió 3 álbumes, siguió a 2 artistas y registró 1 escucha, y termina
- **THEN** ve «Todo listo» con 3 favoritos, 2 artistas seguidos y 1 escucha, y los siguientes pasos

#### Scenario: Terminar sin haber hecho nada

- **WHEN** el usuario salta el onboarding sin elegir, seguir ni registrar nada
- **THEN** el onboarding queda cerrado y el resumen no menciona conteos

#### Scenario: Terminar antes del último paso

- **WHEN** el usuario eligió dos álbumes en el paso 1 y toca «Terminar ahora» en el paso 2
- **THEN** los dos álbumes se guardan como favoritos y el onboarding queda cerrado

## MODIFIED Requirements

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

### Requirement: Aviso no bloqueante de verificación en la bienvenida

La ruta `/[locale]/welcome` SHALL mostrar, antes de los pasos, un aviso discreto cuando el email de la persona autenticada no esté verificado. El aviso SHALL explicar que puede continuar usando la cuenta, SHALL ofrecer el reenvío existente con un botón secundario y SHALL NOT impedir completar o saltar ningún paso ni empujar el primer campo de búsqueda fuera de la pantalla en móvil.

#### Scenario: Usuario nuevo sin verificar llega a bienvenida

- **WHEN** una persona autenticada con onboarding pendiente y email sin verificar llega a `/welcome`
- **THEN** ve el aviso de verificación antes del primer paso y puede interactuar con todos los pasos

#### Scenario: Usuario continúa sin verificar

- **WHEN** una persona sin verificar completa o salta el onboarding sin verificar el email
- **THEN** el onboarding termina con normalidad y la persona llega a Inicio
