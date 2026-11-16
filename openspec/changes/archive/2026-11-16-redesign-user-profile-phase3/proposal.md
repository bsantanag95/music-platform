## Why

Las Fases 1 y 2 (`redesign-user-profile-phase1`, `-phase2`) dieron al perfil su estructura: cabecera, anclas, franja de
identidad y cuerpo en filas. Todos los perfiles se ven iguales salvo por su contenido. La dirección elegida, «D2 · Mezcla con
personalidad» (`mockups/profile-2026-11/d2-personalidad.html`), suma dos detalles de las propuestas B y C que el usuario
quiso conservar: un **tono por perfil** tomado de la carátula del álbum que lo define, y el **vinilo que asoma** de las
fundas de la Tarjeta de Identidad. Decisión del usuario (2026-11-15): el tono se calcula en el servidor al guardar el álbum
definitorio y se guarda; no al visitar.

## What Changes

- **Tono del perfil**: al elegir o cambiar el álbum definitorio, el servidor analiza su miniatura (≤250 px) con `sharp`,
  toma el matiz dominante (histograma de 12 matices ponderado por saturación), fija la luminosidad y la sube si hace falta
  para contrastar ≥ 3:1 con la tinta, y lo guarda en `user_showcase.profile_tone` (migración nueva). Sin álbum, sin arte o
  sin un matiz saturado: ámbar (`NULL`). Al quitar el álbum, se borra.
- El tono solo tiñe detalles del perfil: la línea inferior de la cabecera, las comillas de la bio, la marca de la sección
  activa de las anclas y la etiqueta del vinilo.
- **Vinilo que asoma**: el álbum y el himno de «Identidad musical» son fundas con un disco detrás que sale a medias al pasar
  el cursor o enfocar; quieto y apenas asomado en táctil; sin animación con movimiento reducido.
- Script `scripts/backfill-profile-tone.ts` para calcular el tono de los perfiles que ya tienen álbum definitorio.

### Goals

- Que cada perfil tenga un acento propio sin perder la paleta del sitio ni el contraste.
- Que visitar un perfil no descargue ni analice imágenes.

### Non-Goals

- El giro del avatar (descartado).
- Usar el tono fuera del perfil (tarjeta flotante, Láminas, imágenes para compartir).
- Que el dueño elija el tono a mano.

## Capabilities

### New Capabilities

_(ninguna)_

### Modified Capabilities

- `social-profiles`: requisito nuevo «Tono del perfil».
- `profile-showcase`: requisito nuevo «Vinilo que asoma en la Tarjeta de Identidad».

## Impact

Migración `drizzle/0097_profile_tone.sql` + `src/db/schema.ts` + `docs/03-data/sql-model.md`; `src/services/profiles/tone.ts`
(nuevo: cálculo puro + `refreshProfileTone`), `showcase.ts` (`setDefiningEntity`/`clearDefiningEntity` lo disparan,
`getProfileTone`), la ruta `PUT/DELETE /api/me/profile/pinned/defining` (con `after()`), `page.tsx` (`--profile-tone`),
`ProfileHeader`, `ProfileAnchors`, `IdentityCard`; `scripts/backfill-profile-tone.ts` y su entrada en
`docs/06-operations/`. Reutiliza `fetchImageBytes` (`src/services/share/images.ts`): no agrega salidas a internet ni
dependencias. La exportación de datos ya incluye la fila de `user_showcase`.
