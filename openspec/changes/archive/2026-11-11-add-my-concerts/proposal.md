## Why

La plataforma registra cómo una persona vive la música grabada (escuchas, valoraciones, colección física), pero no su
vida en vivo. Registrar los conciertos a los que fue enriquece su perfil con un dato muy personal y social, sin depender
de ninguna fuente externa. Se hace simple ahora, pero con un modelo que pueda enlazarse más adelante a conciertos
reales sin migrar ni reescribir lo que la persona escribió.

## Goals

- Registrar desde la página del artista un concierto al que la persona fue: fecha (al menos el año), país, ciudad,
  recinto, gira, enlace al setlist en setlist.fm y una nota, todo opcional salvo el artista y el año.
- Una página propia **Mis conciertos** (`/me/concerts`) para verlos por año, editarlos y quitarlos, y un riel
  **Conciertos** en el perfil con su página de lectura, respetando la audiencia de cada registro.
- Dejar el registro listo para enlazarse a un concierto real en el futuro (ver design D1), sin construir eso ahora.

## Non-Goals

- Una entidad "concierto" compartida, verificar que el concierto existió o sugerir coincidencias.
- La API de setlist.fm (el enlace lo pega la persona; no se lee nada de setlist.fm).
- Varios artistas por registro (festivales, teloneros): un registro por artista.
- Feed de seguidos, Láminas, compartir, notificaciones o conteos de comunidad en la página del artista.
- Fotos, entradas o calificación del concierto.

## What Changes

- Tabla nueva `concert_entry` (migración `0091`): usuario, artista, fecha parcial (`YYYY`, `YYYY-MM` o `YYYY-MM-DD`),
  país (código ISO), ciudad, recinto, gira, URL de setlist.fm, nota (≤140), audiencia y fechas. `CHECK` en SQL para el
  formato de fecha, el país, los largos, la URL de setlist.fm y la audiencia. Varias entradas por artista.
- API `/api/me/concerts` (listar, crear) y `/api/me/concerts/[id]` (editar, quitar), y lectura ajena
  `/api/users/[username]/concerts` con la misma matriz de visibilidad que la colección.
- Panel "Tu relación" del artista: fila **En vivo** después de Colección, con "Registrar" o "Lo viste N veces ·
  Registrar", que abre el formulario.
- Página **Mis conciertos** (`/me/concerts`): agrupada por año, del más reciente al más antiguo, con editar, quitar,
  cambiar la audiencia y registrar uno nuevo eligiendo el artista.
- Perfil: riel **Conciertos** con los últimos registros visibles y página `/users/[username]/concerts`.
- Audiencia por defecto (`default-audience`): los conciertos pasan a ser el sexto tipo de contenido de biblioteca
  (al crear y en "Aplicar a lo existente").
- Exportación de datos de la cuenta con los conciertos; la eliminación de la cuenta los borra en cascada.
- ADR nuevo: el registro es un recuerdo de la persona con enlace futuro opcional a un concierto real.

## Capabilities

### New Capabilities

- `concert-log`: registrar, editar y quitar conciertos propios; audiencia; página Mis conciertos; lectura ajena,
  riel y página en el perfil; exportación.

### Modified Capabilities

- `artist-personal-panel`: el panel suma la fila En vivo (orden y cantidad de filas).
- `default-audience`: el alcance pasa de cinco a seis tipos de contenido, con los conciertos.

## Impact

- Esquema: `drizzle/0091_concert_entry.sql`, `src/db/schema.ts`, `docs/03-data/sql-model.md`.
- Servicios: `src/services/concerts/` (nuevo), `src/services/catalog/artist-personal.ts`,
  `src/services/social/apply-audience.ts`, `src/services/profiles/data-export.ts`.
- API: rutas nuevas bajo `/api/me/concerts` y `/api/users/[username]/concerts`; `docs/04-api/contracts.md` y
  `errors.md`.
- UI: `ArtistRelationPanel`, `src/components/concerts/` (nuevo), `/me/concerts`, `/users/[username]/concerts`, riel del
  perfil, entrada en la navegación personal; mensajes `es`/`en` y `client-messages.json`.
- Docs: ADR nuevo, `docs/01-product`/`05-features` (sección de la biblioteca personal), `business-rules.md` y
  `domain-model.md`.
- Sin dependencias nuevas ni salidas a servicios externos.
