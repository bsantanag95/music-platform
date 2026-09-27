## MODIFIED Requirements

### Requirement: Identidad y ficha técnica de la canción

La cabecera SHALL mostrar un antetítulo "Canción · Pista N" cuando la grabación está en la
lista de canciones de la edición representativa del disco principal (el disco lo nombran las
migas y la tira de pistas, no el antetítulo), o "Canción" en otro caso; el título; y todos los
artistas principales con su `joinPhrase`, con enlace a cada uno. La carátula SHALL enlazar al
disco principal y ofrecer su título como ayuda. La ficha técnica SHALL mostrar, solo cuando
existan: duración; "Escrita por" con los autores de la obra; primera aparición (disco más
temprano que contiene la grabación, con su año y, cuando no es el disco principal, su tipo:
álbum, single/EP, recopilación, en vivo u otro); y la línea de versión definida en
`song-versions`.

#### Scenario: Canción de estudio

- **WHEN** una persona abre "November Rain", pista 10 de "Use Your Illusion I"
- **THEN** la cabecera muestra "Canción · Pista 10", el título, "Guns N' Roses" y la ficha
  con duración, "Escrita por Axl Rose" y "Primera aparición: Use Your Illusion I · 1991"

#### Scenario: Sin duración conocida

- **WHEN** la grabación no tiene duración registrada
- **THEN** la ficha no muestra la fila de duración

#### Scenario: Canción publicada antes como single

- **WHEN** una persona abre "Manchild", pista 1 de "Man's Best Friend", publicada antes como
  single
- **THEN** la ficha muestra "Primera aparición: Manchild (single/EP) · 2025" y la carátula
  enlaza a "Man's Best Friend"

### Requirement: Composición y créditos de la grabación

La página SHALL mostrar un bloque **Composición** con los autores de la obra (u obras) de la
grabación, cada uno enlazado a su página de artista y con sus roles traducidos ("música",
"letra"), solo cuando los roles difieren entre autores (si no, la fila "Escrita por" de la
ficha, que lista solo nombres, ya lo dice todo), y un bloque **Créditos de esta grabación** con las personas
acreditadas en la grabación agrupadas en Intérpretes, Producción, Sonido y Otros, con los
mismos roles traducidos que la vista por canción de los créditos del álbum. Los integrantes
de los artistas principales SHALL destacarse entre los intérpretes. Cuando el disco principal
tiene créditos de nivel edición, el bloque SHALL ofrecer un enlace a la pestaña Créditos de
ese disco en lugar de repetirlos. Ambos bloques SHALL obtenerse con consultas de lectura,
sin requests a MusicBrainz al renderizar.

#### Scenario: Canción con créditos por grabación

- **WHEN** una grabación tiene créditos de guitarra, voz y mezcla
- **THEN** el bloque de créditos los muestra agrupados en Intérpretes y Sonido, con los
  integrantes de la banda destacados

#### Scenario: Créditos del disco completo

- **WHEN** el productor del disco principal está acreditado en la edición y no en cada pista
- **THEN** el bloque ofrece "Créditos de todo el disco" con enlace a la pestaña Créditos del
  álbum

#### Scenario: Sin créditos de grabación

- **WHEN** la grabación no tiene créditos de personal
- **THEN** el bloque de créditos no se muestra, y Composición se muestra solo si los autores
  tienen roles distintos
