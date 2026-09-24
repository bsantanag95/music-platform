## ADDED Requirements

### Requirement: Participación anónima en el conteo agregado

Las entradas de colección SHALL contar, como personas distintas y con cualquier
audiencia, en el conteo agregado "lo coleccionan" del bloque de comunidad del álbum
(capacidad `album-community-stats`), con el umbral mínimo de esa capacidad. El conteo
SHALL NOT revelar la identidad de ninguna persona ni alterar la visibilidad de las
entradas individuales, que sigue rigiéndose por su audiencia.

#### Scenario: Entrada privada en el total

- **WHEN** una persona tiene un álbum en su colección con audiencia privada
- **THEN** cuenta en "lo coleccionan" del álbum y su entrada sigue sin ser visible para
  otros en su perfil
