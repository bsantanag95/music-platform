# community-concerts Specification

## Purpose
Conciertos compartidos creados por la comunidad (ADR 0058): quién puede crearlos y con qué límites, la plausibilidad
contra la actividad del artista, los duplicados, la confirmación por personas que estuvieron o por un setlist de
setlist.fm, qué se ve mientras están por confirmar y el crédito discreto de quien los registró.
## Requirements
### Requirement: Crear un concierto de la comunidad

Un usuario autenticado SHALL poder crear un concierto compartido con `POST /api/concerts`: un artista principal del
catálogo y hasta 10 artistas más del catálogo como principales o teloneros, fecha exacta, recinto, ciudad y país
obligatorios, nombre opcional (si falta, "<artista principal> en <recinto>") y un enlace opcional a un setlist de
setlist.fm. El concierto SHALL nacer de origen `community`, por confirmar, con quien lo creó como creador y como primera
asistente (con la regla de "Estuve ahí": crea o enlaza su recuerdo). Las reglas de forma SHALL vivir también como `CHECK`
en la base.

#### Scenario: Crear desde la pestaña

- **WHEN** una persona crea "Los Bunkers en Teatro Caupolicán" del 2009-05-15 en Santiago, Chile
- **THEN** existe un concierto por confirmar con ella como creadora y su recuerdo enlazado

#### Scenario: Sin ciudad o país

- **WHEN** la petición no trae ciudad o país
- **THEN** la API responde `400` con `VALIDATION_ERROR` y no crea nada

### Requirement: Requisitos y límites para crear

Para crear SHALL hacer falta una cuenta activa, con email verificado, de al menos 7 días y sin suspensión social; si no,
la API SHALL responder `403` con `CONCERT_CREATE_NOT_ALLOWED` (o `SOCIAL_SUSPENSION_ACTIVE` ante una suspensión). Una
persona SHALL poder crear hasta 5 conciertos en 24 horas; el sexto SHALL responder `429` con `CONCERT_CREATE_LIMIT`.

#### Scenario: Cuenta nueva

- **WHEN** una cuenta de 2 días intenta crear un concierto
- **THEN** la API responde `403` con `CONCERT_CREATE_NOT_ALLOWED`

#### Scenario: Límite diario

- **WHEN** una persona que creó 5 conciertos en las últimas 24 horas intenta crear otro
- **THEN** la API responde `429` con `CONCERT_CREATE_LIMIT`

### Requirement: Plausibilidad

La fecha SHALL ser exacta, desde 1900 y no futura. Para cada artista principal con datos de actividad, el año del
concierto SHALL NOT ser anterior al de su formación o nacimiento ni, si terminó, posterior al de su separación o muerte;
si no, la API SHALL responder `400` con `CONCERT_IMPLAUSIBLE`. Sin datos de actividad no se restringe.

#### Scenario: Banda separada

- **WHEN** alguien crea un concierto de una banda separada en 2014 con fecha 2018
- **THEN** la API responde `400` con `CONCERT_IMPLAUSIBLE`

#### Scenario: Antes de formarse

- **WHEN** alguien crea un concierto de una banda formada en 2003 con fecha 1999
- **THEN** la API responde `400` con `CONCERT_IMPLAUSIBLE`

### Requirement: Duplicados

Antes de crear, `GET /api/concerts/candidates?artistId&date&city` SHALL devolver los conciertos confirmados o por
confirmar visibles con ese artista en el cartel y fecha a ±1 día, primero los de la misma ciudad (comparada sin
mayúsculas ni tildes), para que la persona diga "Estuve ahí" en vez de crear otro. Crear un concierto con el mismo
artista principal, la misma fecha y la misma ciudad que uno existente no oculto SHALL responder `409` con
`CONCERT_DUPLICATE` y el id existente, también con pedidos simultáneos.

#### Scenario: Candidato en otra fecha cercana

- **WHEN** existe un concierto del artista el 2009-05-16 y alguien prepara uno del 2009-05-15
- **THEN** los candidatos lo muestran con "Estuve ahí"

#### Scenario: Duplicado exacto

- **WHEN** alguien crea un concierto del mismo artista, el mismo día y en "santiago" cuando existe uno en "Santiago"
- **THEN** la API responde `409` con `CONCERT_DUPLICATE` y el id del existente

### Requirement: Confirmación

Un concierto de la comunidad SHALL pasar a confirmado cuando lo enlazan 3 personas distintas que cuentan (cuenta activa,
email verificado, al menos 7 días, sin suspensión social), contando a quien lo creó, o cuando su enlace de setlist.fm
apunta a un setlist cuyo artista coincide con uno del cartel y cuyo año coincide con el de la fecha. La confirmación SHALL
ser permanente salvo por moderación: quitar asistencias después no la deshace.

#### Scenario: Tres personas

- **WHEN** la tercera persona que cuenta dice "Estuve ahí" en un concierto por confirmar
- **THEN** el concierto pasa a confirmado y aparece en la lista pública de la pestaña

#### Scenario: Cuentas que no cuentan

- **WHEN** las otras dos asistentes tienen cuentas de un día
- **THEN** el concierto sigue por confirmar

#### Scenario: Prueba de setlist.fm

- **WHEN** se crea un concierto de Los Bunkers de 2009 con un setlist `setlist.fm/setlist/los-bunkers/2009/…`
- **THEN** nace confirmado

#### Scenario: Setlist de otro artista

- **WHEN** el enlace es `setlist.fm/setlist/otro-artista/2009/…`
- **THEN** el concierto sigue por confirmar

### Requirement: Por confirmar en la pestaña y la página

Con sesión, la pestaña Conciertos SHALL mostrar después de los confirmados una sección **Por confirmar** con los
conciertos por confirmar del artista, cuántas confirmaciones les faltan y "Estuve ahí"; sin sesión SHALL NOT mostrarse.
Su página SHALL existir solo con sesión, con un aviso de que está por confirmar y `noindex`. Un concierto por confirmar
SHALL NOT contar en ninguna cifra de personas, SHALL NOT aparecer en perfiles ajenos como concierto enlazado y SHALL NOT
mostrar quién lo registró.

#### Scenario: Anónimo

- **WHEN** una persona sin sesión abre la pestaña de un artista con un concierto por confirmar
- **THEN** no lo ve

#### Scenario: Con sesión

- **WHEN** una persona con sesión abre esa pestaña
- **THEN** ve "Por confirmar" con "Faltan 2 confirmaciones" y "Estuve ahí"

### Requirement: Registrado por

Un concierto de la comunidad confirmado SHALL mostrar en su página "Registrado por @usuario" de forma discreta, si la
cuenta de quien lo creó está activa y quien mira puede ver su perfil. Un concierto de MusicBrainz SHALL NOT mostrar
creador. No SHALL existir un conteo, ranking ni insignia de conciertos registrados.

#### Scenario: Confirmado

- **WHEN** un concierto creado por @ana se confirma
- **THEN** su página dice "Registrado por @ana"

#### Scenario: Cuenta eliminada

- **WHEN** la cuenta que lo creó se elimina
- **THEN** el concierto sigue y no muestra creador

### Requirement: Compartir un recuerdo

En Mis conciertos, un recuerdo sin enlazar con fecha completa, ciudad y país SHALL ofrecer "Compartir este concierto",
que abre la creación con sus datos y su artista. Al crear, ese recuerdo SHALL quedar enlazado al concierto nuevo, sin
crear otro.

#### Scenario: Compartir

- **WHEN** una persona comparte su recuerdo de Kuervos del Sur del 2019-03-30 en Curicó, Chile
- **THEN** se crea el concierto por confirmar y su recuerdo queda enlazado

### Requirement: Agregar a MusicBrainz

La página de un concierto de la comunidad confirmado SHALL ofrecer, con sesión, un enlace "Agregar a MusicBrainz" al
formulario de alta de eventos de MusicBrainz precargado con su nombre, el tipo concierto, la fecha y, si tiene, el enlace
del setlist como fuente. El servidor SHALL NOT enviar datos a MusicBrainz. Un concierto por confirmar o de MusicBrainz
SHALL NOT ofrecerlo.

#### Scenario: Concierto confirmado

- **WHEN** una persona con sesión abre un concierto de la comunidad confirmado
- **THEN** ve "Agregar a MusicBrainz", que abre el formulario de MusicBrainz con el nombre y la fecha ya escritos

#### Scenario: Por confirmar

- **WHEN** el concierto está por confirmar
- **THEN** no se ofrece el enlace

