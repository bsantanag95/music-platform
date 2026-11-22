## ADDED Requirements

### Requirement: Franja «Tu perfil» del dueño

Cuando el dueño ve su propio perfil (no en «Ver como visitante») y le falta alguna de siete partes
—Foto, Bio, Identidad musical, Ficha, Empieza por aquí, Preguntas y Enlaces—, SHALL mostrarse bajo la
cabecera una franja «Tu perfil · N de 7», donde N es el número de partes completas, con una barra de
progreso. Cada parte completa SHALL mostrarse con una marca y sin acción; cada parte pendiente SHALL
ser un botón que abre el panel de edición del bloque que la contiene, sin necesidad de activar el modo
edición. La franja SHALL ofrecer «Ocultar», que la esconde en ese dispositivo, y SHALL NOT mostrarse
con las siete partes completas ni a ningún visitante.

#### Scenario: Perfil incompleto

- **WHEN** el dueño, sin preguntas respondidas ni enlaces, ve su perfil
- **THEN** ve «Tu perfil · 5 de 7» con «Preguntas» y «Enlaces» como acciones pendientes

#### Scenario: Una parte pendiente abre su editor

- **WHEN** el dueño pulsa «Enlaces» en la franja
- **THEN** se abre el panel de la cabecera con el editor de enlaces

#### Scenario: Perfil completo

- **WHEN** el dueño tiene las siete partes completas
- **THEN** la franja no se muestra

#### Scenario: Ocultar

- **WHEN** el dueño pulsa «Ocultar» y vuelve a cargar su perfil en el mismo dispositivo
- **THEN** la franja no se muestra

#### Scenario: Visitante y vista previa

- **WHEN** un visitante ve un perfil incompleto, o el dueño lo ve con «Ver como visitante»
- **THEN** la franja no se muestra
