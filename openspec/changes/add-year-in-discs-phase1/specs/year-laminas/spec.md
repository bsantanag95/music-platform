## ADDED Requirements

### Requirement: Año en discos
`/users/<usuario>/year/<año>` SHALL mostrar el año de una persona en discos: por mes, los discos que escuchó ese mes, sin repetir dentro del mes, ordenados
por cuántas veces los escuchó ese mes y después por la primera escucha, con su carátula y enlace. Una escucha de una canción o de un artista SHALL contar en
las cifras, no en el calendario. La página SHALL NOT mostrar el texto de una escucha, su reacción ni una nota. Un año sin escuchas SHALL responder `404`.

#### Scenario: Un disco escuchado dos veces en marzo
- **WHEN** una persona escuchó un disco dos veces en marzo y otro una vez
- **THEN** marzo muestra los dos discos, primero el de dos escuchas

#### Scenario: Año sin escuchas
- **WHEN** alguien abre el año 2019 de una persona que no registró escuchas ese año
- **THEN** la respuesta es `404`

### Requirement: Cifras del año
La página SHALL mostrar las escuchas del año, los discos distintos, los discos nuevos (con una primera escucha ese año) y los artistas descubiertos: artistas
principales de los discos escuchados cuya primera escucha en la cuenta cae en ese año, según el diario. La imagen SHALL omitir las cifras en cero, salvo
las escuchas.

#### Scenario: Artista ya escuchado antes
- **WHEN** una persona escuchó un disco de un artista en 2025 y otro del mismo artista en 2026
- **THEN** ese artista no cuenta como descubierto en 2026

#### Scenario: Disco nuevo
- **WHEN** una persona registra la primera escucha de un disco en 2026
- **THEN** cuenta como disco nuevo de 2026

#### Scenario: Cifra en cero en la imagen
- **WHEN** una persona no descubrió artistas en 2026 y comparte su año
- **THEN** la página muestra 0 artistas descubiertos y la imagen omite esa cifra

### Requirement: Año en curso
El año en curso SHALL existir desde su primera escucha, marcado "hasta ahora" en la página y en la imagen. Los años pasados SHALL quedar como archivo.

#### Scenario: Año en curso
- **WHEN** el dueño abre su año en curso
- **THEN** ve su año marcado "hasta ahora"

### Requirement: Zona horaria del año
El dueño SHALL ver su año con la zona horaria de su navegador, como el diario. Para cualquier otra lectura (visitante, imagen, metadatos) SHALL usarse la
zona guardada en la marca: los mismos meses que vio el dueño al compartir.

#### Scenario: Escucha de fin de mes
- **WHEN** el dueño, en America/Santiago, registró una escucha a las 22:00 del 31 de marzo y compartió su año desde esa zona
- **THEN** un visitante la ve en marzo, no en abril

### Requirement: Visibilidad con la marca por año
Sin marca, el año SHALL verlo solo su dueño. Con la marca de ese año, SHALL verlo quien pueda ver su perfil (en un perfil privado, sus seguidores
aceptados), salvo bloqueo o cuenta desactivada. La marca SHALL NOT cambiar la audiencia de ninguna escucha. Para cualquier otra persona, un año sin marca
SHALL responder `404`.

#### Scenario: Sin marca
- **WHEN** una seguidora abre el año 2026 de Ana, que no lo compartió
- **THEN** la respuesta es `404`

#### Scenario: Con marca
- **WHEN** Ana comparte su año 2026 y un anónimo lo abre, con el perfil público
- **THEN** lo ve, incluidos los discos de escuchas privadas, y esas escuchas siguen privadas en el diario

### Requirement: Entradas al año
El diario SHALL ofrecer "Tu año en discos" del año que se mira, y `/me/laminas` SHALL listar "Tus años" con los años que tienen escuchas.

#### Scenario: Desde el diario
- **WHEN** el dueño mira su diario de 2026
- **THEN** tiene un enlace a su año 2026 en discos
