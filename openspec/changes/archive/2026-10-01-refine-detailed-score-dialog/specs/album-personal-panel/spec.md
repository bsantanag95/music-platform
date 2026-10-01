## REMOVED Requirements

### Requirement: Puntaje detallado con o sin estrellas previas
**Reason**: el campo numérico libre cambiaba las estrellas vigentes cuando el número caía fuera de su tramo, y la conversión no se entendía. Se reemplaza por un deslizador acotado al tramo de las estrellas (ver "Puntaje detallado con deslizador").
**Migration**: usar "Puntaje detallado con deslizador".

## ADDED Requirements

### Requirement: Puntaje detallado con deslizador
Junto a las estrellas, el panel SHALL ofrecer una acción compacta, siempre habilitada, que
muestra el puntaje detallado vigente como `86/100` (o un indicador de "agregar" si no hay) y
abre un diálogo modal con un deslizador para elegir el puntaje y, cuando ya hay una
valoración, con destacar/quitar de destacadas y borrar la valoración.

- **Con estrellas**, el deslizador SHALL limitarse al tramo de esas estrellas (4★ → 71–80) y
  guardar NO SHALL cambiar las estrellas; el diálogo SHALL mostrar las estrellas vigentes y
  su tramo.
- **Sin estrellas**, el deslizador SHALL ir de 1 a 100 y el diálogo SHALL mostrar una fila de
  estrellas que se actualiza en vivo con las estrellas que corresponden al valor; al guardar,
  las estrellas SHALL ser las que devuelve el servidor.

El diálogo SHALL mostrar el valor elegido de forma destacada (`86/100`, o `—/100` antes de
elegir) con los extremos del rango, y SHALL ofrecer botones `−` y `+` que ajustan de a 1
dentro del rango. El deslizador SHALL ser operable con teclado (flechas ±1; Re Pág / Av Pág
±10) y anunciar el valor y sus estrellas a lectores de pantalla. "Guardar" SHALL habilitarse
solo cuando el valor elegido difiere del vigente. Guardar SHALL enviar solo el puntaje. El
diálogo SHALL ofrecer un botón de ayuda `?` que muestra y oculta, dentro del diálogo, una
explicación breve (el puntaje es opcional y afina las estrellas) y la tabla de tramos (½★ =
1–10 … 5★ = 91–100), con el tramo de las estrellas vigentes resaltado. El diálogo SHALL
cerrarse con Escape y devolver el foco a la acción que lo abrió. La misma acción y el mismo
diálogo SHALL usarse en el panel de la canción.

#### Scenario: Deslizador acotado con estrellas
- **WHEN** un usuario con 4★ abre el diálogo
- **THEN** el deslizador va de 71 a 80, y al guardar 76 el panel muestra 4★ y `76/100`

#### Scenario: Puntuar sin estrellas previas
- **WHEN** un usuario que no valoró el álbum abre el diálogo y lleva el deslizador a 86
- **THEN** la fila de estrellas del diálogo muestra 4½, y al guardar el panel muestra 4,5
  estrellas y `86/100`

#### Scenario: Guardar requiere elegir
- **WHEN** un usuario abre el diálogo y no mueve el deslizador ni usa `−` / `+`
- **THEN** "Guardar" está deshabilitado

#### Scenario: Ajuste fino con botones
- **WHEN** el deslizador está en 80 con 4★ y el usuario pulsa `+`
- **THEN** el valor sigue en 80 y `+` está deshabilitado

#### Scenario: Ayuda
- **WHEN** un usuario con 4★ pulsa `?`
- **THEN** el diálogo muestra la explicación y la tabla de tramos con la fila 4★ (71–80)
  resaltada, y al pulsar `?` de nuevo se oculta

#### Scenario: Borrar la valoración
- **WHEN** un usuario confirma "Borrar nota" en el diálogo
- **THEN** se borran estrellas y puntaje detallado y las estrellas del panel quedan vacías

#### Scenario: Acciones de la valoración sin valoración
- **WHEN** un usuario sin valoración abre el diálogo
- **THEN** no se ofrecen "Destacar" ni "Borrar nota"
