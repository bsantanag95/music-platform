## ADDED Requirements

### Requirement: Fondo de la cabecera de Inicio con sesión

El fondo de la cabecera de Inicio con sesión SHALL mostrarse como un mosaico de carátulas decorativo
—oculto para tecnologías de asistencia, sin enlaces ni texto— con opacidad baja y desvanecido hacia el
lado del titular. Cuando la persona tiene al menos 6 álbumes con carátula entre sus favoritos de álbum
y sus escuchas, el mosaico SHALL usar primero sus álbumes favoritos (del marcado más reciente al más
antiguo) y luego sus álbumes más escuchados (por cantidad de escuchas), sin repetir álbumes, y SHALL
completar con carátulas del mosaico general de la portada las celdas que falten. Con menos de 6, el
fondo SHALL ser el mosaico general de la portada. Las escuchas de canciones y los favoritos de artista o
de canción SHALL NOT aportar carátulas al fondo. El fondo SHALL NOT reducir la legibilidad del titular ni
del campo para registrar una escucha en ningún ancho.

#### Scenario: Persona con favoritos suficientes
- **WHEN** una persona con 10 álbumes favoritos con carátula abre Inicio
- **THEN** el fondo de la cabecera muestra esas carátulas, la del favorito más reciente primero, y el
  resto de las celdas con el mosaico general

#### Scenario: Pocos favoritos, completa con escuchas
- **WHEN** una persona tiene 2 álbumes favoritos y escuchó «Hysteria» 5 veces y «Pyromania» 2 veces
- **THEN** el fondo usa primero los 2 favoritos y luego «Hysteria» antes que «Pyromania», si entre todos
  suman al menos 6 álbumes con carátula

#### Scenario: Debajo del mínimo
- **WHEN** una persona tiene menos de 6 álbumes con carátula entre favoritos y escuchas
- **THEN** el fondo es el mosaico general de la portada, como para una cuenta nueva

#### Scenario: Un álbum favorito y escuchado no se repite
- **WHEN** un álbum está entre los favoritos y entre los más escuchados
- **THEN** aparece una sola vez en el fondo

#### Scenario: Decorativo
- **WHEN** un lector de pantalla recorre la cabecera
- **THEN** el fondo no se anuncia ni tiene elementos enfocables
