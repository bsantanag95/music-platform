## MODIFIED Requirements

### Requirement: Rastro reciente del propio usuario en Inicio

El sistema SHALL mostrar en Inicio, solo para usuarios con sesión activa, un bloque con
las escuchas, valoraciones y comentarios más recientes registrados por el propio usuario,
ordenados por fecha descendente, dentro de un contenedor de altura fija con scroll
interno (ver Requirement: Carga incremental en los bloques de Inicio). El bloque SHALL
NOT aplicar filtros de audiencia, porque es contenido del propio usuario. El bloque SHALL
NOT mostrarse si el usuario no tiene ninguna entrada de esos tipos.

#### Scenario: Usuario con actividad propia reciente
- **WHEN** un usuario autenticado que registró escuchas, valoraciones o comentarios
  abre `/[locale]`
- **THEN** ve un bloque con sus entradas más recientes de esos tipos, cada una con link
  a la entidad correspondiente

#### Scenario: La actividad propia privada también aparece
- **WHEN** un usuario autenticado tiene una escucha o valoración con audiencia privada
- **THEN** esa entrada aparece igualmente en su bloque de rastro reciente, porque el
  bloque muestra contenido propio sin filtrar por audiencia

#### Scenario: Usuario sin actividad propia
- **WHEN** un usuario autenticado no tiene ninguna escucha, valoración ni comentario
- **THEN** el bloque de rastro reciente no se muestra en la página

## ADDED Requirements

### Requirement: Carga incremental en los bloques de Inicio

El sistema SHALL cargar inicialmente hasta 10 entradas en los bloques "Tu feed" y "Tu
rastro reciente" de Inicio, mostradas dentro de un contenedor con una altura fija que no
crece respecto a mostrar menos entradas: el contenido excedente SHALL desplazarse
mediante scroll dentro del contenedor, no expandir el bloque en la página. Al desplazar
el contenedor hasta su fondo, si existen más entradas, el sistema SHALL cargar
automáticamente la siguiente página y mostrar un indicador de carga circular mientras la
solicitud está en curso. El sistema SHALL NOT cargar más entradas de las que existen ni
mostrar el indicador de carga cuando ya no hay más páginas.

#### Scenario: Carga inicial de un bloque con más de 10 entradas disponibles
- **WHEN** un usuario autenticado tiene más de 10 entradas disponibles para "Tu feed" o
  "Tu rastro reciente"
- **THEN** el bloque muestra las primeras 10 dentro de un contenedor con scroll interno,
  sin crecer de tamaño respecto al bloque con menos entradas

#### Scenario: Scroll hasta el fondo dispara carga de más entradas
- **WHEN** el usuario desplaza el contenido de uno de estos bloques hasta el fondo del
  contenedor y existen más páginas de entradas
- **THEN** el sistema muestra un indicador de carga circular y agrega la siguiente
  página de entradas al final de la lista, sin recargar la página ni perder la posición
  de scroll ya alcanzada

#### Scenario: No hay más entradas para cargar
- **WHEN** el usuario llega al fondo del contenedor y ya se cargaron todas las entradas
  disponibles
- **THEN** el sistema no muestra el indicador de carga ni realiza más solicitudes
