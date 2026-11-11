## ADDED Requirements

### Requirement: Concierto compartido

El sistema SHALL tener conciertos compartidos: un hecho con nombre, tipo (concierto o festival), fecha exacta, recinto,
ciudad, país opcional, origen (`musicbrainz` o `community`) y estado (`confirmed`, `pending` o `hidden`), con sus
artistas y el rol de cada uno (principal, telonero o invitado). Un concierto de origen MusicBrainz SHALL tener su `mbid`
único y nacer confirmado. Las superficies públicas SHALL mostrar solo conciertos confirmados y no cancelados. Estas reglas
SHALL vivir también como `CHECK` e índices en la base.

#### Scenario: Concierto de MusicBrainz

- **WHEN** se importa "M72 World Tour: Mexico City" del 2024-09-29
- **THEN** existe un concierto confirmado de origen MusicBrainz con su `mbid`, su fecha y su recinto

#### Scenario: Concierto no confirmado

- **WHEN** un concierto tiene estado `pending` u `hidden`
- **THEN** no aparece en la pestaña del artista ni tiene página pública

### Requirement: Pestaña Conciertos del artista

La página de un grupo o una persona SHALL tener la pestaña **Conciertos** (`/{locale}/artist/{id}/concerts`) con sus
conciertos confirmados y no cancelados: arriba los **Próximos** (fecha futura) y después los pasados agrupados por año,
del más reciente al más antiguo, 50 por página con `?pagina=`. Cada fila SHALL mostrar la fecha, el nombre, el recinto y
la ciudad, la marca **Festival** si lo es, cuántas personas estuvieron y la acción "Estuve ahí" (o "Estuviste" si ya
está), y enlazar a la página del concierto. Sin conciertos SHALL mostrar un estado vacío que invite a registrarlo en Mis
conciertos. Para artistas de otro tipo la URL SHALL responder 404.

#### Scenario: Artista con conciertos

- **WHEN** una persona abre la pestaña Conciertos de Metallica
- **THEN** ve los próximos arriba y los pasados por año, cada uno con fecha, nombre, recinto y ciudad

#### Scenario: Concierto futuro

- **WHEN** un concierto tiene fecha futura
- **THEN** aparece en Próximos sin la acción "Estuve ahí"

#### Scenario: Sin conciertos

- **WHEN** MusicBrainz no tiene eventos de Los Bunkers
- **THEN** la pestaña dice que aún no hay conciertos y enlaza a registrar uno en Mis conciertos

### Requirement: Página del concierto

Cada concierto confirmado SHALL tener una página (`/{locale}/concert/{id}`) con su nombre, fecha, recinto, ciudad y país,
la marca Festival, el cartel (principales primero, luego teloneros e invitados; enlazados al artista si está en el
catálogo, como texto si no), cuántas personas estuvieron, la lista de las que el visitante puede ver y "Estuve ahí". Un
concierto inexistente, no confirmado o cancelado SHALL responder 404.

#### Scenario: Cartel de un festival

- **WHEN** una persona abre "Vive Rock 2023"
- **THEN** ve a Chancho en Piedra, Kuervos del Sur, Pettinellis y Saiko como principales y a El Cruce como telonero, enlazados los que están en el catálogo

### Requirement: Estuve ahí

Un usuario autenticado SHALL poder decir "Estuve ahí" en un concierto confirmado, no cancelado y pasado. Si ya está
enlazado, la acción SHALL ser idempotente. Si tiene un registro personal sin enlazar del mismo artista y la misma fecha
exacta, SHALL enlazarlo en lugar de crear otro. Si no, SHALL crear un registro personal enlazado con el artista de
contexto (o el primer principal que esté en el catálogo), la fecha, el recinto, la ciudad y el país del concierto, y la
audiencia por defecto del usuario. Los datos copiados SHALL ser solo valores iniciales: actualizar el concierto SHALL NOT
modificar el registro personal. Quitar "Estuve ahí" SHALL desenlazar y SHALL borrar el registro solo si lo creó la acción
y la persona no lo editó.

#### Scenario: Sumarse

- **WHEN** una persona sin registros pulsa "Estuve ahí" en un concierto de 2023
- **THEN** se crea su registro enlazado con la fecha y el lugar del concierto y la acción pasa a "Estuviste"

#### Scenario: Ya tenía un registro

- **WHEN** la persona ya registró a mano el mismo artista en la misma fecha
- **THEN** ese registro se enlaza al concierto y no se crea otro

#### Scenario: Concierto futuro o cancelado

- **WHEN** alguien intenta "Estuve ahí" en un concierto futuro o cancelado
- **THEN** la API responde `400` con `VALIDATION_ERROR` y no se crea nada

#### Scenario: Quitar sin perder lo escrito

- **WHEN** la persona agregó una nota a su registro y después quita "Estuve ahí"
- **THEN** el registro queda, sin enlace al concierto

### Requirement: Personas que estuvieron

La cifra de un concierto SHALL contar personas distintas con un registro enlazado, de cuentas activas y con cualquier
audiencia; con menos de 5 SHALL mostrarse "Menos de 5 personas" y sin ninguna SHALL NOT mostrarse. La lista de personas
SHALL mostrar solo los registros que el visitante puede ver según la audiencia del registro y la matriz de visibilidad
del perfil (perfil privado, seguimiento y bloqueo en ambos sentidos), de cuentas activas, hasta 50 con "y N más".

#### Scenario: Pocas personas

- **WHEN** tres personas estuvieron en un concierto
- **THEN** la cifra dice "Menos de 5 personas"

#### Scenario: Registro privado

- **WHEN** una de las personas tiene su registro `private`
- **THEN** cuenta en la cifra pero no aparece en la lista de nadie más
