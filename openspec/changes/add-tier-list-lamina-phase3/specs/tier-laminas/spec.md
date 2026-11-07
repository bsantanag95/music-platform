## ADDED Requirements

### Requirement: Arma la tuya desde una tier list ajena
La página pública de una tier list SHALL ofrecer a quien no es su dueño armar la suya. La nueva SHALL arrancar con los mismos ítems que esa tier list
tiene en sus niveles, en su orden, ubicados por la nota de quien la arma (sin nota, en la bandeja), y SHALL NOT heredar sus notas, su bandeja ni su
audiencia: nace privada. El servidor SHALL volver a leer la tier list ajena con las reglas de su página pública; si no se puede ver, es propia o no es
una tier list, SHALL responder `404` con `LAMINA_NOT_FOUND`.

#### Scenario: Mismos discos, otra nota
- **WHEN** Ana pone un disco en S y Beto, que lo valoró con 72, arma la suya desde la de Ana
- **THEN** en la de Beto ese disco queda en B, y la de Ana no cambia

#### Scenario: Sin heredar la bandeja
- **WHEN** la tier list de Ana tiene tres discos en su bandeja
- **THEN** la de Beto no los incluye

#### Scenario: Tier list que no se puede ver
- **WHEN** Beto intenta armar la suya desde una tier list privada de Ana o de alguien que lo bloqueó
- **THEN** la respuesta es `404` con `LAMINA_NOT_FOUND` y no se crea nada

### Requirement: Etiquetas a elección
Si la tier list ajena tiene etiquetas distintas de S a E, el formulario SHALL ofrecer copiarlas, apagado por defecto. Sin copiarlas, la nueva SHALL nacer
con S a E. Copiadas, SHALL ser de quien la arma: cambiarlas en una no cambia la otra.

#### Scenario: Copiar etiquetas
- **WHEN** Ana nombró su primer nivel "Obra maestra" y Beto marca "Usar sus etiquetas"
- **THEN** la tier list de Beto nace con "Obra maestra" en el primer nivel

#### Scenario: Sin etiquetas propias
- **WHEN** la tier list de Ana usa S a E
- **THEN** el formulario no ofrece copiarlas

### Requirement: Formulario inspirado en una tier list
`/me/laminas?desde=<id>` de una tier list que la persona puede ver SHALL abrir el formulario de tier list con la fuente "Como la de @usuario" elegida, su
tipo, su título como sugerencia y cuántos ítems trae, sin mostrar sus ítems, notas ni bandeja. Si no se puede ver o es propia, el formulario SHALL quedar
como siempre, sin revelar nada.

#### Scenario: Desde una tier list pública
- **WHEN** Beto abre `/me/laminas?desde=<id>` de una tier list pública de Ana con 12 discos en niveles
- **THEN** ve la fuente "Como la de @ana" con 12 discos y el título de Ana como sugerencia

### Requirement: Registro dirigido desde una tier list
Sin sesión, "Arma la tuya" en una tier list SHALL llevar a registrarse o entrar con la intención de Lámina (`lamina=<uuid>`) y, después, al formulario
inspirado en esa tier list.

#### Scenario: Registro desde una tier list
- **WHEN** alguien sin cuenta toca "Arma la tuya" en una tier list pública y se registra
- **THEN** llega a `/me/laminas?desde=<id>` con el formulario de tier list inspirado en ella

### Requirement: Tier list desde tu discografía
En su propia discografía de un artista, su dueño SHALL tener "Armar tier list", que la crea en un toque desde esa discografía, con el título "Tier list de
{artista}", y lo lleva al editor. Quien mira la discografía de otra persona SHALL NOT ver ese botón.

#### Scenario: Un toque
- **WHEN** el dueño toca "Armar tier list" en su discografía de Black Sabbath
- **THEN** se crea su tier list de Black Sabbath, privada, y llega a su editor

#### Scenario: Discografía ajena
- **WHEN** una seguidora abre la discografía de Ana
- **THEN** no ve "Armar tier list", sino el "Arma la tuya" de discografía
