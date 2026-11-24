## MODIFIED Requirements

### Requirement: Bloque de comunidad de la canción

La tarjeta de la canción SHALL mostrar, debajo de la ficha, un bloque de comunidad como una franja dividida en celdas, la misma que el
álbum, con la cifra arriba y su etiqueta debajo: **valoraciones** (cantidad) siempre; **media** de estrellas cuando la hay; **reacción
común** (reacción predominante, con la cantidad de reacciones como detalle) cuando la hay; y **favorita** (personas que la tienen de
favorita) cuando hay alguna. Bajo la franja, el enlace "Aparece en N listas" hacia las listas visibles que la contienen, solo cuando
N > 0. Cuando no hay media, ni reacción predominante, ni favoritas, el bloque SHALL reemplazar la franja por una sola línea ("Todavía
hay poca actividad de la comunidad") seguida de las cantidades mayores que 0 (valoraciones, reacciones); el enlace de listas se
mantiene. Cuando no hay valoraciones, ni reacciones públicas, ni favoritas, ni listas, el bloque SHALL NOT renderizarse. Los
agregados SHALL ser iguales para cualquier visitante, autenticado o no, y SHALL NOT mostrar porcentajes, histogramas ni rachas. La
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

- **WHEN** una canción no tiene valoraciones, reacciones públicas, favoritas ni listas
- **THEN** la tarjeta no muestra bloque de comunidad ni ninguna línea que lo diga
