## Why

En la búsqueda avanzada de Artistas, **Persona** mezcla dos búsquedas distintas: la de un solista (Madonna, Javiera
Mena), que es una entidad como un grupo y se busca igual que Iron Maiden, y la de alguien conocido por su rol en discos
ajenos (el guitarrista de una banda, un productor, un músico de sesión), que es una búsqueda más específica. Hoy el
solista se busca con "Persona + Rol: Con discografía propia", que además pasa a solo catálogo y pierde MusicBrainz.
`add-catalog-search-fields` dejó el rol como un sub-campo de Persona; este cambio sube esa distinción al Tipo.

## What Changes

- **Tipo** en Artistas pasa a **Cualquiera / Grupo / Solista / Otras personas** (`artistType=group|solo|other`).
- **Solista** se busca como **Grupo**: base propia y MusicBrainz (`type:person`), con los mismos campos y "Activo entre".
  Quita las personas que el catálogo sabe que no tienen discos propios (discografía explorada y ninguno como principal).
  Con un campo del catálogo, exige algún disco propio.
- **Otras personas** es siempre solo del catálogo: personas con datos de integrante o de personal. Sin rol, solo las que
  no tienen discos propios; **Rol** (solo con Otras personas) ofrece Integrante de una banda, Producción o técnica y
  Músico invitado o de sesión, y con un rol entran también solistas que lo cumplen. "Activo entre" no se ofrece con Otras
  personas.
- Se retira el rol **Con discografía propia** (`role=own`): ahora es Solista.
- Lectura tolerante de las URL anteriores: `artistType=person` se lee como Solista, `person&role=own` como Solista sin
  rol, `person&role=member|producer|musician` como Otras personas con ese rol.
- Pastillas, encabezado ("N solistas", "N personas"), etiqueta del año ("Año de nacimiento" con Solista y Otras
  personas), búsquedas recientes y el contrato de `/api/catalog/search` siguen los tipos nuevos.

## Goals / Non-Goals

**Goals:**
- Que Grupo y Solista sean la misma búsqueda sobre entidades parecidas, con MusicBrainz.
- Que buscar a un integrante, productor o músico de sesión sea una elección explícita del Tipo.
- Que las URL y búsquedas recientes anteriores sigan funcionando.

**Non-Goals:**
- Saber si una persona fuera del catálogo tiene discos propios (MusicBrainz no lo indexa en la búsqueda de artistas).
- Cambiar qué cuenta como producción o como músico, o el orden de los resultados.
- Tipos de MusicBrainz orquesta, coro, personaje u otro.
- El typeahead. En `/search` solo cambia el filtro Persona, que pasa a "Solista" con el mismo valor (`solo`), porque
  el lector de criterios es único.

## Capabilities

### New Capabilities

_(ninguna)_

### Modified Capabilities

- `advanced-search-filters`: el campo Tipo de Artistas, el rol de una persona, el criterio de cada campo en las dos
  fuentes, el encabezado de resultados, el período de actividad, las pastillas del catálogo y la lectura tolerante de
  los tipos anteriores.
- `catalog-search`: el filtro de tipo de `/search` se llama Solista/Grupo.

## Impact

- `src/services/catalog/search/`: `filters.ts` (valores, lectura tolerante, pastillas, `isCatalogOnly`), `mb-query.ts`
  (`solo` → `type:person`), `local-match.ts`, `artists.ts` y `catalog-fields.ts` (condición de Solista y de Otras
  personas), `types.ts` / `schemas.ts`.
- Formulario (`AdvancedSearchForm.tsx`), `CriteriaChips`, encabezado y búsquedas recientes; `messages/{es,en}/catalog.json`
  y `client-messages.json`.
- Docs: `docs/04-api/contracts.md` (`artistType`, `role`) y `docs/05-features/catalog-browsing.md`.
- Sin migraciones ni dependencias nuevas.
