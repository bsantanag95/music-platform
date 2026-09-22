# profile-personal-info Specification

## Purpose
TBD - created by archiving change profile-personal-info. Update Purpose after archive.
## Requirements
### Requirement: País del perfil

El sistema SHALL permitir que una persona elija su país de una lista cerrada de países (códigos ISO
3166-1 de dos letras). El campo SHALL ser opcional, estar vacío por defecto y poder vaciarse. El
sistema SHALL rechazar un valor fuera de la lista (incluido un texto libre, un código en minúsculas o
un nombre de país) con un error de validación localizado, sin modificar los datos. El país SHALL
mostrarse con su nombre en el idioma de quien mira el perfil, y el sistema SHALL NOT mostrar banderas
emoji. Como la lista tiene cientos de países, el editor SHALL ofrecerla con un buscador que filtra
mientras se escribe (sin distinguir mayúsculas ni tildes) y que se puede usar con teclado, con el
mismo comportamiento que el selector de zona horaria.

#### Scenario: Elegir un país

- **WHEN** el dueño elige Chile en el selector de país y guarda
- **THEN** el perfil guarda el código `CL` y lo muestra como «Chile»
- **AND** un perfil con el código `ES` se muestra como «España» a quien lo abre en español y como
  «Spain» a quien lo abre en inglés

#### Scenario: Buscar un país

- **WHEN** el dueño abre el selector de país y escribe "mexico" (o "méxico", en cualquier mayúscula)
- **THEN** la lista se reduce a los países cuyo nombre coincide y se anuncia cuántos hay

#### Scenario: País fuera de la lista

- **WHEN** un cliente envía `Chile`, `cl` o `ZZ` como país
- **THEN** la API responde con un error de validación y el país anterior no cambia

#### Scenario: Quitar el país

- **WHEN** el dueño elige «Sin país» y guarda
- **THEN** el perfil deja de mostrar un país y no deja hueco

### Requirement: Ciudad o región

El sistema SHALL mantener la ubicación del perfil como un texto libre de hasta 80 caracteres que
representa la ciudad o región, opcional y vaciable, y SHALL etiquetarlo como «Ciudad o región». Los
valores de ubicación guardados antes de este cambio SHALL conservarse sin modificarlos y mostrarse
como la ciudad o región. El sistema SHALL NOT intentar deducir el país a partir de ese texto.

#### Scenario: Guardar la ciudad

- **WHEN** el dueño escribe "Valparaíso" en Ciudad o región y guarda
- **THEN** el perfil guarda el texto y lo muestra junto al país, si lo hay

#### Scenario: Ubicación anterior

- **WHEN** se aplica este cambio sobre un perfil con la ubicación "Santiago, Chile"
- **THEN** el texto se conserva tal cual como ciudad o región y el país queda vacío

#### Scenario: Texto demasiado largo

- **WHEN** un cliente envía una ciudad de 81 caracteres
- **THEN** la API responde con un error de validación y el valor anterior no cambia

### Requirement: Pronombres

El sistema SHALL permitir que una persona elija sus pronombres de una lista cerrada (`he`, `she`,
`they`) o escriba los suyos como «Otro» en un texto libre de hasta 40 caracteres, o no especificar
ninguno. Las claves SHALL mostrarse localizadas en el idioma de quien mira el perfil: «él», «ella» y
«elle» en español, «he/him», «she/her» y «they/them» en inglés. Una persona SHALL tener a lo sumo una
de las tres formas (de la lista, «Otro» o ninguna): elegir una SHALL reemplazar a la anterior. El
sistema SHALL rechazar una clave fuera de la lista, un «Otro» vacío o de más de 40 caracteres, o una
combinación de lista y texto libre, con un error de validación localizado y sin modificar los datos.
Los pronombres escritos como texto libre antes de este cambio SHALL conservarse y tratarse como
«Otro».

#### Scenario: Elegir de la lista

- **WHEN** el dueño elige «Ella» y guarda
- **THEN** el perfil guarda la clave `she`, borra cualquier texto libre anterior y muestra «ella» a
  quien lo abre en español y «she/her» a quien lo abre en inglés

#### Scenario: Escribir otros

- **WHEN** el dueño elige «Otro», escribe "ellx" y guarda
- **THEN** el perfil guarda el texto, deja la lista sin valor y muestra «ellx»

#### Scenario: Otro vacío

- **WHEN** un cliente envía «Otro» sin texto
- **THEN** la API responde con un error de validación y los pronombres anteriores no cambian

#### Scenario: Clave desconocida

- **WHEN** un cliente envía `xe` como pronombre de la lista
- **THEN** la API responde con un error de validación

#### Scenario: Quitar los pronombres

- **WHEN** el dueño elige «Sin especificar» y guarda
- **THEN** el perfil no muestra pronombres, ni de la lista ni libres

#### Scenario: Pronombres libres anteriores

- **WHEN** se aplica este cambio sobre un perfil cuyos pronombres eran el texto "she/they"
- **THEN** el texto se conserva, el editor lo muestra como «Otro» y el perfil lo sigue mostrando igual

### Requirement: Ejemplo de los pronombres en el editor

El editor SHALL mostrar, junto al selector de pronombres, una frase de ejemplo rotulada «Ejemplo» que
cambia en vivo con la opción elegida y usa el nombre visible de la persona. En inglés la frase SHALL
usar el posesivo que corresponde (*his*, *her* o *their*); en español, donde el posesivo no varía, SHALL
usar el sujeto que corresponde (él, ella o elle). Con «Sin especificar» y con «Otro» SHALL usar la forma
neutra. El ejemplo es una ilustración y SHALL NOT alterar los textos de la interfaz.

#### Scenario: El ejemplo cambia con la opción

- **WHEN** el dueño, con la interfaz en inglés, alterna entre «She / her» y «They / their»
- **THEN** el ejemplo pasa de «Ana added Pride to her want-to-listen list» a «Ana added Pride to their
  want-to-listen list»

#### Scenario: Ejemplo en español

- **WHEN** el dueño, con la interfaz en español, elige «Ella»
- **THEN** el ejemplo muestra el sujeto «Ella» en la frase

#### Scenario: Sin pronombres

- **WHEN** el dueño elige «Sin especificar»
- **THEN** el ejemplo usa la forma neutra y lo indica

#### Scenario: Los textos de la interfaz no cambian

- **WHEN** una persona elige «Ella» como pronombres
- **THEN** los textos de la interfaz que hablan de ella siguen siendo los mismos que para cualquier otra
  persona

### Requirement: Visibilidad de los datos personales según el acceso al perfil

El país, la ciudad o región y los pronombres SHALL mostrarse y entregarse únicamente a quien tiene
acceso al perfil: el dueño, cualquier visitante de un perfil público y un seguidor aprobado de un perfil
privado. A un visitante sin acceso a un perfil privado (anónimo, sin relación aceptada o con solicitud
pendiente) el sistema SHALL NOT mostrarlos ni incluirlos en los datos que entrega a la vista del
perfil. La bio, los enlaces, el nombre visible, el usuario y los contadores SHALL seguir el criterio de
`social-profiles`. Esta regla SHALL aplicarse en un solo punto del servicio que arma la vista del
perfil, de modo que ninguna superficie que la consuma los reciba sin acceso.

#### Scenario: Perfil público

- **WHEN** un visitante abre un perfil público con país, ciudad y pronombres
- **THEN** ve los tres en la Placa

#### Scenario: Perfil privado sin acceso

- **WHEN** un visitante anónimo abre un perfil privado con país, ciudad y pronombres
- **THEN** ve el nombre, los contadores y la bio, pero no el país, la ciudad ni los pronombres, y estos
  datos no viajan en el HTML ni en el payload de la página

#### Scenario: Seguidor aprobado

- **WHEN** un seguidor aprobado abre ese perfil privado
- **THEN** ve el país, la ciudad y los pronombres

#### Scenario: El dueño

- **WHEN** el dueño abre su propio perfil privado
- **THEN** ve los tres, y "Ver cómo te ven" le muestra lo que ve un visitante sin acceso, sin ellos

#### Scenario: Solicitud pendiente

- **WHEN** alguien con una solicitud de seguimiento pendiente abre ese perfil privado
- **THEN** no ve el país, la ciudad ni los pronombres

### Requirement: Cómo se muestran en la Placa

La Placa SHALL mostrar los pronombres como una etiqueta pequeña junto al nombre y la ubicación al
inicio de la línea de datos, como «Ciudad, País» seguida de «Miembro desde…» y de la hora local si
corresponde. Cuando falte alguno de los datos SHALL omitirse sin dejar separadores ni huecos: con solo
país se muestra el país, con solo ciudad se muestra la ciudad. Un perfil sin ninguno de los tres SHALL
verse igual que antes de este cambio.

#### Scenario: Ciudad y país

- **WHEN** el perfil tiene la ciudad "Santiago" y el país `CL`
- **THEN** la línea de datos comienza con «Santiago, Chile · Miembro desde …»

#### Scenario: Solo país

- **WHEN** el perfil tiene país pero no ciudad
- **THEN** la línea muestra solo el país, sin coma ni separador sobrante

#### Scenario: Sin datos personales

- **WHEN** el perfil no tiene país, ciudad ni pronombres
- **THEN** la Placa muestra lo mismo que antes de este cambio, sin etiqueta ni hueco

#### Scenario: Pronombres junto al nombre

- **WHEN** el perfil tiene los pronombres «ella»
- **THEN** la Placa muestra la etiqueta «ella» junto al nombre

### Requirement: Editar los datos personales

La persona SHALL poder editar el país, la ciudad o región y los pronombres desde la pantalla Perfil de
Ajustes y desde el modo edición de su propio perfil, con el mismo editor de identidad en ambos lugares y
con estados de carga, éxito y error recuperable. El editor SHALL indicar junto a estos campos quién los
ve («Solo lo ven quienes pueden ver tu perfil») y SHALL renderizarse únicamente en vistas del dueño.
Ninguno de estos datos SHALL pedirse durante el registro de una cuenta.

#### Scenario: Editar desde Ajustes

- **WHEN** la persona elige un país y unos pronombres en la pantalla Perfil y guarda
- **THEN** los cambios se persisten y su perfil los muestra

#### Scenario: Editar desde el modo edición

- **WHEN** la persona activa el modo edición y abre el editor de la Placa
- **THEN** ve el mismo editor y el cambio se refleja en la Placa sin recargar

#### Scenario: Error recuperable

- **WHEN** falla una petición de guardado
- **THEN** el editor muestra un error localizado, conserva lo elegido y permite reintentar

#### Scenario: El registro no los pide

- **WHEN** una persona abre el formulario de registro
- **THEN** solo se le piden usuario, email y contraseña

#### Scenario: Un visitante no ve el editor

- **WHEN** un visitante que no es el dueño abre el perfil
- **THEN** no ve ningún control de edición de estos datos

### Requirement: Exportación y borrado de los datos personales

El país y los pronombres (tanto la clave de la lista como el texto de «Otro») SHALL incluirse en la
exportación de datos de la persona, junto con la ciudad o región. Eliminar la cuenta SHALL borrarlos
junto con el resto de sus datos. Desactivar la cuenta SHALL conservarlos y dejar de mostrarlos como el
resto del perfil.

#### Scenario: Exportar

- **WHEN** una persona con país `CL`, ciudad "Santiago" y pronombres `she` descarga sus datos
- **THEN** el archivo incluye esos tres valores en su cuenta

#### Scenario: Eliminar la cuenta

- **WHEN** la persona elimina su cuenta
- **THEN** no queda ninguna fila con su país, ciudad ni pronombres

#### Scenario: Desactivar la cuenta

- **WHEN** la persona desactiva su cuenta
- **THEN** sus datos personales se conservan y no se muestran a nadie, y al reactivarla vuelven a
  mostrarse

### Requirement: Datos personales que no se piden

El sistema SHALL NOT ofrecer ni almacenar el año o la fecha de nacimiento, el género ni el nombre y el
apellido como campos separados. El nombre de la persona SHALL seguir siendo el único campo libre
«Nombre visible». La API de edición del perfil SHALL NOT aceptar esos datos. La edad mínima para usar la
plataforma SHALL fijarse en los Términos del servicio y no se verifica ni se pregunta.

#### Scenario: La API no acepta datos de nacimiento ni de género

- **WHEN** un cliente envía `birthYear`, `birthDate` o `gender` a la edición del perfil
- **THEN** la API responde con un error de validación y no guarda nada

#### Scenario: Nombre y apellido separados

- **WHEN** un cliente envía `firstName` o `lastName` a la edición del perfil
- **THEN** la API responde con un error de validación y no guarda nada

#### Scenario: Un solo nombre visible

- **WHEN** la persona quiere mostrar su nombre y apellido
- **THEN** los escribe en «Nombre visible», un único campo

### Requirement: Política de privacidad de los datos personales

La política de privacidad (`/privacy`) SHALL describir los datos personales opcionales del perfil (país,
ciudad o región, pronombres, bio, zona horaria y hora local): para qué se usan, quién los ve según la
visibilidad del perfil, que nunca se piden al registrarse y cómo borrarlos (vaciando el campo o
eliminando la cuenta). SHALL declarar también que no se recogen la fecha de nacimiento, el género ni los
nombres legales, y SHALL anotar la fijación de la edad mínima en los Términos entre los puntos por definir
antes de la apertura al público. El texto SHALL estar localizado en español e inglés.

#### Scenario: La política describe los datos

- **WHEN** se abre `/es/privacy`
- **THEN** una sección explica los datos personales opcionales, quién los ve y cómo borrarlos

#### Scenario: Lo que no se recoge

- **WHEN** se abre `/en/privacy`
- **THEN** la sección dice que no se recogen la fecha de nacimiento, el género ni los nombres legales

#### Scenario: Edad mínima pendiente

- **WHEN** se abre la lista «Por definir antes de la apertura al público»
- **THEN** incluye la fijación de la edad mínima en los Términos

