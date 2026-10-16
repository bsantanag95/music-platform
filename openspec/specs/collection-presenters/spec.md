# collection-presenters Specification

## Purpose
Cómo se explica cada colección generada en su detalle (ADR 0039): un presentador por plantilla que devuelve un contexto declarativo (resumen, enlace, cartela por disco, grupos y numeración) como referencias a mensajes que se traducen al presentar; registro con caída plantilla → familia → vacío, grupos como partición, y un presentador propio para cada plantilla (Premios, Novedades esenciales, Lo que viene, aniversarios, un género por eras, un disco por década y los dos rankings de la comunidad), con las familias como respaldo.
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

### Requirement: Presentador de Lo que viene

El presentador de `upcoming` SHALL resumir el rango real de fechas de los discos que muestra, SHALL describir cada disco
con una cartela de cuenta regresiva respecto de hoy y su fecha corta, y SHALL agruparlos por mes de lanzamiento, del mes
más cercano al más lejano. La cartela SHALL decir "Sale hoy" y "Sale mañana" para los dos primeros días, "Sale en N días"
hasta las dos semanas y "Sale en N semanas" desde ahí. Un disco cuya fecha ya pasó SHALL describirse con la cartela de pasado
("Hace N días") y SHALL NOT mostrar un número negativo. Los discos sin fecha completa SHALL ir en el grupo final sin
encabezado.

#### Scenario: Cuenta regresiva

- **WHEN** un disco sale dentro de 9 días, el 24 de octubre
- **THEN** su cartela dice "Sale en 9 días · 24 oct"

#### Scenario: Mañana y hoy

- **WHEN** un disco sale mañana y otro hoy
- **THEN** sus cartelas dicen "Sale mañana" y "Sale hoy"

#### Scenario: Ya salió

- **WHEN** un disco de la colección salió hace 3 días, después de que se generó
- **THEN** su cartela dice "Hace 3 días" y no un número negativo

#### Scenario: Meses del más cercano al más lejano

- **WHEN** hay discos de octubre, noviembre y enero
- **THEN** se muestran en tres grupos con encabezado, de octubre a enero

#### Scenario: Sin ventana inventada

- **WHEN** se muestra el resumen de Lo que viene
- **THEN** dice el rango real de fechas de los discos mostrados y no afirma una ventana de días

### Requirement: Presentador de aniversarios

El presentador de `anniversaries` SHALL resumir el mes de su período y el rango de años que cumplen los discos, y SHALL
describir cada disco con la edad que cumple en el **año de su período** y su fecha completa de lanzamiento. Un disco sin
fecha completa, o sin años cumplidos en ese año, SHALL mostrar su año de lanzamiento. Si el período no se puede
interpretar, SHALL abstenerse.

#### Scenario: Edad según el período

- **WHEN** se abre la colección archivada de septiembre de 2025 con un disco lanzado el 5 sep 1975
- **THEN** su cartela dice "Cumple 50 años · 5 sep 1975" y no la edad de hoy

#### Scenario: Resumen

- **WHEN** se abre la colección de octubre de 2026 con discos que cumplen entre 10 y 70 años
- **THEN** el resumen nombra octubre de 2026 y el rango de 10 a 70 años

#### Scenario: Período ilegible

- **WHEN** el período de la colección no tiene la forma `AAAA-MM`
- **THEN** el presentador se abstiene y el detalle usa el de la familia

### Requirement: Presentador de un género por eras

El presentador de `genre-spotlight` SHALL resumir la regla de la colección: un disco por cada era de `ERA_YEARS` años del
género de su período, del más antiguo al más reciente, y SHALL describir cada disco con la era que representa y su año
("Era 1990–1994 · 1992"). El nombre del género SHALL salir del catálogo de familias de géneros en el idioma activo. Si el
período no trae una familia conocida, SHALL abstenerse.

#### Scenario: Era del disco

- **WHEN** un disco de 1992 está en la colección de una familia con eras de 5 años
- **THEN** su cartela dice "Era 1990–1994 · 1992"

#### Scenario: Género en el idioma activo

- **WHEN** se abre la colección de la familia `punk` en español y en inglés
- **THEN** el resumen nombra el género en cada idioma

#### Scenario: Familia desconocida

- **WHEN** el período apunta a una familia que ya no existe en la taxonomía
- **THEN** el presentador se abstiene y el detalle usa el de la familia

### Requirement: Presentador de un disco por década

El presentador de `one-per-decade` SHALL resumir la regla de la colección (el disco más destacado de cada década, de la
más reciente a la más antigua) y SHALL describir cada disco con su década y su año ("Década de 1990 · 1994", "1990s ·
1994" en inglés). Un disco sin año SHALL quedar sin cartela.

#### Scenario: Década del disco

- **WHEN** un disco de 1994 está en la colección
- **THEN** su cartela dice "Década de 1990 · 1994" en español y "1990s · 1994" en inglés

#### Scenario: Sin año

- **WHEN** un disco no tiene año de lanzamiento
- **THEN** no lleva cartela

### Requirement: Presentador de mejor valorados del trimestre

El presentador de `top-rated-quarter` SHALL resumir el trimestre de su período y el mínimo de valoraciones exigido, SHALL
describir cada disco con su valoración promedio y su número de valoraciones **de ese trimestre** ("★ 4,5 · 12
valoraciones") y SHALL numerar los discos. El promedio SHALL mostrarse con un decimal y el separador del idioma activo.
Un disco sin valoraciones en el trimestre SHALL quedar sin cartela. Si el período no se puede interpretar, SHALL
abstenerse.

#### Scenario: Cifra del trimestre

- **WHEN** un disco recibió 12 valoraciones en el trimestre con promedio 4,5
- **THEN** su cartela dice "★ 4,5 · 12 valoraciones" en español y "★ 4.5 · 12 valoraciones" en inglés

#### Scenario: Una valoración

- **WHEN** el conteo es 1
- **THEN** la cartela dice "valoración" en singular

#### Scenario: Solo el período del ranking

- **WHEN** un disco tiene valoraciones de otros trimestres
- **THEN** la cartela cuenta solo las del trimestre de la colección

#### Scenario: Numeración

- **WHEN** se abre la colección
- **THEN** las carátulas llevan número de orden

### Requirement: Toda plantilla tiene presentador propio

Toda plantilla del registro de plantillas SHALL tener un presentador propio en el registro de presentadores. El presentador
de familia SHALL seguir existiendo como respaldo para colecciones cuya plantilla fue retirada del registro.

#### Scenario: Cobertura del registro

- **WHEN** se revisa el registro de presentadores
- **THEN** cada clave de `COLLECTION_TEMPLATES` tiene su presentador

#### Scenario: Plantilla retirada

- **WHEN** una colección conserva la clave de una plantilla que ya no existe
- **THEN** se presenta con el presentador de su familia

### Requirement: Presentador de lo más popular del mes

El presentador de `popular-month` SHALL resumir el mes de su período, SHALL numerar los discos y SHALL describir cada disco con su
número de personas del mes ("12 personas") solo cuando alcanza 5; por debajo el disco SHALL ir sin cartela. Si el período no se puede
interpretar, SHALL abstenerse.

#### Scenario: Personas del mes

- **WHEN** un disco tuvo 12 personas distintas con algún gesto en el mes
- **THEN** su cartela dice "12 personas"

#### Scenario: Pocas personas

- **WHEN** un disco tuvo 3 personas en el mes
- **THEN** aparece numerado sin cartela

#### Scenario: Período ilegible

- **WHEN** el período de la colección no es un mes válido
- **THEN** el presentador se abstiene y la colección cae al presentador de su familia

