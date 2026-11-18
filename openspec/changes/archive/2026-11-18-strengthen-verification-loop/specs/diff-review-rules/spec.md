## ADDED Requirements

### Requirement: `REVIEW.md` con disparadores sobre el diff
El repositorio SHALL incluir un `REVIEW.md` en la raíz cuyos ítems tengan tres campos: un **disparador** reconocible en el diff
(rutas o patrones de código), el **check** que debe cumplirse y el **incidente o regla de origen**. Un revisor SHALL aplicar
solo los ítems cuyo disparador coincida con el diff.

#### Scenario: Cambio de esquema
- **WHEN** el diff modifica `src/db/schema.ts`
- **THEN** se aplica el ítem que exige un `.sql` nuevo en `/drizzle/` y la actualización de `docs/03-data/sql-model.md`

#### Scenario: Diff sin coincidencias
- **WHEN** ningún disparador coincide con el diff
- **THEN** no se aplica ningún ítem de `REVIEW.md` y la revisión no reporta hallazgos por esa vía

### Requirement: Ítems iniciales basados en incidentes conocidos
`REVIEW.md` SHALL incluir al menos los siguientes ítems: esquema ↔ migración nueva y `sql-model.md`; `messages/{es,en}` en ambos
idiomas y fecha en `INFO_PAGES`; raw SQL con parámetros `Date` o correlaciones de módulo sin literal de tabla; `CHECK` con `IN`
sobre columna nulable sin `IS NOT NULL`; ruta dinámica con `params` sin `await`; cookie o `localStorage` nuevos sin fila en la tabla
de `/cookies`; edición de un `.sql` ya aplicado; y smoke test que escriba en la BD real.

#### Scenario: Edición de una migración aplicada
- **WHEN** el diff modifica un archivo existente de `/drizzle/*.sql`
- **THEN** el ítem correspondiente exige crear un archivo nuevo en lugar de editar el aplicado

### Requirement: Las reglas se leen de la rama base
La revisión SHALL leer `REVIEW.md` desde la rama base (`main`), no desde el árbol de trabajo ni desde los cambios revisados,
de modo que un cambio no pueda modificar el check que lo juzga.

#### Scenario: Un cambio relaja una regla
- **WHEN** un diff edita `REVIEW.md` para quitar un ítem y además dispara ese ítem
- **THEN** la revisión sigue aplicando el ítem tal como está en la rama base y señala la edición de `REVIEW.md` como cambio que requiere atención humana

### Requirement: Un ítem que escala explica por qué
Cuando un ítem requiere atención humana, el reporte SHALL explicar qué disparador coincidió y por qué importa, citando el
incidente de origen, para que la persona no tenga que deducirlo del diff.

#### Scenario: Reporte de un ítem
- **WHEN** un ítem se dispara y falla su check
- **THEN** el reporte incluye el disparador, el check incumplido y la referencia al incidente de origen
