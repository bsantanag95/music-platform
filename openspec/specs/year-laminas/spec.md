# year-laminas Specification

## Purpose
Mostrar el año de una persona en discos, mes por mes, con sus cifras, derivado de su diario: la respuesta de la casa al resumen anual de los servicios de streaming ("acá lo construyes", `docs/05-features/sharing.md` §4.4.1). Lo ve su dueño; una marca por año lo abre a quien pueda ver su perfil sin cambiar la audiencia de ninguna escucha, y guarda la zona horaria con la que se cuentan sus meses.
## Requirements
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

### Requirement: Top 5 del año
El año SHALL mostrar un Top 5 de discos escuchados ese año. Sin elección del dueño, SHALL prellenarse con los discos del año que el dueño valoró, de mejor a
peor nota y a igual nota por escuchas del año, completado con los más escuchados sin nota. El dueño SHALL poder elegir y ordenar de 1 a 5 discos, todos
escuchados ese año y no ocultos; otro disco SHALL responder `400` con `VALIDATION_ERROR`. Un disco guardado que deja de tener escuchas ese año o se oculta
SHALL dejar de aparecer, y el Top 5 SHALL completarse con el prellenado.

#### Scenario: Prellenado por nota
- **WHEN** el dueño valoró con 95 un disco escuchado una vez y con 80 otro escuchado diez veces
- **THEN** el de 95 va primero

#### Scenario: Elegir un disco de otro año
- **WHEN** el dueño intenta poner en su Top 5 de 2026 un disco que solo escuchó en 2025
- **THEN** la respuesta es `400` con `VALIDATION_ERROR`

#### Scenario: Volver al prellenado
- **WHEN** el dueño borra su Top 5 guardado
- **THEN** el año muestra el prellenado

### Requirement: Ocultar discos del año
El dueño SHALL poder ocultar un disco con escuchas en ese año y volver a mostrarlo. Un disco oculto SHALL NOT aparecer en el calendario, el Top 5 ni la
imagen, y sus escuchas SHALL NOT contar en las cifras (escuchas, discos, discos nuevos, artistas descubiertos). Ocultar SHALL NOT cambiar el diario. El
dueño SHALL ver sus ocultos aparte; nadie más SHALL saber que existen.

#### Scenario: Ocultar un disco
- **WHEN** el dueño oculta un disco que escuchó tres veces en marzo
- **THEN** marzo ya no lo muestra, las escuchas del año bajan en tres y un anónimo no ve rastro de él

#### Scenario: Volver a mostrar
- **WHEN** el dueño vuelve a mostrar ese disco
- **THEN** reaparece en marzo y en las cifras

#### Scenario: Disco sin escuchas ese año
- **WHEN** el dueño intenta ocultar un disco que no escuchó ese año
- **THEN** la respuesta es `400` con `VALIDATION_ERROR`

### Requirement: Edición del año en su página
Para el dueño, la página del año SHALL permitir cambiar y ordenar el Top 5 con controles operables con teclado y toque, ocultar un disco desde el
calendario y volver a mostrar los ocultos. Nadie más SHALL ver esos controles.

#### Scenario: Ordenar con teclado
- **WHEN** el dueño sube con el teclado el tercer disco de su Top 5
- **THEN** pasa al segundo lugar y se guarda

### Requirement: Arma la tuya en un año
El año de otra persona SHALL ofrecer "Arma la tuya" a quien no es su dueño. Con sesión SHALL llevar a `/users/<yo>/year/<año>` del mismo año. Sin sesión SHALL
llevar al registro, con enlace al login, con la intención `anio=<año>`; después de registrarse o de iniciar sesión, con contraseña o con Google, la persona SHALL
llegar a su año de ese mismo año. El destino SHALL armarse en el código con el usuario autenticado; un valor que no sea un año entre 2000 y 2100 SHALL
descartarse. Si llegan varias intenciones, SHALL mandar la de Lámina y después la de discografía.

#### Scenario: Visitante anónimo
- **WHEN** una persona sin sesión abre el 2026 compartido de otra
- **THEN** ve el llamado que lleva al registro con `anio=2026`

#### Scenario: Registro con la intención
- **WHEN** una persona se registra desde `/auth/register?anio=2026`
- **THEN** llega a `/<locale>/users/<su-usuario>/year/2026`, no a `/welcome`

#### Scenario: Valor inválido
- **WHEN** una persona abre el registro con `anio=1850` o `anio=abc`
- **THEN** la intención se descarta y el registro sigue su curso normal

#### Scenario: Dueño
- **WHEN** el dueño abre su año
- **THEN** no ve el llamado

### Requirement: Año propio sin escuchas
El dueño que abre un año entre 2000 y el año en curso sin escuchas en ese año SHALL ver su página con un estado vacío que explica que el año sale de su
diario y enlaza a registrar una escucha, sin compartir ni Top 5. Para cualquier otra persona SHALL seguir respondiendo 404, igual que un año futuro.

#### Scenario: Recién registrada
- **WHEN** una persona sin escuchas llega a su 2025 desde "Arma la tuya"
- **THEN** ve el estado vacío con el enlace al diario

#### Scenario: Otra persona
- **WHEN** alguien abre el 2025 sin escuchas de otra persona
- **THEN** recibe 404

