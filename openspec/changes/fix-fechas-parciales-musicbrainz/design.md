## Context

MusicBrainz representa la precisión de una fecha en el propio formato del valor: una edición
puede tener `1985`, `1985-06` o `1985-06-15`. El modelo local usa `release.release_date DATE`,
que solo puede recibir la última de esas formas. `findOrIngestTracklist` inserta actualmente
`full.date` sin transformación, por lo que una fecha anual aborta toda la ingesta.

La página debe poder mostrar al menos el año incluso cuando no existe precisión exacta. Sin
embargo, esta corrección se limita a evitar el fallo de persistencia; conservar el año requiere
una evolución posterior del esquema.

## Goals / Non-Goals

**Goals:**

- Validar y normalizar fechas externas antes de enviarlas a PostgreSQL.
- Persistir únicamente fechas completas en `release_date`.
- Tratar fechas parciales como información válida pero no apta para `DATE`, guardando `null` en
  `release_date` sin inventar precisión.
- Dejar documentado el futuro campo `release_year`, que permitirá mostrar el año para fechas
  anuales o mensuales aunque `release_date` sea nulo.

**Non-Goals:**

- No crear todavía la migración ni la columna `release_year`.
- No cambiar el contrato REST ni el diseño de la página de álbum en este change.
- No modificar el rate limit, selección de edición o cliente de MusicBrainz.

## Decisions

### Normalizador explícito y puro

Se creará una función pura que reciba `string | undefined` y devuelva `string | null`:

- `YYYY-MM-DD` válido → el mismo valor.
- `YYYY` o `YYYY-MM` → `null`.
- Ausente o formato inválido → `null`.

El helper quedará aislado para poder probarlo sin base de datos ni red. Se usará tanto en
`values` como en `onConflictDoUpdate`, evitando que un upsert posterior vuelva a introducir el
bug.

### No convertir fechas parciales al primer día

Convertir `1985` en `1985-01-01` sería técnicamente aceptado por PostgreSQL, pero semánticamente
falso. La UI no debe presentar una precisión inexistente.

### Evolución futura con `release_year`

La siguiente evolución de datos deberá añadir un campo nullable `release_year` (año entero) y
mantenerlo separado de `release_date`. Para una fecha completa se podrán guardar ambos valores;
para una fecha parcial se guardará el año conocido en `release_year` y `release_date` seguirá
siendo `null`. La página deberá mostrar el año como fallback cuando no haya fecha exacta.

## Risks / Trade-offs

- **Se pierde temporalmente el año en la base actual** → queda documentado como deuda explícita
  y se cubre con `release_year` en un change posterior.
- **MusicBrainz entrega un formato inesperado** → el normalizador devuelve `null` y un test evita
  que el valor llegue a PostgreSQL.
- **Existe una edición previamente guardada con fecha exacta** → el upsert conserva la fecha
  normalizada recibida; no se ejecutan migraciones destructivas.

## Migration Plan

1. Implementar el helper y aplicarlo a la ingesta.
2. Añadir tests unitarios, de regresión y smoke test con `1985`.
3. Actualizar `docs/03-data/sql-model.md` con la regla actual y la evolución futura.
4. Ejecutar `pnpm run typecheck`, `pnpm run lint`, `pnpm run test` y `pnpm run build`.

No hay migración SQL en este change. El rollback consiste en revertir el helper y sus llamadas.

## Open Questions

No quedan preguntas abiertas para esta corrección. La implementación de `release_year` queda
registrada como trabajo posterior y no debe resolverse inventando una fecha exacta.
