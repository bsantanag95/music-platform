## MODIFIED Requirements

### Requirement: Acción "Marcar como escuchado"

El sistema SHALL ofrecer en las páginas de artista, álbum y canción una acción autenticada
que cree la escucha al instante y permita ampliarla después. El sistema SHALL ofrecer
además un **punto de entrada global** —fuera de toda página de entidad, disponible solo con
sesión— que primero resuelva el objetivo mediante el buscador del catálogo (artista, álbum
o canción) y luego corra ese mismo flujo de creación inmediata y ampliación. La acción SHALL
rotularse como **"Registrar escucha"** (o "Anotar en el diario" en superficies narrativas),
NUNCA con un lenguaje que sugiera marcar algo como completado. La acción SHALL tener estados
de carga, éxito, error y sesión requerida, y no SHALL bloquear la carga del contenido
musical. La escucha así creada SHALL nacer con audiencia `private` (ver "Audiencia de la
escucha"), sin importar si se inició desde una página de entidad o desde el punto de entrada
global.

#### Scenario: Acción sin sesión

- **WHEN** un visitante no autenticado pulsa la acción de registrar escucha
- **THEN** se le solicita iniciar sesión y no se crea ninguna escucha

#### Scenario: Registro y ampliación posterior

- **WHEN** un usuario autenticado pulsa la acción de registrar escucha
- **THEN** se crea la escucha con audiencia `private` y se ofrece un panel para ampliarla
  con impresión, contexto, reacción y audiencia

#### Scenario: Punto de entrada global — elegir objetivo y registrar

- **WHEN** un usuario autenticado abre el punto de entrada global, busca un artista, álbum o
  canción y elige un resultado
- **THEN** se crea la escucha sobre ese objetivo con audiencia `private` y se ofrece el
  mismo panel de ampliación que la acción de las páginas de entidad

#### Scenario: Punto de entrada global sin sesión

- **WHEN** no hay sesión
- **THEN** el punto de entrada global no se ofrece, y una petición de creación sin sesión
  responde `401` con código `AUTH_REQUIRED` sin crear ninguna escucha

#### Scenario: Cerrar el registro global no deshace la escucha creada

- **WHEN** el usuario ya eligió un objetivo (la escucha quedó creada) y cierra el registro
  global sin completar la ampliación
- **THEN** la entrada persiste tal como nació (append-only), visible en su diario
