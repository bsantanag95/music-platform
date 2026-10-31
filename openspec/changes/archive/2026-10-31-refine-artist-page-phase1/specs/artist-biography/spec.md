## ADDED Requirements

### Requirement: Resumen sin repetir en Biografía

Con la pestaña Biografía activa, la cabecera del artista SHALL NOT mostrar el resumen de la biografía ni su enlace
"Seguir leyendo", porque la pestaña ya muestra el texto completo. En las demás pestañas la cabecera SHALL seguir
mostrándolos.

#### Scenario: Pestaña Biografía

- **WHEN** una persona abre la pestaña Biografía de Iron Maiden
- **THEN** el primer párrafo aparece una sola vez, en la pestaña, y la cabecera no tiene "Seguir leyendo"

#### Scenario: Pestaña Discografía

- **WHEN** una persona vuelve a Discografía
- **THEN** la cabecera muestra otra vez el resumen con "Seguir leyendo"
