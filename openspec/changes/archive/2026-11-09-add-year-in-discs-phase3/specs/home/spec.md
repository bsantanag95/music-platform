## ADDED Requirements

### Requirement: Invitación de Tu año en discos
Del 1 de diciembre al 15 de enero, en la zona de la persona, Inicio y el diario SHALL mostrar a una persona con sesión una tarjeta de su año que cierra (el
en curso en diciembre, "hasta ahora"; el anterior en enero) que enlaza a su página del año, si tiene escuchas visibles ese año y no lo compartió. La tarjeta
SHALL poder descartarse para ese año, sin afectar al siguiente, y SHALL NOT aparecer a una persona sin sesión.

#### Scenario: Diciembre con escuchas
- **WHEN** Ana, con escuchas en 2026, abre Inicio el 3 de diciembre de 2026
- **THEN** ve "Tu 2026 en discos" con el enlace a su año

#### Scenario: Enero
- **WHEN** Ana abre el diario el 10 de enero de 2027
- **THEN** la tarjeta es de 2026

#### Scenario: Ya compartido o descartado
- **WHEN** Ana compartió su 2026 o descartó la tarjeta
- **THEN** no la ve más ese año

#### Scenario: Fuera de la ventana
- **WHEN** Ana abre Inicio el 20 de enero
- **THEN** no ve la tarjeta
