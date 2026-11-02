## ADDED Requirements

### Requirement: Artista explorado como señal de orden

En Álbumes y Canciones, con el mismo nivel de coincidencia y la misma actividad, un resultado de un artista ya
explorado en la plataforma (su discografía está sincronizada porque alguien abrió su página) SHALL ir antes que los
resultados que solo trajo la búsqueda, y en Álbumes un disco de estudio de ese artista SHALL ir antes que sus otros
tipos. La señal SHALL ir después de la actividad y antes de la notoriedad de MusicBrainz. En un grupo de canciones,
cuenta si alguna de sus grabaciones (local o de MusicBrainz, por el MBID del artista) es de un artista explorado. La
coincidencia local SHALL usar la misma señal para desempatar títulos igual de parecidos antes de aplicar su tope, de
modo que el disco conocido no quede fuera de los candidatos por homónimos guardados en búsquedas anteriores.

#### Scenario: Álbum conocido entre homónimos

- **WHEN** una persona busca `the wall` en Álbumes y la primera página de MusicBrainz trae 25 sencillos homónimos sin
  el álbum de Pink Floyd, cuya página ya se abrió en la plataforma
- **THEN** "The Wall" de Pink Floyd (estudio, 1979) aparece primero

#### Scenario: Canción de un artista explorado

- **WHEN** una persona busca una canción con muchas versiones y una de ellas es de un artista explorado
- **THEN** esa versión va antes que las demás del mismo nivel sin actividad
