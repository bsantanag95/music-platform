## ADDED Requirements

### Requirement: Reportar un concierto

Un usuario autenticado SHALL poder reportar un concierto que puede ver con `POST /api/concerts/{id}/report` y un motivo
(`did_not_happen`, `duplicate` o `wrong_data`) con un texto opcional. SHALL existir a lo sumo un reporte abierto por
persona y concierto. Sin sesión la API SHALL responder `401`.

#### Scenario: Reporte

- **WHEN** una persona reporta un concierto como "no ocurrió"
- **THEN** se crea un reporte pendiente que aparece en la cola de moderación

#### Scenario: Reporte repetido

- **WHEN** la misma persona vuelve a reportarlo mientras el primero sigue abierto
- **THEN** no se crea otro reporte

### Requirement: Moderar conciertos

Con permiso de moderación SHALL poder ocultarse un concierto, restaurarse (vuelve a confirmado si alguna vez se confirmó,
si no a por confirmar) y fusionarse en otro concierto: los recuerdos enlazados pasan al destino; si la persona ya estaba
en el destino, su recuerdo del origen SHALL quedar sin enlace y no borrarse. El origen SHALL quedar oculto con el enlace
al destino y el destino SHALL reevaluar su confirmación. Cada acción SHALL quedar auditada con su motivo y resolver los
reportes abiertos del concierto.

#### Scenario: Fusionar duplicados

- **WHEN** una moderadora fusiona un concierto con 2 personas en otro donde una de ellas ya estaba
- **THEN** el destino suma a la otra persona, el recuerdo repetido queda sin enlace y el origen queda oculto

#### Scenario: Sin permiso

- **WHEN** una persona sin permiso de moderación intenta ocultar un concierto
- **THEN** la API responde `403`
