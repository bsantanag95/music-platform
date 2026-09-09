# onboarding Specification

## Purpose

Define el **onboarding de dos puertas** de `/[locale]/welcome` (cambio
`add-two-door-onboarding`, Fase 1 de `redefine-content-hierarchy`): una superficie que se
muestra **una sola vez** por usuario y ofrece dos entradas complementarias y salteables —
**Puerta 1** "álbumes que te definen" (que se convierten en Álbumes favoritos del perfil,
sin rating ni entrada de diario, IQ5) y **Puerta 2** "qué estás escuchando ahora" (que crea
una entrada de diario, sin favorito ni rating). La marca `app_user.onboarded_at` controla
la redirección post-alta y el enlace pasivo de Inicio; una vez fijada, `/welcome` redirige
a Inicio. Distinto del bloque de onboarding social de Inicio.

## Requirements
### Requirement: Ruta de bienvenida con onboarding de dos puertas

El sistema SHALL exponer una ruta `/[locale]/welcome` que presente un onboarding de **dos
puertas complementarias**: "Álbumes que te definen" (identidad) y "¿Qué estás escuchando
ahora?" (presente). Ninguna puerta SHALL ser obligatoria y SHALL poder completarse en
cualquier orden, o saltarse. La ruta SHALL requerir sesión: un visitante sin sesión SHALL
ser redirigido al login.

#### Scenario: Usuario nuevo abre la bienvenida

- **WHEN** un usuario autenticado que no completó el onboarding abre `/welcome`
- **THEN** ve las dos puertas, cada una con su propia acción y un botón para terminar e ir
  a Inicio

#### Scenario: Visitante sin sesión

- **WHEN** una persona sin sesión abre `/welcome`
- **THEN** es redirigida al login

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

### Requirement: Puerta 1 — los álbumes elegidos son los Álbumes favoritos

En la Puerta 1 el usuario SHALL buscar álbumes y seleccionar hasta **6** (la UI SHALL
sugerir entre 3 y 5). Al guardar, cada álbum seleccionado SHALL convertirse en un **Álbum
favorito** del perfil: el sistema SHALL crear el `favorite` de álbum correspondiente (si no
existe) con la audiencia por defecto de un favorito nuevo, y fijarlo en la sección "Álbumes
favoritos". La Puerta 1 SHALL NOT crear ninguna valoración ("esto me representa" no es "5
estrellas") ni ninguna entrada de diario. Guardar con cero álbumes SHALL ser válido
(equivale a saltar la puerta). Intentar guardar más de 6, o un álbum inexistente, SHALL
responder `400` con código `VALIDATION_ERROR`.

#### Scenario: Elegir álbumes que te definen

- **WHEN** el usuario selecciona cuatro álbumes en la Puerta 1 y guarda
- **THEN** esos cuatro aparecen como sus Álbumes favoritos del perfil, en el orden elegido,
  sin valoración ni entrada de diario asociada

#### Scenario: Saltar la Puerta 1

- **WHEN** el usuario termina el onboarding sin elegir ningún álbum
- **THEN** no se crea ningún Álbum favorito y el onboarding queda cerrado igual

#### Scenario: Exceder el máximo

- **WHEN** el usuario intenta guardar siete álbumes
- **THEN** la API responde `400` con código `VALIDATION_ERROR` y no se fija nada

### Requirement: Puerta 2 — registrar lo que estás escuchando

En la Puerta 2 el usuario SHALL buscar un álbum o una canción y, al elegirlo, el sistema
SHALL crear una **entrada de diario** (escucha) con el flujo existente: contexto inferido,
audiencia por defecto, sin exigir impresión ni reacción. La Puerta 2 SHALL NOT crear un
favorito ni una valoración. El usuario SHALL poder registrar varias escuchas. La Puerta 2
por sí sola SHALL NOT cerrar el onboarding.

#### Scenario: Registrar una escucha desde el onboarding

- **WHEN** el usuario elige un álbum en la Puerta 2
- **THEN** se crea una entrada de diario para ese álbum, sin favorito ni valoración, y el
  usuario puede registrar otra o pasar a la Puerta 1 o terminar

#### Scenario: La Puerta 2 no cierra el onboarding

- **WHEN** el usuario registra una escucha en la Puerta 2 y no hace nada más
- **THEN** el onboarding sigue abierto hasta que el usuario use el botón de terminar

### Requirement: Cierre del onboarding

El onboarding SHALL cerrarse mediante una única operación `POST /api/me/onboarding` que
recibe los ids de álbum de la Puerta 1 (posiblemente vacíos), siembra los Álbumes favoritos
y fija `onboarded_at`. La operación SHALL ser idempotente: invocarla cuando el usuario ya
está onboardeado SHALL responder `200` sin volver a sembrar ni re-marcar.

#### Scenario: Terminar el onboarding

- **WHEN** el usuario toca "Ir a Inicio" tras elegir álbumes
- **THEN** se siembran esos Álbumes favoritos, se fija `onboarded_at`, y el usuario llega a
  Inicio

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

