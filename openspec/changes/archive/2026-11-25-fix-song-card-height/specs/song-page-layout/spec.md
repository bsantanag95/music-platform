## MODIFIED Requirements

### Requirement: Zonas de la página de canción

La página de canción SHALL organizarse, de arriba hacia abajo, en: breadcrumb con Compartir; una **tarjeta** de cabecera (superficie
con borde) con la carátula del disco principal, el bloque de identidad (antetítulo, título, artistas), la ficha técnica, el bloque de
comunidad y una columna lateral con «Recorrer el disco» y, para el visitante, la invitación a valorar; los bloques Composición y
Créditos de esta grabación, con una columna a su lado en escritorio con el panel "Tu relación" (con sesión) y **«En el disco»**; "Esta
grabación aparece en"; "Otras versiones de la canción"; y los comentarios. El alto de la tarjeta SHALL depender solo de su contenido
propio, nunca del panel "Tu relación". La página SHALL NOT tener pestañas y SHALL usar el contenedor de 88rem de las páginas de álbum y
artista. La tarjeta SHALL NOT llevar el fondo desenfocado de la portada del álbum. La carátula SHALL mostrarse como máximo a 250 px de
lado y, en móvil, pequeña junto al bloque de identidad. Una zona sin datos SHALL NOT renderizarse, salvo la tarjeta y los comentarios.

#### Scenario: Escritorio

- **WHEN** una persona abre una canción en un viewport de escritorio
- **THEN** la tarjeta muestra la carátula, la identidad con la ficha en dos columnas y la columna lateral con «Recorrer el disco» (y
  la invitación a valorar sin sesión), y debajo van los créditos con el panel y «En el disco» a la derecha, los discos, las versiones
  y los comentarios

#### Scenario: Móvil

- **WHEN** una persona abre una canción en un viewport móvil
- **THEN** la tarjeta apila la carátula junto a la identidad, la ficha en una columna, «Recorrer el disco» en una fila y, sin sesión,
  la invitación; después siguen el panel (con sesión), composición, créditos, «En el disco», discos, versiones y comentarios, sin
  desbordamiento horizontal de la página, y sin sesión los créditos empiezan a no más de 680 px del inicio a 390 px de ancho

#### Scenario: Canción sin créditos ni versiones

- **WHEN** la grabación no tiene créditos de personal, autoría ni otras versiones
  registradas
- **THEN** la página no muestra esos bloques vacíos y los comentarios siguen al final

#### Scenario: Panel alto con sesión

- **WHEN** un usuario autenticado abre una canción y su panel "Tu relación" mide más que la tarjeta
- **THEN** la tarjeta conserva su alto y no hay hueco entre el título y la ficha; el panel va en la columna del cuerpo
