## MODIFIED Requirements

### Requirement: Buscador de objetivos compartido

Las acciones que operan sobre un objetivo (Escucha, Valorar, Favorito, Pendiente, Colección, Recorrido y A lista)
SHALL elegir el objetivo con un mismo buscador del catálogo con un tipo por búsqueda —álbum (por defecto), canción
o artista—, con mínimo de dos letras y estados de cargando, error y sin resultados. La búsqueda SHALL hacerse en
dos fases:

1. **Local**: 150 ms después de la última tecla, con dos letras o más, el buscador SHALL pedir las coincidencias
   locales (`GET /api/search/suggest`, que nunca sale a MusicBrainz) y mostrarlas en cuanto lleguen.
2. **Completa**: 500 ms después de la última tecla, con tres letras o más, el buscador SHALL pedir la búsqueda
   del catálogo (`GET /api/catalog/search`; en Canciones con `purpose=pick`) y SHALL **añadir** sus resultados
   debajo de los locales ya visibles, sin repetir los que tengan el mismo `id` y sin reordenar los que ya están
   a la vista.

Si la búsqueda completa trae un objetivo que ya está a la vista como coincidencia local, SHALL completar el
subtítulo y el año que la fila local no tenga, sin moverla. En Canciones, una coincidencia local SHALL mostrarse
solo si cada palabra de la consulta aparece en su título o en su artista (la última puede ser un prefijo), porque
las sugerencias locales de canción comparan solo el título y se suele escribir "artista + canción".

Mientras la fase completa está pendiente, el buscador SHALL mostrar los resultados locales junto con un
indicador de carga discreto, no reemplazarlos por un estado de cargando. El estado **sin resultados** SHALL
mostrarse solo cuando ambas fases terminaron sin candidatos, y el estado **error** solo cuando la fase completa
falló y no hay candidatos locales; si falla la fase completa con candidatos locales, SHALL conservarlos.

Al cambiar el texto o el tipo, o al cerrar el diálogo, el buscador SHALL **abortar** las solicitudes en curso
de la consulta anterior, y SHALL NOT mostrar resultados de una consulta que ya no es la vigente.

Los resultados de canción SHALL limitarse a canciones con grabación identidad registrable. La acción
**Pendiente** SHALL ofrecer solo los tipos álbum y artista, porque Pendiente no admite canciones; **Colección**
SHALL ofrecer solo álbumes y **Recorrido** solo artistas.

#### Scenario: Un tipo por búsqueda

- **WHEN** una persona busca con el tipo "Canción"
- **THEN** las peticiones buscan solo canciones y los resultados no mezclan álbumes ni artistas

#### Scenario: Pendiente no ofrece canciones

- **WHEN** una persona selecciona el chip "Pendiente"
- **THEN** el buscador ofrece los tipos álbum y artista y no el tipo canción

#### Scenario: Menos de dos letras

- **WHEN** una persona escribe una sola letra
- **THEN** no se hace ninguna búsqueda y se muestra la indicación de escribir al menos dos letras

#### Scenario: Colección y Recorrido restringen el tipo

- **WHEN** una persona selecciona el chip "Colección" y luego el chip "Recorrido"
- **THEN** Colección busca solo álbumes y Recorrido busca solo artistas, sin conmutador de tipo

#### Scenario: Lo local se ve sin esperar a MusicBrainz

- **WHEN** una persona escribe "pink floyd" con el tipo "Artista" y Pink Floyd existe en el catálogo
- **THEN** Pink Floyd aparece como candidato antes de que responda la búsqueda completa, con un indicador de que
  siguen llegando resultados

#### Scenario: Los resultados completos se suman sin desplazar

- **WHEN** la búsqueda completa responde con Pink Floyd y otros dos artistas
- **THEN** Pink Floyd conserva su posición, aparece una sola vez y los otros dos se añaden debajo

#### Scenario: La búsqueda completa completa el artista de una fila local

- **WHEN** una coincidencia local de álbum "Dark Side" llega sin artista y la búsqueda completa trae el mismo
  álbum con el artista Kelly Clarkson
- **THEN** la fila conserva su posición y muestra a Kelly Clarkson

#### Scenario: Canciones locales que no cubren la consulta

- **WHEN** una persona escribe "metallica one" con el tipo "Canción" y las coincidencias locales son
  "String Metallica" (Musical Artizan), "Metall" (CHBB) y «One» (Metallica)
- **THEN** solo «One» de Metallica se muestra como coincidencia local

#### Scenario: Dos letras solo buscan en local

- **WHEN** una persona escribe "ac"
- **THEN** se piden solo las coincidencias locales y no se llama a `/api/catalog/search`

#### Scenario: Escribir aborta la búsqueda anterior

- **WHEN** una persona escribe "megadeth", espera a que se lance la búsqueda completa y luego sigue escribiendo
  " rust"
- **THEN** la solicitud de "megadeth" se aborta y solo se muestran resultados de "megadeth rust"

#### Scenario: Falla la búsqueda completa con candidatos locales

- **WHEN** la búsqueda completa falla y hay candidatos locales
- **THEN** los candidatos locales siguen visibles y elegibles y no se muestra el estado de error
