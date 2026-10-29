## ADDED Requirements

### Requirement: Contexto de cada conexión

Cada fila de Seguidos y Seguidores SHALL decir desde cuándo existe la relación listada, en mes y año: "Te sigue desde"
en los Seguidores propios, "La sigues desde" en los Seguidos propios y "Desde" en los de otro perfil.

Con sesión, la fila SHALL indicar cuántos discos tiene en común la persona con el visitante (álbumes que ambos tienen
en favoritos o valoraron con 4 estrellas o más) cuando son al menos 3. Solo SHALL contar lo que esa persona deja ver al
visitante: sus favoritos según su audiencia y su perfil, y sus valoraciones solo si el visitante la sigue. La cifra
SHALL NOT mostrarse para el propio visitante, sin sesión ni con bloqueo.

#### Scenario: Desde cuándo te sigue

- **WHEN** el dueño abre sus Seguidores y Leo lo sigue desde octubre de 2026
- **THEN** la fila de Leo dice "Te sigue desde oct 2026"

#### Scenario: Discos en común con umbral

- **WHEN** el visitante y Mia tienen 8 álbumes en común entre favoritos y valoraciones de 4★ o más, y con Noa solo 2
- **THEN** la fila de Mia dice "8 discos en común" y la de Noa no dice nada de discos

#### Scenario: Lo que la otra persona no deja ver

- **WHEN** Mia tiene un perfil privado que el visitante no sigue
- **THEN** sus favoritos y valoraciones no cuentan para la cifra de discos en común

### Requirement: Panel lateral de conexiones

En una pantalla ancha, la vista SHALL mostrar al costado, cuando tiene contenido: en los Seguidores propios, "Para
seguir de vuelta" con hasta 5 personas que siguen al dueño y a las que él no sigue, con el botón para seguirlas y un
enlace a verlas todas; en un perfil ajeno, con sesión, "En común con <nombre>" con cuántos seguidores tienen en común y
un enlace a la pestaña "Seguidos en común". Sin contenido, la vista SHALL NOT mostrar el panel ni ensancharse.

#### Scenario: Para seguir de vuelta

- **WHEN** el dueño, en una pantalla ancha, abre sus Seguidores y 7 personas lo siguen sin que él las siga
- **THEN** ve al costado "Para seguir de vuelta" con 5 de ellas y un enlace a ver las 7

#### Scenario: Sin contenido

- **WHEN** el dueño sigue de vuelta a todos sus seguidores
- **THEN** la vista no muestra panel lateral y conserva su ancho
