## MODIFIED Requirements

### Requirement: Sin coincidencias es una lista vacía, no un error

Cuando ni la base local ni MusicBrainz devuelven coincidencias para el texto en el tipo pedido,
el endpoint SHALL responder `200` con una lista vacía y la página SHALL mostrar un estado vacío
que ofrezca buscar el mismo texto en los otros tipos. El estado vacío SHALL decir qué no coincidió
("Ningún álbum coincide con «x»"), dar consejos (ortografía; en Álbumes y Canciones, «Artista - Título»),
enlazar a la búsqueda avanzada del tipo (salvo en Usuarios) y, si el catálogo propio tiene un nombre o un
título parecido (similitud de trigramas ≥ 0,45, sin consultar MusicBrainz), ofrecer "¿Quisiste decir …?"
con la misma búsqueda sobre ese texto. La misma sugerencia SHALL mostrarse sobre una lista "débil", en la que
ningún resultado cubre todas las palabras de la consulta (MusicBrainz devuelve coincidencias parciales para un error
de tipeo en lugar de una lista vacía). Sin resultados y sin filtro activo, las pastillas de filtro SHALL NOT
mostrarse. Con un filtro activo (tipo de artista, categoría o década), el estado vacío SHALL decir que no hay
nada con esos filtros y ofrecer "Quitar filtros", sin sugerencias. El endpoint SHALL NOT responder `404` ni
emitir `ARTIST_NOT_FOUND` para una búsqueda sin resultados.

#### Scenario: Texto sin coincidencias
- **WHEN** una persona busca una cadena que no corresponde a ningún artista
- **THEN** el endpoint responde `200` con `{ "type": "artist", "results": [] }` y la página
  ofrece buscar el texto en Álbumes, Canciones y Usuarios

#### Scenario: Error de tipeo

- **WHEN** una persona busca `pink floid` en Álbumes y MusicBrainz solo devuelve discos llamados "Pink" de otros
  artistas
- **THEN** sobre la lista aparece "¿Quisiste decir Pink Floyd?" con un enlace a esa búsqueda

#### Scenario: Sin coincidencias

- **WHEN** una persona busca `xqzvqzzq` en Álbumes y nada coincide
- **THEN** el estado vacío dice "Ningún álbum coincide con «xqzvqzzq»", da consejos, ofrece los otros tipos y la
  búsqueda avanzada, y no muestra pastillas de filtro

#### Scenario: Filtro que vacía la lista

- **WHEN** una persona busca `the wall` en Álbumes con la década 1960s y nada coincide
- **THEN** el estado vacío dice "Nada con estos filtros" y ofrece "Quitar filtros" hacia la misma búsqueda sin ellos

### Requirement: Error recuperable
La interfaz SHALL mostrar un estado de error recuperable para `INTERNAL_ERROR` y otros fallos
inesperados, con una acción para reintentar la búsqueda. Cuando falla la consulta a MusicBrainz y no hay
coincidencias locales, el estado SHALL decir que no se pudo consultar MusicBrainz, que el texto todavía no está
en el catálogo y que suele resolverse en segundos, en lugar del error genérico. Con MusicBrainz caído y
coincidencias locales, el aviso SHALL decir que se muestra solo lo que ya está en el catálogo.

#### Scenario: Fallo del servicio
- **WHEN** la búsqueda falla con `INTERNAL_ERROR`
- **THEN** se muestra un estado de error con un mensaje propio y una acción de reintento

#### Scenario: MusicBrainz no responde

- **WHEN** MusicBrainz no responde y no hay coincidencias locales para `xyz`
- **THEN** la página dice "No pudimos consultar MusicBrainz" con un texto que nombra `xyz` y ofrece reintentar

## ADDED Requirements

### Requirement: Título de la pestaña por búsqueda

La página `/search` SHALL titularse "Buscar" sin consulta y "«texto» en tipo · Buscar" con ella ("«the wall» en
álbumes · Buscar"), para distinguir varias búsquedas abiertas. El esqueleto de carga SHALL tener el mismo ancho que la
página resuelta.

#### Scenario: Varias búsquedas abiertas

- **WHEN** una persona abre `/search?type=album&q=the wall`
- **THEN** la pestaña del navegador dice "«the wall» en álbumes · Buscar"
