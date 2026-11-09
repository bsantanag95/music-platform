## ADDED Requirements

### Requirement: Aviso de Tu año en discos
Desde el 1 de diciembre y hasta el 15 de enero, el sistema SHALL crear una notificación `year_in_discs` del año que cierra para cada cuenta activa con al
menos una escucha en ese año y con la preferencia `year_in_discs` activa (lo está por defecto). Cada persona SHALL recibir a lo sumo una por año aunque el
envío se repita. El aviso SHALL NOT llevar actor, SHALL aparecer en "Novedades" sin sumar al contador de la campana y SHALL enlazar a la página de su año.

#### Scenario: Primer día de diciembre
- **WHEN** corre el envío el 1 de diciembre y Ana tiene escuchas ese año
- **THEN** Ana tiene un aviso en "Novedades" que lleva a su año

#### Scenario: Envío repetido
- **WHEN** el envío corre todos los días de la ventana
- **THEN** Ana sigue teniendo un solo aviso de ese año

#### Scenario: Preferencia apagada
- **WHEN** Ana apagó la preferencia `year_in_discs`
- **THEN** no recibe el aviso

#### Scenario: Fuera de la ventana
- **WHEN** el envío corre el 20 de noviembre o el 20 de enero
- **THEN** no crea avisos
