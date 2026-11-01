## ADDED Requirements

### Requirement: Coherencia visual de la página de canción

La página de canción SHALL usar las piezas comunes de la página de álbum: el chevron SVG en
la tira de pistas (no flechas tipográficas), enlaces secundarios neutros en reposo y en
ámbar al pasar el cursor (autores, primera aparición, versión original, disco de la tira,
acceso a los créditos del disco, listas, "ver más" y roles ocultos), y etiquetas neutras.
Todas las secciones (Composición, Créditos de esta grabación, Apariciones, Versiones)
SHALL titularse con el mismo estilo de título de sección. Los comentarios SHALL limitarse
al ancho de lectura de las páginas de álbum y artista.

#### Scenario: Tira de pistas

- **WHEN** una persona abre una canción del medio de un disco
- **THEN** los accesos a la pista anterior y siguiente llevan el chevron común y el título
  del disco no está en ámbar hasta pasar el cursor

#### Scenario: Autores en reposo

- **WHEN** una persona ve "Escrita por" con cuatro autores
- **THEN** los nombres se muestran en el color del texto, subrayados, y en ámbar al pasar
  el cursor

#### Scenario: Títulos de sección

- **WHEN** la canción tiene créditos, apariciones y versiones
- **THEN** "Créditos de esta grabación", "Esta grabación aparece en" y "Otras versiones de
  la canción" tienen el mismo estilo de título
