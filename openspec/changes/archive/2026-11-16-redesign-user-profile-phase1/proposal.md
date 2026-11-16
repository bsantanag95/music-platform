## Why

La auditoría del perfil público (2026-11-15, `/es/users/besantanag95` sin sesión a 1440, 1024, 820 y 390 px; mockups en
`mockups/profile-2026-11/`) encontró que el perfil no presenta a la persona: el nombre mide 20 px, la Tarjeta de Identidad son tres círculos
sin título, el contenedor usa 1024 px y la barra lateral (514 px) deja vacía la columna izquierda durante ~3500 px. A 390 px la Tarjeta de
Identidad empuja el himno fuera de la pantalla, el artista definitorio sale sin foto aunque la tiene, y el avatar no tiene alternativa
cuando su imagen falla. Se eligió la dirección «D2 · Mezcla con personalidad». Esta es la Fase 1 de tres: cabecera, franja de identidad y
marco a todo el ancho.

## What Changes

- **Cabecera del perfil** a todo el ancho: avatar, nombre grande, datos de identidad, bio como cita, enlaces, «Seguir»/«Compartir» y
  acciones de bloqueo/moderación, recuentos, seguidores en común y afinidad; a la derecha la Tarjeta de Identidad como «Identidad musical».
  La carátula del álbum definitorio, difuminada, de fondo.
- **Barra de anclas fija** (Resumen, Diario, Reseñas, Favoritos, Listas, Colección) a las secciones con contenido.
- **Sin columna lateral:** la Placa se desarma en la cabecera y la franja; el cuerpo ocupa todo el contenedor (1280 px).
- **Franja de identidad:** ficha musical | resumen de la huella con su década destacada | «Artistas seguidos» (antes «Exploración»).
- **Arreglos:** Tarjeta de Identidad completa a 390 px; foto del artista definitorio; avatar con caída al monograma si la imagen falla.
- Las secciones del cuerpo conservan su contenido y orden a todo el ancho hasta la Fase 2.

### Goals

- Que en el primer viewport se entienda quién es la persona y qué escucha, y que pueda seguirla o compartir el perfil.
- Eliminar la columna vacía y el desbordamiento a 390 px.

### Non-Goals

- Rediseño del cuerpo (Empieza por aquí, Reseñas | Diario, Favoritos, Listas | Colección): **Fase 2**.
- Tono por perfil y vinilo que asoma: **Fase 3**. El giro del avatar queda fuera.
- La tarjeta del perfil privado sin acceso y las páginas de Nivel 3: sin cambios.

## Capabilities

### New Capabilities

_(ninguna)_

### Modified Capabilities

- `social-profiles`: requisitos nuevos «Cabecera del perfil» y «Franja de identidad»; «Composición del perfil por niveles de acceso» ubica la
  Tarjeta de Identidad en la cabecera y «Artistas seguidos» en la franja.
- `profile-music-identity`: la ficha se muestra en la franja de identidad en lugar de la Placa.
- `profile-affinity`: la insignia de coincidencia se muestra en «Artistas seguidos».

## Impact

`src/app/[locale]/users/[username]/{page,sections}.tsx`; nuevos `ProfileHeader.tsx`, `ProfileAnchors.tsx` e `IdentityStrip.tsx` en
`src/components/profiles/`; `Placa.tsx` (queda para el perfil privado o se retira de la vista accesible), `IdentityCard.tsx` (variante de
cabecera, `min-w-0`, foto del artista), `ExploreSection.tsx` (variante compacta), `FingerprintSummary.tsx` (década destacada),
`UserAvatar.tsx` (caída al monograma), `OwnerProfileBar`/`EditableBlock` (capas del dueño sobre la nueva estructura);
`src/services/profiles/showcase.ts` si la foto del artista no viaja hoy. Mensajes `messages/{es,en}/users.json`, `client-messages.json`,
tests y `docs/05-features/user-profile.md`. Sin API ni esquema en esta fase.
