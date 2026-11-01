# song-community-stats Specification

## Purpose
Mostrar en la cabecera de la canción los agregados de la comunidad (media, reacción común, favoritas y listas) con umbrales mínimos y sin exponer identidades.
## Requirements
### Requirement: Bloque de comunidad de la canción

La cabecera de la canción SHALL mostrar un bloque de comunidad como una franja dividida en
celdas, la misma que el álbum, con la cifra arriba y su etiqueta debajo: **valoraciones**
(cantidad) siempre; **media** de estrellas cuando la hay; **reacción común** (reacción
predominante, con la cantidad de reacciones como detalle) cuando la hay; y **favorita**
(personas que la tienen de favorita) cuando hay alguna. Bajo la franja, el enlace "Aparece
en N listas" hacia las listas visibles que la contienen, solo cuando N > 0. Cuando no hay
media, ni reacción predominante, ni favoritas, el bloque SHALL reemplazar la franja por una
sola línea ("Todavía hay poca actividad de la comunidad") seguida de las cantidades mayores
que 0 (valoraciones, reacciones), o por "Todavía sin actividad de la comunidad" si no hay
ninguna; el enlace de listas se mantiene. Los agregados SHALL ser iguales para cualquier
visitante, autenticado o no, y SHALL NOT mostrar porcentajes, histogramas ni rachas. La
franja SHALL mostrarse igual en móvil, en una fila.

#### Scenario: Canción con actividad

- **WHEN** una canción tiene 128 valoraciones con media 4,3, 60 reacciones públicas con
  "obsessed" como predominante, 41 personas que la tienen de favorita y aparece en 23
  listas visibles
- **THEN** la franja muestra esas cifras en cuatro celdas y el enlace "Aparece en 23
  listas"

#### Scenario: Visitante anónimo

- **WHEN** una persona sin sesión abre la canción
- **THEN** ve el mismo bloque de comunidad que un usuario autenticado

#### Scenario: Poca actividad

- **WHEN** una canción tiene 1 valoración, ninguna reacción pública y ninguna favorita
- **THEN** el bloque no muestra la franja y dice "Todavía hay poca actividad de la
  comunidad · 1 valoración"

#### Scenario: Sin actividad

- **WHEN** una canción no tiene valoraciones, reacciones públicas ni favoritas
- **THEN** el bloque dice "Todavía sin actividad de la comunidad"

### Requirement: Umbrales de la comunidad de la canción

El sistema SHALL mostrar la media de estrellas solo cuando la canción tiene al menos 5
valoraciones, y la reacción predominante solo cuando hay al menos 5 reacciones públicas;
con menos, la celda correspondiente SHALL omitirse y la cantidad real SHALL seguir a la
vista (la celda Valoraciones, o la línea de poca actividad), nunca un texto que la esconda
como "Pocas valoraciones". El conteo de favoritas SHALL mostrarse como "<5" (con "menos de
5" para lectores de pantalla y como ayuda al pasar el puntero) cuando el valor real es
mayor que 0 y menor que 5. Una celda sin dato SHALL NOT mostrarse con "—" ni "0".

#### Scenario: Pocas reacciones

- **WHEN** una canción tiene 3 reacciones públicas y 12 favoritas
- **THEN** la franja no muestra celda de reacción y no esconde las cifras que sí tiene

#### Scenario: Pocas favoritas

- **WHEN** 2 personas tienen la canción de favorita
- **THEN** la celda muestra "<5" y los lectores de pantalla anuncian "menos de 5"

#### Scenario: Pocas valoraciones con otras tarjetas con datos

- **WHEN** una canción tiene 3 valoraciones y 12 favoritas
- **THEN** la franja muestra "3" en Valoraciones y "12" en Favorita, sin celda de media

### Requirement: Origen y anonimato de los agregados de la canción

La reacción común SHALL derivarse únicamente de entradas de diario con audiencia `public` y
reacción no nula sobre la grabación. El conteo de favoritas SHALL contar personas distintas
con la grabación en favoritos, de cualquier audiencia, sin exponer su identidad. Todos los
agregados SHALL referirse a esta grabación, no a las demás versiones de su obra.

#### Scenario: Reacciones privadas

- **WHEN** las únicas reacciones a la canción están en entradas `private` o `followers`
- **THEN** no alimentan la reacción común

#### Scenario: Favorita privada

- **WHEN** una persona tiene la canción de favorita con audiencia privada
- **THEN** cuenta en "favorita de" y el bloque no ofrece forma de saber quién es

#### Scenario: Versiones separadas

- **WHEN** la versión en vivo de una canción tiene 20 valoraciones y la de estudio 3
- **THEN** la página de la versión de estudio muestra "3 valoraciones" sin media

