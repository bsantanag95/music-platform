## MODIFIED Requirements

### Requirement: Mejor coincidencia con homónimos

En Artistas, la página SHALL destacar arriba una respuesta elegida por presencia en el catálogo:

1. si algún artista con el nombre exacto de la consulta tiene discos en el catálogo, la respuesta SHALL ser el que más tiene
   (ante un empate, el primero en el orden del tipo), en una tarjeta grande;
2. si ninguno los tiene, pero hay artistas del catálogo con al menos 2 discos cuyo nombre contiene todas las palabras de la
   consulta, la página SHALL preguntar "¿Cuál «<consulta>» buscas?" con hasta dos de ellos (los de más discos) y el primer
   artista de nombre exacto, si existe, marcado "Nombre idéntico a «<consulta>»"; si solo queda uno, SHALL mostrarse como
   respuesta con la nota "Más cercano en el catálogo";
3. si no se da ninguno de los dos casos, la respuesta SHALL ser el primer artista de nombre exacto según el orden del tipo.

La respuesta y cada opción de la elección SHALL mostrar, cuando se conozcan, la foto (de Wikimedia Commons, salvo retirada),
el tipo, el país, los años, cuántos discos principales tiene en el catálogo y hasta tres géneros. Debajo, bajo "Otros
artistas llamados «<consulta>»", SHALL listarse los demás homónimos con su tipo, desambiguación y país (por su nombre en el
idioma de la interfaz). Se ven los tres primeros y el resto tras "Ver los N", sin repetir los que ya están arriba. Cada fila
de artista SHALL mostrar además, cuando se conozcan, la foto, sus años de actividad o de vida ("1973–1996", "desde 1973")
y, si su discografía ya se exploró en la plataforma, cuántos discos principales tiene en el catálogo. Las coincidencias no
exactas SHALL aparecer después, sin repetir las de arriba.

#### Scenario: KISS
- **WHEN** una persona busca `KISS` en Artistas
- **THEN** ve una tarjeta con la banda de rock estadounidense como respuesta, luego los otros KISS con su desambiguación,
  y después artistas como "Kiss Kiss"

#### Scenario: Elegir entre homónimos
- **WHEN** una persona busca `kiss` en Artistas
- **THEN** la respuesta muestra la foto, "Grupo · Estados Unidos · desde 1973 · N discos · US rock band" y sus
  géneros, y los homónimos muestran el país por su nombre ("Corea del Sur")

#### Scenario: Ningún homónimo en el catálogo
- **WHEN** una persona busca `pink` en Artistas, ninguno de los seis "Pink" exactos tiene discos en el catálogo, y Pink
  Floyd (233 discos) y The Legendary Pink Dots (175) sí
- **THEN** la página pregunta "¿Cuál «pink» buscas?" con Pink Floyd, The Legendary Pink Dots y el primer "PINK" marcado
  "Nombre idéntico a «pink»", y el proyecto "Pink Floyd" de un solo disco no aparece en la elección

#### Scenario: Sin datos del catálogo
- **WHEN** una persona busca `nirvana` en Artistas y ninguna discografía de los homónimos se exploró
- **THEN** la respuesta es el primer "Nirvana" en el orden del tipo, como antes

#### Scenario: Muchos homónimos
- **WHEN** hay siete homónimos debajo de la respuesta
- **THEN** se ven tres y un botón "Ver los 7" muestra el resto sin cambiar de página
