## Why

La Fase 1 dejó el año armado solo por el sistema. El principio de la casa es "acá lo *construyes*" (`docs/00-product/product_philosophy.md`): falta la
parte de la persona. Esta fase suma el Top 5 del año y la posibilidad de ocultar discos, y la imagen que se publica: el año completo en formato
Publicación. Es la segunda de tres fases de `add-year-in-discs`.

## What Changes

- **Top 5 del año:** prellenado con los discos de ese año mejor valorados por la persona (a igual nota, los más escuchados; sin nota suficiente, se
  completa con los más escuchados). Lo puede cambiar y ordenar, siempre entre los discos que escuchó ese año.
- **Ocultar discos:** un disco oculto desaparece del año para todos los demás: del calendario, del Top 5, de la imagen y de las cifras (sus escuchas no
  cuentan). El dueño ve sus ocultos aparte y los puede volver a mostrar. Ocultar no toca el diario.
- **Imagen Publicación (1080×1350)** con el Top 5 numerado, el calendario de los doce meses y las cifras. Hasta **10 carátulas**: las del Top 5 y las
  del disco más escuchado de los meses con más escuchas; los demás meses, en texto. Cabe en el tope de lo que arma una persona (ADR 0051): el año pasa a
  estar curado por su dueño. Historia usa el mismo cuerpo; Enlace sigue con el marco común, ahora con el Top 5.
- Migración `0088` (`year_top`, `year_hidden`).

Fuera de esta fase: invitación de diciembre y "Arma la tuya" (Fase 3); canciones en el Top 5.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `year-laminas`: Top 5 del año, ocultar discos y su efecto en las cifras.
- `share-images`: imagen del año en Publicación e Historia, con su tope de carátulas.

## Impact

- **Base de datos:** migración `0088` (`year_top`, `year_hidden`).
- **Código:** `src/services/laminas/year.ts` (Top 5, ocultos), `/api/me/year/[year]/top` y `/api/me/year/[year]/hidden/[id]`, página del año (edición
  del dueño), `src/services/share/` (`YearFrame`, objetivo).
- **Dependencias:** ninguna.
- **Docs:** `sharing.md`, `business-rules.md`, `domain-model.md`, `03-data/sql-model.md`, `03-data/data-licensing.md`, `04-api/contracts.md`.
