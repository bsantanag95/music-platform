## ADDED Requirements

### Requirement: Puntuación de popularidad por personas distintas

El sistema SHALL calcular la popularidad de un álbum, un artista o una canción como la suma, sobre las **personas distintas**
que interactuaron con él, de los pesos de los **tipos de gesto** distintos que cada una hizo sobre ese objetivo, con un tope de 4 por
persona y objetivo. Los pesos SHALL ser: favorito 3; reseña 2; seguir al artista 2 (solo artistas); escucha registrada en el
diario, valoración, añadirlo a una lista y tenerlo en la colección 1; pendiente por escuchar y "en búsqueda" 0,5. Un mismo tipo de
gesto repetido por la misma persona sobre el mismo objetivo SHALL contar una sola vez. El valor de una valoración (sus estrellas)
SHALL NOT influir en la popularidad. A igualdad de puntuación SHALL ordenar por número de personas distintas, luego por la
actividad más reciente y luego por el identificador. Los pesos y el tope SHALL vivir en constantes del servicio.

#### Scenario: Diez escuchas de una persona

- **WHEN** una persona registra diez escuchas del mismo disco y nadie más interactúa con él
- **THEN** su puntuación es 1, no 10

#### Scenario: Varias personas pesan más que una muy activa

- **WHEN** una persona escucha, valora, reseña y marca favorito un disco A, y tres personas escuchan un disco B
- **THEN** A suma 4 (el tope) y B suma 3, y un cuarto oyente de B lo pondría por delante

#### Scenario: Las estrellas no cuentan como nota

- **WHEN** dos discos reciben cada uno una valoración de personas distintas, uno con 5 estrellas y otro con 1
- **THEN** ambos suman lo mismo por esa valoración

### Requirement: Qué gestos cuenta cada objetivo

Un **álbum** SHALL sumar los gestos hechos sobre ese álbum. Una **canción** SHALL sumar los gestos hechos sobre esa canción
(valoración, favorito, escucha y lista). Un **artista** SHALL sumar los gestos hechos directamente sobre él (seguirlo, favorito,
valoración, escucha, pendiente y lista) y los hechos sobre sus álbumes, atribuidos al artista principal del álbum (el primero
acreditado); el tope por persona SHALL aplicarse al artista en conjunto.

#### Scenario: Artista por sus discos

- **WHEN** una persona escucha dos discos de un artista sin seguirlo
- **THEN** el artista suma por esa persona, una sola vez y como mucho el tope

#### Scenario: Canción

- **WHEN** tres personas valoran una canción
- **THEN** la canción suma 3 y puede aparecer entre las canciones populares

### Requirement: Privacidad de la popularidad

La popularidad SHALL contar solo cuentas activas (no desactivadas). SHALL NOT contar los favoritos, escuchas del diario y discos de la
colección con audiencia `private`, ni los ítems de listas privadas, ni las reseñas ocultas por moderación. SHALL NOT exponer quién
interactuó. La cifra de personas de un objetivo SHALL mostrarse solo cuando alcanza 5; por debajo el objetivo SHALL aparecer sin
cifra.

#### Scenario: Escucha privada

- **WHEN** una persona registra una escucha con audiencia privada
- **THEN** esa escucha no suma a la popularidad del disco

#### Scenario: Cuenta desactivada

- **WHEN** una cuenta se desactiva
- **THEN** sus gestos dejan de contar en la popularidad

#### Scenario: Cifra con pocas personas

- **WHEN** un disco popular tiene 3 personas detrás
- **THEN** aparece en la sección sin mostrar "3 personas"

### Requirement: Ventana que se agranda con pocos datos

La popularidad "ahora" SHALL calcularse por separado para álbumes, artistas y canciones sobre los gestos de los últimos 30 días.
Si así no hay al menos el mínimo del tipo (6 álbumes, 5 artistas o 5 canciones) con 2 personas o más, SHALL probar con 90 días y
luego con todos los gestos, y en ese último paso SHALL aceptar objetivos con 1 persona. SHALL usar el primer escalón que alcance el
mínimo e informar cuál fue (este mes, últimos 3 meses o de siempre). Si ningún escalón lo alcanza, el tipo SHALL quedar sin
resultado. La fecha de un gesto SHALL ser la de su creación; la de una valoración, la de su última modificación.

#### Scenario: Mes con actividad suficiente

- **WHEN** en los últimos 30 días hay 8 discos con al menos 2 personas
- **THEN** los álbumes populares son los de esos 30 días y la ventana informada es "este mes"

#### Scenario: Pocos datos

- **WHEN** en 30 y en 90 días no se llega al mínimo, pero desde siempre hay 10 discos con al menos 1 persona
- **THEN** se muestran esos discos y la ventana informada es "de siempre"

#### Scenario: Sin datos

- **WHEN** no hay ningún gesto sobre canciones
- **THEN** el tipo canciones queda sin resultado
