## Why

La curaduría del perfil quedó con piezas que se pisan. La Tarjeta de Identidad ya reemplazó al Himno y al marcador "me define" y tiene su propio editor, pero el editor de Destacados sigue alojando una segunda sección de Himno, y las ★ de Destacados y de Álbumes favoritos hacen lo mismo que ese editor (con el efecto sorpresa de que el ítem marcado desaparece del muro). Además "Álbumes favoritos" muestra las mismas carátulas que la fila de álbumes de Favoritos, que ya tiene tope y página propia. Hoy el dueño ve dos editores para la misma decisión y el visitante ve dos grillas de los mismos álbumes.

Lo único que ninguna otra sección ofrece es la **nota** de hasta 120 caracteres de Destacados ("mi puerta de entrada al jazz"): la voz del dueño sobre algo que no valoró ni reseñó. Este cambio conserva eso y reformula la sección alrededor de ello.

## Goals

- Un solo lugar para editar cada cosa: la Tarjeta de Identidad (artista, álbum, canción) se edita únicamente en su propio editor.
- Que el perfil no repita los mismos álbumes en dos secciones vecinas.
- Darle a Destacados un propósito propio y distinto de Favoritos (lo que amo) y de la Tarjeta (lo que me define): **"Empieza por aquí"**, hasta 4 recomendaciones dirigidas al visitante, cada una con su nota a la vista.
- No perder datos del usuario: los favoritos de álbum siguen siendo favoritos.

## Non-Goals

- No cambiar el máximo (4), los tipos mezclados, el orden manual ni el límite de 120 caracteres de la nota.
- No hacer obligatoria la nota (los destacados existentes no la tienen y no se invalidan).
- No permitir elegir destacados fuera de los favoritos del dueño (el editor sigue eligiendo de favoritos; la API ya acepta cualquier entidad del catálogo y no cambia).
- No dar un orden manual a los favoritos ni "fijar" favoritos: Favoritos se mantiene por recencia.
- No tocar la Tarjeta de Identidad (contenido, diseño, endpoints `/api/me/profile/anthem` y `/api/me/profile/pinned/defining`) ni "Valoraciones destacadas", listas fijadas o diario destacado.
- No convertir el primer álbum del onboarding en álbum definitorio.

## What Changes

- **"Destacados" pasa a ser "Empieza por aquí"** (es) / "Start here" (en): mismos 4 ítems mezclados con orden y nota, pero la nota se muestra siempre junto al ítem (tarjeta con carátula, título, artista y nota) y el editor la pone en primer plano. Los destacados **ya no excluyen** al artista o álbum de la Tarjeta de Identidad: al desaparecer el marcador ★, fijar un destacado y definir la identidad son decisiones independientes.
- **Se elimina el Himno del editor de Destacados** y su fila en Curaduría. El himno se elige solo desde la Tarjeta de Identidad (en modo edición y en `/me/settings/profile`).
- **Se eliminan las ★ "me define"** de los editores de Destacados y de Álbumes favoritos. El artista y el álbum definitorios se eligen únicamente en el editor de la Tarjeta de Identidad (sin cambio de endpoints).
- **Se elimina la sección "Álbumes favoritos"** del perfil, su editor, su fila en Curaduría y `PUT/DELETE /api/me/profile/album-favorites`. Los favoritos de álbum se ven en Favoritos.
- **BREAKING (datos):** se elimina la tabla `user_album_pin` (migración nueva). Se pierde el orden manual de los álbumes fijados; los `favorite` de álbum no se tocan.
- **BREAKING (API):** `POST /api/me/onboarding` deja de devolver `albumFavorites` (solo `onboardedAt`); `GET /api/me/default-audience/apply` deja de devolver `highlighted.pinnedAlbumFavorites`; el objeto `showcase` de `/api/me/profile/pinned` y `/api/me/profile/anthem` deja de incluir `anthem` de primer nivel (queda `identityCard.anthem`).
- **Onboarding, Puerta 1:** los álbumes elegidos se guardan como favoritos de álbum con la audiencia por defecto, sin fijar ni ordenar. El tope de 6 se conserva como límite del onboarding.
- **Aplicar audiencia por defecto:** ya no cuenta ni menciona "álbumes favoritos fijados" (el aviso de fijados habla solo de listas).
- **Ajustes → Curaduría:** quedan Empieza por aquí (editable), listas fijadas, valoraciones destacadas y diario destacado.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `profile-showcase`: "Cuatro destacados" se renombra y se reformula como "Empieza por aquí" (nota visible, sin exclusión por la Tarjeta); "Marcar un artista o álbum como definitorio" se reemplaza por un requisito de la Tarjeta de Identidad que se edita solo desde su editor, sin dependencia de destacados ni de álbumes favoritos.
- `social-profiles`: la composición por niveles deja de listar "Álbumes favoritos"; el Nivel 2 abre con "Empieza por aquí".
- `owner-settings`: la pantalla Curaduría deja de listar Himno y Álbumes favoritos.
- `profile-edit-mode`: los controles de edición por bloque dejan de incluir Álbumes favoritos y el Himno dentro de Destacados.
- `profile-identity`: la edición desde el perfil habla de la Tarjeta de Identidad y de "Empieza por aquí".
- `onboarding`: la Puerta 1 crea favoritos de álbum, no Álbumes favoritos fijados; el cierre deja de devolver la lista sembrada.
- `default-audience`: aplicar a todo lo existente y su vista previa dejan de considerar álbumes favoritos fijados.
- `profile-album-identity`: **se retira por completo** (los cuatro requisitos pasan a REMOVED; la carpeta de la spec se elimina al archivar).

## Impact

- **Código:** `src/components/profiles/` (`OwnerShowcaseEditor`, `PinnedShowcase`, `OwnerAlbumFavoritesEditor` y `AlbumFavorites` se borran o reescriben, `EditableBlock` sin uso para álbumes), `src/app/[locale]/users/[username]/{page,sections}.tsx`, `src/app/[locale]/me/settings/curation/page.tsx`, `src/services/profiles/{album-favorites,showcase,curation}.ts`, `src/services/onboarding/onboarding.ts`, `src/services/social/apply-audience.ts`, `src/components/settings/DefaultAudienceSettings.tsx`, `src/components/onboarding/`.
- **API:** se elimina la ruta `/api/me/profile/album-favorites`; cambian las respuestas listadas arriba (`src/lib/api/schemas.ts`, `docs/04-api/contracts.md`).
- **Base de datos:** migración nueva que hace `DROP TABLE user_album_pin` (verificar el siguiente número libre; hoy el último es `0037`); se retira `userAlbumPin` de `src/db/schema.ts`.
- **i18n:** `messages/{es,en}/users.json` (`albumFavorites.*`, `settings.curation.anthem/albumFavorites`, `showcase.*`, textos de audiencia).
- **Docs y specs:** `docs/05-features/user-profile.md`; tras archivar, actualizar el `## Purpose` de `onboarding`, `profile-showcase`, `profile-in-rotation` y `profile-reviews`, que mencionan "Álbumes favoritos".
- **Tests:** se borran los de álbumes favoritos y se ajustan los de secciones, curación, onboarding y aplicar audiencia.
