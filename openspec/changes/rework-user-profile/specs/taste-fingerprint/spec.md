## ADDED Requirements

### Requirement: Resumen cualitativo para los niveles 1 y 2

El sistema SHALL derivar de la huella de gusto un resumen cualitativo de hasta 3 frases
breves (por ejemplo, la década o el género predominante, o el patrón general de valoración)
para mostrarse en los niveles 1 y 2 del perfil (ver `social-profiles`, "Composición del
perfil por nivel de acceso"), sin gráficos ni cifras. El resumen SHALL respetar las mismas
reglas de audiencia que el resto de la huella: SHALL calcularse solo sobre lo visible para
el visitante, y SHALL NOT mostrarse cuando no hay datos suficientes.

#### Scenario: Resumen con datos suficientes

- **WHEN** un seguidor aprobado abre un perfil cuyo dueño tiene valoraciones y escuchas
  suficientes para calcular la huella
- **THEN** ve hasta 3 frases breves derivadas de la huella en el nivel 1 o 2 del perfil, sin
  ningún gráfico

#### Scenario: Sin datos suficientes

- **WHEN** el visitante no tiene permitido ver la actividad del dueño, o el dueño no tiene
  suficiente actividad
- **THEN** no se muestra ningún resumen cualitativo en los niveles 1 o 2
