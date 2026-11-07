# tier-laminas Specification

## Purpose
Dejar que una persona reparta discos en seis niveles, S a E (los tramos de la escala de la casa), para mostrar y compartir su gusto: modelo sobre `user_list`, prellenado desde la discografía de un artista, editor accesible con teclado y toque, bandeja que solo ve su dueño y página pública. Es una Lámina de autor que nunca escribe valoraciones (`docs/05-features/sharing.md` §4.3, D8).
## Requirements
### Requirement: Tier list
Una persona con sesión SHALL poder crear una tier list de álbumes con título, seis niveles en orden fijo (S, A, B, C, D y E) y una bandeja
"Sin escuchar / sin valorar". Cada disco SHALL estar en un nivel o en la bandeja, sin repetidos, con un orden dentro de cada uno. Una tier list
SHALL tener como máximo 50 discos, contando la bandeja.

#### Scenario: Disco repetido
- **WHEN** una persona intenta agregar un disco que ya está en su tier list
- **THEN** la tier list no cambia

#### Scenario: Tipo equivocado
- **WHEN** una persona intenta crear una tier list de canciones en esta fase
- **THEN** la API responde `400` con `VALIDATION_ERROR`

#### Scenario: Nivel fuera de rango
- **WHEN** se intenta guardar un ítem con nivel 6
- **THEN** la base lo rechaza con su `CHECK`

### Requirement: Etiquetas de nivel
Cada nivel SHALL tener una etiqueta editable de 1 a 12 caracteres, sin espacios a los costados; por defecto, S, A, B, C, D y E. La cantidad de
niveles SHALL ser 6. Cambiar la etiqueta SHALL NOT cambiar el color del nivel, que es el de su tramo de la escala de la casa.

#### Scenario: Renombrar un nivel
- **WHEN** el dueño renombra el nivel S como "Dios"
- **THEN** la tier list muestra "Dios" en el primer nivel, con el color del tramo 91–100

#### Scenario: Etiqueta vacía
- **WHEN** el dueño intenta guardar una etiqueta vacía o de 13 caracteres
- **THEN** la API responde `400` con `VALIDATION_ERROR` y la base lo rechaza también con su `CHECK`

### Requirement: Prellenado desde la discografía de un artista
Al crear una tier list desde la discografía de un artista, el sistema SHALL tomar los discos de su sección principal, por año, y poner cada uno en
el nivel del tramo de la nota del dueño (la nota detallada si existe; si no, el tramo de sus estrellas): 91–100 en S, 81–90 en A, 71–80 en B,
61–70 en C, 41–60 en D y 1–40 en E. Los discos sin valorar SHALL ir a la bandeja. Con más de 50 discos, SHALL entrar primero los valorados. La tier
list SHALL nacer privada. Un artista sin discos principales SHALL responder `400` con `VALIDATION_ERROR`.

#### Scenario: Discografía valorada a medias
- **WHEN** una persona valoró un disco con 95, otro con 4★ y no valoró un tercero, y crea la tier list de ese artista
- **THEN** el primero queda en S, el segundo en B y el tercero en la bandeja, y la tier list es privada

#### Scenario: Secciones extra
- **WHEN** el artista tiene discos en vivo y recopilaciones
- **THEN** no entran en la tier list

### Requirement: La tier list no escribe valoraciones
Mover un disco entre niveles, a la bandeja o quitarlo SHALL NOT crear, cambiar ni borrar ninguna valoración. Cambiar después una valoración SHALL
NOT mover ningún disco de una tier list ya creada.

#### Scenario: Subir un disco
- **WHEN** el dueño mueve de A a S un disco que valoró con 85
- **THEN** su valoración sigue en 85

#### Scenario: Nota cambiada después
- **WHEN** el dueño cambia de 85 a 95 la nota de un disco que está en A
- **THEN** el disco sigue en A

### Requirement: Guardar la disposición
`PUT /api/me/laminas/<id>/tiers` SHALL recibir los seis niveles y la bandeja como listas de ids de ítem y guardarlos en una sola transacción. Si
no traen exactamente los ítems de la tier list, SHALL responder `400` con `VALIDATION_ERROR` sin cambiar nada. Solo el dueño SHALL poder hacerlo;
para otra persona, la tier list no existe (`404`).

#### Scenario: Mover y guardar
- **WHEN** el dueño manda la disposición con un disco pasado de la bandeja a C
- **THEN** el disco queda en C, al final, y lo demás no cambia

#### Scenario: Disposición vieja
- **WHEN** el dueño manda una disposición que omite un disco de la tier list
- **THEN** la respuesta es `400` con `VALIDATION_ERROR` y nada cambia

### Requirement: Editor accesible
`/me/laminas/<id>` SHALL mostrar una tier list con sus seis niveles y la bandeja, y permitir mover cada disco a otro nivel, a la bandeja o de lugar
dentro de su nivel de dos maneras: arrastrando y soltando, y con un menú "Mover a…" en cada disco, operable con teclado y con toque. Después de
mover, el foco SHALL seguir en el disco y un aviso SHALL decir dónde quedó. El editor SHALL permitir quitar discos y editar título, etiquetas,
audiencia y notas. El dueño SHALL ver su nota real de cada disco, discreta; el editor SHALL NOT permitir cambiarla.

#### Scenario: Mover con el teclado
- **WHEN** el dueño enfoca un disco, abre "Mover a…" con Enter y elige S
- **THEN** el disco pasa al final de S, conserva el foco, se anuncia "Movido a S" y la disposición se guarda

#### Scenario: Mover con el dedo a 375 px
- **WHEN** el dueño toca un disco en la bandeja y elige B en el menú
- **THEN** el disco pasa a B, sin arrastrar

#### Scenario: Arrastrar
- **WHEN** el dueño arrastra un disco y lo suelta sobre otro disco de A
- **THEN** queda en A justo antes de ese disco

### Requirement: Página pública de una tier list
`/users/<usuario>/laminas/<id>` SHALL mostrar una tier list con sus seis niveles, vacíos incluidos, sus etiquetas y sus discos enlazados, según su
audiencia, sin sesión si es pública. La bandeja SHALL NOT mostrarse a nadie más que al dueño en su editor. Una tier list que el visitante no puede
ver, oculta por moderación o de una cuenta desactivada SHALL responder `404`.

#### Scenario: Tier list pública sin sesión
- **WHEN** un visitante sin sesión abre una tier list pública
- **THEN** ve los seis niveles con sus discos y el botón Compartir, y no ve la bandeja

#### Scenario: Tier list privada
- **WHEN** otra persona abre la tier list privada de alguien
- **THEN** la respuesta es `404`

### Requirement: Notas de una tier list
Una tier list SHALL nacer con las notas apagadas. Encendidas, la página SHALL mostrar a quien pueda verla la nota vigente de cada disco, discreta,
como una insignia chica sobre su carátula (tocar el disco lleva a su página, así que la nota no puede depender de tocarlo), y la imagen SHALL
llevarla; un disco sin valorar SHALL ir sin nota. Apagadas, ni la página ni la imagen SHALL
mostrar ninguna nota.

#### Scenario: Notas apagadas
- **WHEN** un anónimo abre una tier list pública con las notas apagadas
- **THEN** no ve ninguna nota, ni en la página ni en la imagen

#### Scenario: Notas encendidas
- **WHEN** el dueño enciende las notas y un disco de S está valorado con 96
- **THEN** quien pueda ver la tier list ve 96 sobre ese disco

### Requirement: Tier list entre las Láminas
Una tier list SHALL listarse en `/me/laminas` junto a las Láminas Top N, con su tipo a la vista, y SHALL quedar fuera de las superficies de listas
como ellas. Una tier list nueva con al menos un disco en un nivel SHALL entrar al feed con la entrada de las Láminas, con su audiencia y sus
exclusiones. Su exportación, su moderación y el borrado con la cuenta SHALL seguir las reglas de las Láminas.

#### Scenario: Mis listas
- **WHEN** una persona con una tier list abre `/me/lists`
- **THEN** la tier list no aparece

#### Scenario: Feed
- **WHEN** una persona hace pública una tier list con discos en niveles
- **THEN** sus seguidores ven la entrada de la Lámina en el feed

#### Scenario: Solo bandeja
- **WHEN** una tier list pública tiene todos sus discos en la bandeja
- **THEN** no entra al feed

