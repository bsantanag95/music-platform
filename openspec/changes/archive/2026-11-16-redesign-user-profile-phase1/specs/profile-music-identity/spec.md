## MODIFIED Requirements

### Requirement: Ficha de la Placa

El perfil SHALL mostrar una ficha ("de disco") en la franja de identidad que sigue a la
cabecera (ver `social-profiles`, "Franja de identidad"), con las etiquetas en tipografía de
datos y los valores a su lado: "Soy" (roles), "Géneros", "Escucho en" y una fila por cada
pregunta respondida con su etiqueta corta. La ficha SHALL omitir cada fila vacía y SHALL
omitirse por completo cuando la persona no completó ninguna, sin dejar hueco ni divisor. La
ficha SHALL mostrarse únicamente en un perfil accesible (público, seguidor aprobado o dueño)
y SHALL NOT mostrarse en la tarjeta de un perfil privado sin acceso. Ninguna fila SHALL
exponer números de actividad ni logros.

#### Scenario: Perfil completo

- **WHEN** un visitante abre el perfil de alguien con roles, géneros, formatos y dos preguntas
- **THEN** la franja de identidad muestra la ficha con "Soy", "Géneros", "Escucho en" y las
  dos preguntas

#### Scenario: Perfil sin datos nuevos

- **WHEN** un visitante abre el perfil de alguien que no completó ninguno de estos campos
- **THEN** el perfil no muestra ficha ni espacio vacío en su lugar

#### Scenario: Fila parcial

- **WHEN** la persona solo completó los géneros
- **THEN** la ficha muestra únicamente la fila "Géneros"

#### Scenario: Perfil privado sin acceso

- **WHEN** un visitante sin acceso abre un perfil privado
- **THEN** la tarjeta del perfil privado no muestra la ficha
