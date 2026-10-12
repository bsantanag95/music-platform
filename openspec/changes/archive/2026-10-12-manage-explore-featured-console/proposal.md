## Why

Con `automate-explore-collections` el riel de Explorar se llena solo, pero las personas con rol
editorial no tienen forma de decidir qué se destaca: hoy la única escritura sobre `user_list_featured`
es un script. Ya existen los roles (`editorial_curator`, `admin`), la consola `/admin` y el flujo
borrador → propuesta → publicada (ADR 0013); falta el eslabón entre "lista oficial publicada" y
"destacada en Explorar", y un control sobre las plantillas automáticas.

## What Changes

- Panel **"Destacadas en Explorar"** en `/admin`: lista las colecciones destacadas (curadas y
  generadas), permite destacar una lista oficial publicada, quitarla, reordenarla y fijar su vigencia
  (`desde`/`hasta`) y peso.
- Panel **"Generadas automáticamente"**: por plantilla, última corrida, estado, vigencia y acciones de
  pausar/reanudar y forzar regeneración.
- Permiso: destacar, quitar, reordenar y gestionar plantillas exigen `editorial.publish` (solo
  `admin`); ver los paneles exige `editorial.author`. Sin permiso nuevo.
- Reglas en el servicio: solo se destaca una lista **publicada** (oficial, no retirada), pública y de
  `@exploracion`; si se retira o deja de ser pública, sale del riel.
- Auditoría: `editorial_action` admite `feature` y `unfeature`; pausar/reanudar plantillas se audita
  en la tabla de estado de plantillas.
- API bajo `/api/admin/editorial/featured` y `/api/admin/editorial/templates`.
- ADR 0034, migración `0070`, docs (`explore.md`, `contracts.md`, `errors.md`, `sql-model.md`).

## Capabilities

### New Capabilities
- `explore-featured-management`: destacar/quitar/reordenar/vigencia de colecciones y control de
  plantillas automáticas desde la consola editorial, con permisos y auditoría.

### Modified Capabilities
<!-- Ninguna: la lectura del riel ya respeta vigencia y peso (automate-explore-collections). -->

## Goals / Non-Goals

**Goals:**
- Que el equipo editorial decida y programe lo destacado sin tocar código ni BD.
- Poder apagar una plantilla automática que produzca algo inadecuado.

**Non-Goals:**
- Editar el contenido de listas generadas (se pausan, no se editan).
- Asignación de roles por interfaz (sigue siendo operación interna, ADR 0013).
- Crear la lista editorial: ya lo hace la consola actual.
- Personalización por afinidad.

## Impact

- Código: `src/services/discovery/featured.ts` (nuevo), `src/services/lists/editorial.ts`,
  `src/app/api/admin/editorial/featured/**` y `templates/**`, `src/components/admin/` (paneles),
  `src/lib/api/schemas.ts`, `messages/{es,en}`.
- Datos: migración `0070` (`editorial_action` con `feature`/`unfeature`; tabla de estado de
  plantillas) + `schema.ts`.
- Depende de `automate-explore-collections` (columnas de `user_list_featured` y `explore_collection_sync`).
- Sin dependencias nuevas.
