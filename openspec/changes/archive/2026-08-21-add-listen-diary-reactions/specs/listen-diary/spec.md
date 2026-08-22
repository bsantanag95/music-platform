# listen-diary

## ADDED Requirements

### Requirement: Registro manual de una escucha
El sistema SHALL permitir a un usuario autenticado registrar una escucha sobre un artista, un álbum
o una canción mediante una acción de baja fricción. Una escucha SHALL ser un registro append-only:
registrar de nuevo el mismo objetivo crea una entrada nueva y nunca reemplaza una anterior.

#### Scenario: Registrar una escucha
- **WHEN** un usuario autenticado marca como escuchado un artista, álbum o canción válido
- **THEN** el sistema crea una entrada de diario sin exigir más datos

#### Scenario: Objetivo inexistente o inválido
- **WHEN** el sistema recibe una escucha cuyo objetivo no existe o no es uno de los tres tipos
  permitidos
- **THEN** la API responde un error de validación y no crea ninguna entrada

#### Scenario: Múltiples escuchas del mismo objetivo
- **WHEN** un usuario registra más de una escucha sobre el mismo álbum
- **THEN** cada registro crea una entrada distinta y ninguna reemplaza a la anterior

#### Scenario: Sesión requerida
- **WHEN** una request sin sesión intenta registrar una escucha
- **THEN** la API responde `401` con código `AUTH_REQUIRED` y no crea ninguna entrada

### Requirement: Reacción emocional de la escucha
El sistema SHALL permitir asociar a cada escucha una reacción emocional opcional con los valores
estables `liked`, `loved`, `obsessed`, `neutral` o `disliked`. La ausencia de reacción SHALL
representarse como dato nulo y SHALL ser distinta de la reacción `neutral` elegida explícitamente.
La reacción SHALL ser independiente de la valoración numérica vigente del objetivo.

#### Scenario: Elegir una reacción
- **WHEN** el usuario asigna la reacción `loved` a una entrada
- **THEN** la entrada queda con `loved` y el valor persistido no depende del idioma de la UI

#### Scenario: Sin reacción
- **WHEN** el usuario crea una entrada sin indicar reacción
- **THEN** la entrada queda sin reacción, distinta de una reacción neutra elegida

#### Scenario: Reacción neutra explícita
- **WHEN** el usuario elige la reacción `neutral`
- **THEN** la entrada queda con reacción `neutral`, distinta de la ausencia de dato

#### Scenario: Reacción inválida
- **WHEN** el sistema recibe una reacción fuera de la taxonomía permitida
- **THEN** la API responde un error de validación y no modifica la entrada

#### Scenario: La reacción no afecta el rating
- **WHEN** el usuario cambia la reacción de una escucha de un objetivo con valoración vigente
- **THEN** la valoración vigente del objetivo no se crea, modifica ni elimina

### Requirement: Contexto de escucha
El sistema SHALL registrar en cada escucha un contexto entre `first_listen`, `relisten` y
`rediscovery`. La primera escucha de un usuario sobre un objetivo SHALL proponerse como
`first_listen` y las posteriores como `relisten`. El usuario SHALL poder corregir el contexto de una
entrada.

#### Scenario: Primera escucha
- **WHEN** un usuario registra su primera escucha sobre un objetivo
- **THEN** el contexto queda como `first_listen` por defecto

#### Scenario: Escuchas posteriores
- **WHEN** un usuario registra una nueva escucha sobre un objetivo que ya escuchó
- **THEN** el contexto queda como `relisten` por defecto

#### Scenario: Corregir el contexto
- **WHEN** el usuario edita el contexto de una entrada propia a `rediscovery`
- **THEN** la entrada queda con ese contexto

### Requirement: Impresión breve
El sistema SHALL permitir asociar a una escucha un texto libre opcional de hasta 500 caracteres.

#### Scenario: Guardar impresión
- **WHEN** el usuario guarda un texto de hasta 500 caracteres en una entrada propia
- **THEN** el texto queda asociado a la entrada

#### Scenario: Exceder el límite
- **WHEN** el usuario envía un texto mayor a 500 caracteres
- **THEN** la API responde un error de validación y no modifica la entrada

### Requirement: Audiencia de la escucha
El sistema SHALL permitir configurar la audiencia de cada escucha entre `private`, `followers` y
`public`. Una escucha nueva SHALL usar `followers` por defecto y el usuario SHALL poder cambiarla.
Las escuchas de un perfil privado SHALL ser privadas por defecto y podrán hacerse públicas
explícitamente.

#### Scenario: Audiencia por defecto
- **WHEN** un usuario crea una escucha sin especificar audiencia
- **THEN** la entrada queda con audiencia `followers`

#### Scenario: Cambiar audiencia
- **WHEN** el usuario cambia la audiencia de una entrada propia a `private`
- **THEN** la entrada queda privada y no será visible en superficies futuras para otras personas

### Requirement: Diario propio
El sistema SHALL permitir al usuario autenticado listar sus propias escuchas en orden cronológico
descendente con paginación. El listado SHALL contener únicamente entradas del usuario que lo
consulta y SHALL incluir el objetivo, el contexto, la impresión, la reacción y la audiencia de cada
entrada.

#### Scenario: Listar el diario
- **WHEN** un usuario autenticado abre su diario
- **THEN** ve sus escuchas ordenadas de la más reciente a la más antigua, paginadas

#### Scenario: Diario vacío
- **WHEN** un usuario sin escuchas abre su diario
- **THEN** ve un estado vacío localizado y no un error técnico

### Requirement: Ampliar y modificar una escucha
El sistema SHALL permitir al propietario modificar una entrada propia para completar o cambiar la
impresión, el contexto, la reacción o la audiencia. Cada campo SHALL ser opcional y al menos uno
deberá enviarse en cada modificación.

#### Scenario: Ampliar una entrada mínima
- **WHEN** el usuario completa impresión, contexto, reacción y audiencia de una entrada creada al
  instante
- **THEN** la entrada queda actualizada con todos los campos

#### Scenario: Modificar una entrada ajena
- **WHEN** el sistema recibe una modificación sobre una entrada que no pertenece al usuario
- **THEN** la API responde `404` con `LISTEN_ENTRY_NOT_FOUND` y no modifica la entrada

#### Scenario: Modificación vacía
- **WHEN** el usuario envía una modificación sin ningún campo
- **THEN** la API responde un error de validación

### Requirement: Borrado de una escucha
El sistema SHALL permitir al propietario borrar una entrada propia de forma física e irreversible.
El borrado no SHALL afectar al rating ni a otras entradas del mismo objetivo.

#### Scenario: Borrar una entrada propia
- **WHEN** el usuario borra una entrada propia
- **THEN** la entrada se elimina de forma permanente y no aparece más en el diario

#### Scenario: Borrar una entrada ajena
- **WHEN** el sistema recibe un borrado de una entrada que no pertenece al usuario
- **THEN** la API responde `404` con `LISTEN_ENTRY_NOT_FOUND` y no borra la entrada

### Requirement: Acción "Marcar como escuchado"
El sistema SHALL ofrecer en las páginas de artista, álbum y canción una acción autenticada que
cree la escucha al instante y permita ampliarla después. La acción SHALL tener estados de carga,
éxito, error y sesión requerida, y no SHALL bloquear la carga del contenido musical.

#### Scenario: Acción sin sesión
- **WHEN** un visitante no autenticado pulsa marcar como escuchado
- **THEN** se le solicita iniciar sesión y no se crea ninguna escucha

#### Scenario: Registro y ampliación posterior
- **WHEN** un usuario autenticado pulsa marcar como escuchado
- **THEN** se crea la escucha y se ofrece un panel para ampliarla con impresión, contexto,
  reacción y audiencia

### Requirement: Representación de las reacciones
El sistema SHALL mostrar las reacciones con texto localizado siempre visible y un icono opcional de
refuerzo, sin depender únicamente del color ni del emoji. El sistema SHALL diferenciar visualmente
la ausencia de reacción de la reacción neutra, y SHALL traducir las etiquetas en español e inglés.

#### Scenario: Etiquetas localizadas
- **WHEN** la interfaz muestra la reacción `liked`
- **THEN** el texto visible es `Me gustó` en español e `Like it` en inglés, con icono de refuerzo

#### Scenario: Ausencia frente a neutra
- **WHEN** la interfaz muestra una entrada sin reacción y otra con reacción `neutral`
- **THEN** la primera no muestra reacción y la segunda muestra la etiqueta localizada `Neutro`/
  `Neutral` con su icono