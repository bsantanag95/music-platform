## ADDED Requirements

### Requirement: Segmento público con slug e id

Las direcciones públicas de artista (`/{locale}/artist/…`), álbum (`/{locale}/album/…`), canción
(`/{locale}/song/…`), lista (`/{locale}/users/{usuario}/lists/…`) y reseña (`/{locale}/review/…`)
SHALL identificar la entidad con un segmento `<slug>-<id>`, donde `<id>` es el UUID interno
codificado según "Codificación base58 del id" y `<slug>` es texto legible derivado del nombre. El slug
SHALL ser solo decorativo: la entidad se resuelve exclusivamente por el id, no se guarda ningún slug
en la base de datos y dos entidades con el mismo nombre SHALL poder compartir slug.

#### Scenario: Dirección de artista

- **WHEN** el sistema construye el enlace del artista "Pink Floyd"
- **THEN** la dirección es `/{locale}/artist/pink-floyd-<id>` con el id de 22 caracteres

#### Scenario: Artistas homónimos

- **WHEN** existen dos artistas llamados "Nirvana"
- **THEN** ambos tienen el mismo slug `nirvana` y cada dirección se resuelve por su propio id

#### Scenario: Slug vacío

- **WHEN** el nombre de la entidad no contiene ninguna letra ni número
- **THEN** el segmento es únicamente el id, sin guion inicial

### Requirement: Codificación base58 del id

El `<id>` SHALL ser el UUID interpretado como entero de 128 bits y codificado en base58 con el
alfabeto de Bitcoin (`123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz`), relleno a la
izquierda con `1` hasta exactamente 22 caracteres, de modo que cada UUID tenga una única
representación. La decodificación SHALL aceptar solo cadenas de 22 caracteres del alfabeto cuyo valor
sea menor que 2^128 y SHALL devolver el UUID original. La codificación y decodificación SHALL
implementarse sin dependencias nuevas.

#### Scenario: Ida y vuelta

- **WHEN** se codifica y luego se decodifica cualquier UUID, incluido uno con ceros a la izquierda y
  el máximo `ffffffff-ffff-ffff-ffff-ffffffffffff`
- **THEN** se obtiene el mismo UUID y la forma codificada tiene 22 caracteres

#### Scenario: Cadena inválida

- **WHEN** la cadena tiene otra longitud, un carácter fuera del alfabeto (`0`, `O`, `I` o `l`) o un
  valor mayor que 2^128
- **THEN** la decodificación falla y la página correspondiente responde con un 404 localizado

#### Scenario: Mayúsculas y minúsculas

- **WHEN** una dirección con id codificado se visita con el id pasado a minúsculas
- **THEN** no resuelve a ninguna entidad (404) y en ningún caso resuelve a otra entidad distinta

### Requirement: Parseo del segmento

El sistema SHALL extraer el id de un segmento tomando lo que sigue al último guion (o el segmento
entero si no hay guion) como id codificado, y SHALL aceptar además el segmento entero cuando sea un
UUID hexadecimal del formato anterior. Un segmento que no cumpla ninguna de las dos formas SHALL
tratarse como inexistente (404). Este parseo SHALL reemplazar a la validación de UUID en todas las
páginas y layouts de catálogo.

#### Scenario: Slug con guiones

- **WHEN** el segmento es `pink-floyd-the-wall-KQHie2Dgrb4CRpKj3vXDD8`
- **THEN** el id es `KQHie2Dgrb4CRpKj3vXDD8`, sin confundirlo con los guiones del slug

#### Scenario: Solo id

- **WHEN** el segmento es solo `KQHie2Dgrb4CRpKj3vXDD8`
- **THEN** se resuelve la misma entidad y la página redirige al segmento canónico

#### Scenario: UUID hexadecimal del formato anterior

- **WHEN** el segmento es `9504e7c5-da1f-475d-bcce-a64f6013772f`
- **THEN** se resuelve la misma entidad y la página redirige al segmento canónico

#### Scenario: Segmento sin id válido

- **WHEN** el segmento es `pink-floyd` o `pink-floyd-abc`
- **THEN** la página responde con un 404 localizado

### Requirement: Generación del slug

El slug SHALL construirse normalizando el texto en NFD, quitando las marcas U+0300–U+036F,
recomponiendo en NFC y pasando a minúsculas; SHALL sustituir `ø`, `đ`, `ł`, `æ`, `œ`, `ß` y `þ` por
`o`, `d`, `l`, `ae`, `oe`, `ss` y `th`; SHALL eliminar los apóstrofos sin introducir un separador; y
SHALL reemplazar toda otra secuencia de caracteres que no sean letras, números ni marcas Unicode por
un único `-`, sin guiones al inicio ni al final. Las letras de escrituras no latinas SHALL
conservarse tal cual, sin transliterar (`кино`, `宇多田ヒカル`, `방탄소년단`), y las sílabas del hangul
y los signos del kana SHALL permanecer íntegros tras la normalización.

#### Scenario: Diacríticos latinos y puntuación

- **WHEN** se genera el slug de "Mötley Crüe" y de "Guns N' Roses" y de "AC/DC"
- **THEN** los slugs son `motley-crue`, `guns-n-roses` y `ac-dc`

#### Scenario: Escrituras no latinas

- **WHEN** se genera el slug de "Кино", "宇多田ヒカル" y "방탄소년단"
- **THEN** los slugs son `кино`, `宇多田ヒカル` y `방탄소년단`

### Requirement: Artista principal en álbum y canción

El slug de un álbum y el de una canción SHALL ser `<artista>-<título>`, donde `<artista>` es el
nombre del primer crédito con rol `primary` por `position` (los créditos `featured` no participan),
acotado a 30 puntos de código, y `<título>` está acotado a 60 puntos de código; ambos SHALL cortarse
en límite de palabra salvo que una única palabra exceda el tope. Cuando el artista sea de tipo
`various` ("Various Artists") o no exista crédito principal, el slug SHALL ser solo el título.

#### Scenario: Álbum con artista principal

- **WHEN** el álbum "The Wall" tiene como primer crédito principal a Pink Floyd
- **THEN** su segmento es `pink-floyd-the-wall-<id>`

#### Scenario: Colaboración

- **WHEN** un álbum tiene a "A" como primer crédito principal y a "B" como segundo o como invitado
- **THEN** el slug usa solo el nombre de "A"

#### Scenario: Compilación de varios artistas

- **WHEN** el álbum pertenece a "Various Artists"
- **THEN** el segmento usa solo el título: `<título>-<id>`

#### Scenario: Título muy largo

- **WHEN** el título supera los 60 puntos de código
- **THEN** el slug lo corta en el último límite de palabra anterior al tope

### Requirement: Redirección a la dirección canónica

Cada página pública de artista, álbum, canción, lista y reseña SHALL cargar la entidad por el id del
segmento y, si el segmento recibido, decodificado y en NFC, no coincide con el canónico, SHALL
responder con una redirección permanente (308) a la dirección canónica, conservando el locale, la
subruta de la pestaña (`/credits`, `/members`, `/editions`, `/reviews`, `/lists`, …) y todo el query
(`section`, `view`, `sort`, `from`, `q`, …). La comparación SHALL hacerse sobre los valores
decodificados para no producir bucles de redirección con caracteres no ASCII. El modal interceptado
de reseñas, al ser navegación blanda, SHALL resolver la reseña por su id sin redirigir.

#### Scenario: Slug desactualizado

- **WHEN** un artista fue renombrado y se visita la dirección con el slug anterior
- **THEN** la respuesta es un 308 a la dirección con el slug actual

#### Scenario: Conserva pestaña y query

- **WHEN** se visita `/es/album/<id-pelado>/credits?view=songs`
- **THEN** la respuesta es un 308 a `/es/album/<slug-id>/credits?view=songs`

#### Scenario: Cambio del crédito principal

- **WHEN** el primer crédito principal de un álbum cambia de artista
- **THEN** la dirección con el slug anterior redirige a la que incluye el nuevo artista

#### Scenario: Nombre con Unicode

- **WHEN** se visita la dirección canónica de un artista cuyo nombre es "Кино"
- **THEN** la página se muestra sin redirigir y sin generar un bucle

#### Scenario: Entidad inexistente

- **WHEN** el id decodificado es válido pero no corresponde a ninguna entidad
- **THEN** la página responde con un 404 localizado y no redirige

### Requirement: Compatibilidad permanente con el UUID

Las direcciones con UUID hexadecimal pelado del formato anterior SHALL seguir resolviendo de forma
indefinida, siempre mediante la redirección a la dirección canónica. La API (`/api/**`) SHALL seguir
recibiendo el UUID interno sin cambios.

#### Scenario: Enlace antiguo

- **WHEN** alguien visita `/es/artist/93f1f6be-b1dc-42d0-abde-2850072d0774`
- **THEN** llega, tras un 308, a `/es/artist/<slug>-KGbai8kbv81qoNbTiNhQ7m` del mismo artista

#### Scenario: API sin cambios

- **WHEN** un cliente llama a `/api/catalog/artist/<uuid>`
- **THEN** la respuesta es la de siempre y el endpoint no acepta el segmento con slug

### Requirement: Enlaces construidos solo con los helpers

Todo enlace interno a un artista, álbum, canción, lista o reseña SHALL construirse con los helpers
únicos (`artistHref`, `albumHref`, `songHref`, `listHref`, `reviewHref`) y no con plantillas de texto
armadas a mano. Los helpers de álbum y canción SHALL requerir el nombre del artista principal como
argumento explícito (`string` o `null`, sin valor por defecto), de modo que el compilador obligue a
decidir en cada sitio de enlace si se conoce. Un test automatizado SHALL fallar si el código fuente
contiene un enlace armado a mano fuera de los helpers y de los tests, y al cerrar el cambio su lista
de excepciones SHALL estar vacía.

#### Scenario: Enlace desde una tarjeta

- **WHEN** una tarjeta de álbum con artista principal "Pink Floyd" enlaza al álbum
- **THEN** su `href` es el segmento canónico y llegar a él no genera ninguna redirección

#### Scenario: Artista principal desconocido

- **WHEN** un sitio de enlace no dispone del artista principal y pasa `null`
- **THEN** el enlace usa un slug sin artista y la página lo redirige a la dirección canónica

#### Scenario: Enlace escrito a mano

- **WHEN** se agrega `` `/album/${id}` `` en un componente
- **THEN** el test de cumplimiento falla indicando el archivo y la línea

#### Scenario: Endpoint de API no confundido

- **WHEN** el código contiene `` `/api/catalog/artist/${id}` ``
- **THEN** el test de cumplimiento no lo marca como enlace de página

### Requirement: Segmento de listas y reseñas

El segmento de una lista SHALL ser `<slug del nombre>-<id>` bajo `/users/{usuario}/lists/`, y el de
una reseña `<slug del usuario>-<slug del título del álbum>-<id>` bajo `/review/`. La página pública de
lista SHALL seguir aplicando la redirección por usuario renombrado antes de canonicalizar. La vista
privada de gestión `/me/lists/{id}` SHALL conservar el UUID sin slug.

#### Scenario: Lista pública

- **WHEN** el sistema enlaza la lista "Mis favoritos" de la usuaria "ana"
- **THEN** la dirección es `/{locale}/users/ana/lists/mis-favoritos-<id>`

#### Scenario: Reseña en el modal y en la página

- **WHEN** una persona abre una reseña desde el índice del álbum y luego recarga
- **THEN** la barra muestra el segmento canónico de la reseña en ambos casos, y la recarga muestra
  la página completa

#### Scenario: Vecinos en el modal

- **WHEN** el modal enlaza a la reseña anterior y a la siguiente
- **THEN** cada enlace usa el segmento canónico de esa reseña, no el id pelado
