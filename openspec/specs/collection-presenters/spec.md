# collection-presenters Specification

## Purpose
Cómo se explica cada colección generada en su detalle (ADR 0039): un presentador por plantilla que devuelve un contexto declarativo (resumen, enlace, cartela por disco, grupos y numeración) como referencias a mensajes que se traducen al presentar; registro con caída plantilla → familia → vacío, grupos como partición, y los casos de Premios, las familias y Novedades esenciales.
## Requirements
### Requirement: Contrato de contexto de una colección

Cada colección generada SHALL poder explicarse en su detalle con un **contexto** declarativo que describe: una frase
de resumen para la cabecera, un enlace opcional, una cartela por disco, una partición opcional de los discos en
grupos y si se numeran. El contexto SHALL expresarse con **referencias a mensajes** (clave y parámetros), no con texto
ya traducido, y SHALL NOT guardarse en la base: se calcula al leer. El contexto SHALL NOT poder elegir los discos de la
colección, cambiar su orden ni describir componentes de interfaz.

#### Scenario: Contexto como datos

- **WHEN** un presentador produce la cartela de un disco
- **THEN** devuelve una clave de mensaje y sus parámetros, y el texto del idioma activo se obtiene al presentar

#### Scenario: Sin persistencia

- **WHEN** se abre el detalle de una colección
- **THEN** su contexto se calcula en esa petición y no se escribe nada en la base

#### Scenario: El contexto no elige discos

- **WHEN** un presentador describe una colección
- **THEN** los discos y su orden son los de la lista generada por la plantilla, sin cambios

### Requirement: Registro de presentadores con caída

El sistema SHALL resolver el contexto de una colección con un registro de presentadores por plantilla (`template_key`)
y SHALL caer, en este orden, al presentador de su **familia** y, si tampoco lo hay, a un contexto vacío. Un
presentador SHALL poder **abstenerse**, y entonces la resolución SHALL continuar con el siguiente nivel. Toda clave de
plantilla del registro de presentadores SHALL existir en el registro de plantillas, y toda familia SHALL tener
presentador.

#### Scenario: Presentador de la plantilla

- **WHEN** existe un presentador para `new-releases`
- **THEN** su contexto se usa en lugar del de la familia `releases`

#### Scenario: Plantilla sin presentador

- **WHEN** una plantilla no tiene presentador propio
- **THEN** se usa el de su familia, con el mismo resultado visible que antes de existir los presentadores

#### Scenario: Presentador que se abstiene

- **WHEN** el presentador de Premios no encuentra la ceremonia del período
- **THEN** la resolución cae al presentador de la familia en lugar de mostrar un contexto incompleto

#### Scenario: Plantilla retirada

- **WHEN** una colección conserva una clave de plantilla que ya no existe en el registro de plantillas
- **THEN** se presenta con el presentador de su familia

### Requirement: Localización al presentar

El texto de un contexto SHALL obtenerse al presentar, con la traducción del grupo `catalog.explore.collectionContext`
del idioma activo, y las fechas SHALL formatearse en UTC con el idioma activo. Toda clave que emita un presentador
SHALL existir en los catálogos de español y de inglés. Una referencia cuya clave no exista SHALL omitirse y SHALL NOT
mostrarse como clave cruda.

#### Scenario: Mismo contexto, dos idiomas

- **WHEN** se abre la misma colección en español y en inglés
- **THEN** la cartela y el resumen aparecen cada uno en su idioma, con las fechas formateadas en ese idioma

#### Scenario: Clave inexistente

- **WHEN** una referencia apunta a una clave que no está en el catálogo
- **THEN** esa cartela no se muestra y no aparece la clave en pantalla

#### Scenario: Fecha sin correr el día

- **WHEN** se formatea una fecha `2025-02-02` en un servidor con otra zona horaria
- **THEN** se muestra el 2 de febrero

### Requirement: Grupos como partición

Cuando un presentador agrupe los discos, los grupos SHALL ser una **partición** de los discos de la colección: cada
disco SHALL aparecer en exactamente un grupo. Los ids que no pertenezcan a la colección SHALL descartarse y los discos
que no queden en ningún grupo SHALL agruparse en un último grupo sin encabezado. Un grupo SHALL conservar el orden de
la lista dentro de sí.

#### Scenario: Disco sin grupo

- **WHEN** un presentador agrupa 10 de los 12 discos
- **THEN** los 2 restantes aparecen en un último grupo sin encabezado y ninguno se pierde

#### Scenario: Id ajeno

- **WHEN** un presentador incluye en un grupo un id que no está en la colección
- **THEN** ese id se descarta y no aparece ningún disco de más

#### Scenario: Orden dentro del grupo

- **WHEN** dos discos caen en el mismo grupo
- **THEN** conservan entre sí el orden que tenían en la lista

### Requirement: Presentador de Premios

El presentador de `grammy-winners` SHALL describir cada disco con las **categorías que ganó** (las generales primero,
hasta dos y el resto como «+N») en lugar de su año de lanzamiento, SHALL resumir la ceremonia ("Los discos ganadores de
los premios Grammy 2025, entregados el 2 de febrero de 2025"), SHALL enlazar a la página de esa ceremonia y SHALL
NOT numerar los discos. Si la ceremonia del período no está cargada, SHALL abstenerse.

#### Scenario: Categorías de un disco

- **WHEN** un disco ganó Álbum del año y Mejor álbum de country
- **THEN** su cartela dice "Álbum del año · Mejor álbum de country" en español y "Album of the Year · Best Country Album" en inglés

#### Scenario: Muchas categorías

- **WHEN** un disco ganó tres categorías
- **THEN** su cartela muestra las dos primeras y «+1»

#### Scenario: Resumen y enlace

- **WHEN** se abre la colección de los Grammy 2025
- **THEN** la cabecera dice qué ceremonia es y cuándo se entregó, y enlaza a `/awards/grammy/2025`

#### Scenario: Sin numeración

- **WHEN** se abre una colección de premios
- **THEN** las carátulas no llevan número de orden

### Requirement: Presentadores de familia

Mientras una plantilla no tenga presentador propio, el presentador de su familia SHALL producir la cartela que
hoy produce el detalle: en **efemérides**, el aniversario que cumple el disco este año con su fecha completa ("Cumple
70 años · 15 oct 1956") y, sin fecha completa o sin años cumplidos, el año; en **lanzamientos**, la fecha completa; en
**descubrimiento** y **premios**, el año de lanzamiento; en **rankings**, el año de lanzamiento y la numeración de los
discos. Ningún otro presentador de familia SHALL numerar los discos.

#### Scenario: Aniversario

- **WHEN** un disco lanzado el 15 oct 1956 está en una colección de efemérides de 2026
- **THEN** su cartela dice "Cumple 70 años · 15 oct 1956"

#### Scenario: Efemérides sin fecha completa

- **WHEN** el disco solo tiene el año de lanzamiento
- **THEN** su cartela muestra el año

#### Scenario: Rankings numerados

- **WHEN** se abre una colección de la familia rankings
- **THEN** las carátulas llevan número de orden

### Requirement: Presentador de Novedades esenciales

El presentador de `new-releases` SHALL resumir el rango **real** de los discos que muestra (la fecha de lanzamiento más
antigua y la más reciente entre los que tienen fecha completa) junto a la ventana de la plantilla, SHALL describir cada
disco con una cartela relativa a hoy y su fecha corta, y SHALL agruparlos por mes de lanzamiento, del mes más reciente
al más antiguo. La cartela SHALL decir "Hoy" y "Ayer" para los dos primeros días, "Hace N días" hasta la semana y "Hace
N semanas" desde ahí. Los discos sin fecha completa SHALL ir en el grupo final sin encabezado.

#### Scenario: Rango del resumen

- **WHEN** los discos mostrados salieron entre el 17 de julio y el 14 de octubre de 2026
- **THEN** el resumen dice "del 17 jul al 14 oct" junto a los 90 días de la ventana

#### Scenario: Cartela relativa

- **WHEN** un disco salió hace 5 días, el 9 de octubre
- **THEN** su cartela dice "Hace 5 días · 9 oct"

#### Scenario: Hoy y ayer

- **WHEN** un disco salió hoy y otro ayer
- **THEN** sus cartelas dicen "Hoy" y "Ayer"

#### Scenario: Semanas

- **WHEN** un disco salió hace 21 días
- **THEN** su cartela dice "Hace 3 semanas" con su fecha corta

#### Scenario: Agrupación por mes

- **WHEN** hay discos de octubre, de septiembre y de julio
- **THEN** se muestran en tres grupos, con encabezado de cada mes, de octubre a julio, y dentro de cada grupo en el orden de la lista

#### Scenario: Disco sin fecha completa

- **WHEN** un disco solo tiene el año de lanzamiento
- **THEN** aparece en el grupo final sin encabezado, con su año como cartela

