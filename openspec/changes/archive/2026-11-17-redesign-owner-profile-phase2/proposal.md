## Why

La auditoría del 2026-11-17 (`mockups/owner-profile-2026-11/`) encontró dos huecos en el cuerpo del perfil visto por su
dueño. Nada indica qué no es público: entradas del diario, favoritos y listas públicas, solo para seguidores y privadas se
ven mezcladas, y la única forma de saberlo es «Ver como visitante», que recarga la página. Y ninguna sección ofrece agregar:
Diario, Favoritos, Listas y Colección solo muestran «Ver todo», así que el dueño tiene que ir al botón «Añadir» del sitio o
a otra página. Es la Fase 2 de la propuesta **A · Cabecera del dueño** (Fase 1: `redesign-owner-profile-phase1`).

## What Changes

- En la vista del dueño, las entradas del diario, los favoritos y las listas (y listas para completar) que no son públicas
  llevan una marca discreta con su icono: «Seguidores» o «Solo tú». Las públicas no llevan marca.
- Diario, Favoritos, Listas y Colección física ofrecen al dueño una acción para agregar junto a «Ver todo»: «+ Registrar»,
  «+ Agregar», «+ Nueva lista», «+ Agregar». Abren el mismo diálogo de «Añadir» del sitio en la acción que corresponde
  (Escucha, Favorito, Nueva lista, Colección), y el perfil se actualiza al cerrarlo si algo cambió.
- Ni las marcas ni las acciones aparecen para visitantes ni en «Ver como visitante».

### Goals

- Que el dueño sepa, sin salir de su perfil, qué ve cada audiencia y pueda agregar donde mira.

### Non-Goals

- Marcas en la Colección física: su vista previa agrupa por artista, con copias de distintas audiencias.
- Reseñas: no tienen audiencia propia, y se escriben desde la página del álbum.
- Cambiar audiencias desde el perfil; la Fase 3 (`redesign-owner-profile-phase3`).

## Capabilities

### New Capabilities

_(ninguna)_

### Modified Capabilities

- `social-profiles`: requisito nuevo «Marcas de audiencia y acciones para agregar del dueño».

## Impact

`src/app/[locale]/users/[username]/sections.tsx` (pasa `isOwn` a las vistas previas y las acciones a los estantes),
`ProfileRail` (prop para la acción del dueño), `DiaryPreviewTable`, `FavoritesPreview`, `ListsAndCaminosPreview` (marca de
audiencia opcional), nuevos `AudienceMark` y `OwnerAddAction` en `src/components/profiles/`, `QuickActionsDialog` (sin
cambios de contrato: ya acepta `initialAction`). Mensajes `messages/{es,en}/users.json`, `client-messages.json`,
`docs/05-features/user-profile.md`. Sin esquema ni API.
