## Why

Los enlaces externos del perfil aceptan cualquier URL `http(s)` sin comprobar que pertenezca al
sitio elegido: un enlace de tipo Instagram puede apuntar a `http://instagram.com` (la portada, sin
ningún usuario) o a un sitio cualquiera. Además el campo usa `<input type="url">`, cuya validación
nativa del navegador rechaza `www.link.com` sin `https://` con un mensaje que la persona no entiende.
Por último, el perfil muestra el nombre del sitio como texto, cuando un ícono es más compacto y
reconocible.

## What Changes

- **Redes y sitios "por usuario" piden solo el usuario.** Instagram, X, TikTok, YouTube, SoundCloud,
  Bandcamp, Last.fm, Discogs y Spotify: la persona escribe su usuario (con o sin `@`) y el sistema
  construye y guarda el enlace canónico. Si pega el enlace completo **del sitio correcto**, se extrae
  el usuario en vez de dar error; un enlace de otro sitio, o uno sin usuario (la portada), se rechaza
  con un mensaje que dice qué escribir.
- **Enlace acepta la URL sin esquema.** `www.link.com` o `link.com` se guardan como `https://…`; un
  `http://` explícito se respeta y los esquemas no web (`javascript:`, `mailto:`…) se rechazan.
- **Sitio web y Enlace se unifican en Enlace.** Eran idénticos salvo la etiqueta y el ícono; una
  migración pasa las filas `website` a `other` conservando URL y posición.
- **Tipos nuevos: X, TikTok y Spotify** (migración que amplía el `CHECK` de `kind`); y se retira
  `website`.
- **El perfil muestra el ícono de la red, no el texto.** Cada enlace es un ícono con nombre accesible
  ("Instagram: @ana") y tooltip; Enlace muestra una cadena, con el dominio en el tooltip.
- **Editor**: entrada por tipo (placeholder, ayuda y vista previa del enlace resultante), sin la
  validación nativa del navegador, con el error por fila y el mensaje en el idioma de la persona.
- **Contrato de `PUT /api/me/profile/links`**: cada elemento pasa de `{ kind, url }` a
  `{ kind, value }` (lo que la persona escribió; el servidor normaliza y devuelve la `url`
  canónica). **BREAKING** para clientes directos de la API; el único cliente es el editor del propio
  sitio.
- **Los enlaces ya guardados que no coincidan con su tipo no se migran**: se siguen mostrando (con
  ícono genérico) y se validan cuando la persona los edite y guarde.

### Goals

- Que un enlace de red social solo pueda apuntar a un perfil real de ese sitio.
- Que omitir `https://` nunca produzca un error confuso.
- Un perfil más limpio, con íconos reconocibles y accesibles.
- Una única fuente de las reglas por sitio, usada por el cliente y el servidor.

### Non-Goals

- Verificar que el usuario exista realmente en el sitio (no se hacen peticiones externas).
- Migrar o borrar los enlaces que no coinciden con su tipo (solo se convierte `website` en `other`).
- Subir el límite de 5 enlaces ni cambiar su orden.
- Más tipos además de X, TikTok y Spotify (se pueden sumar después con el mismo mecanismo).
- Añadir una librería de íconos: se incrustan los SVG necesarios.

## Capabilities

### New Capabilities

_Ninguna._

### Modified Capabilities

- `profile-identity`: cambia el requisito "Enlaces externos del perfil" (tipos, valor por tipo,
  contrato) y se añaden requisitos para los enlaces por usuario, la normalización de Enlace,
  los enlaces preexistentes que no coinciden con su tipo, la visualización como íconos y la
  validación en el editor.

## Impact

- **Código nuevo:** `src/lib/profile-links.ts` (reglas por sitio, normalización y extracción,
  isomórfico), componente de íconos de enlace.
- **Código afectado:** `src/services/social/types.ts` (`PROFILE_LINK_KINDS`),
  `src/lib/api/schemas.ts` (`ProfileLinkInputSchema`), `src/services/profiles/identity.ts`
  (`replaceLinks`), `src/app/api/me/profile/links/route.ts`,
  `src/components/profiles/OwnerLinksEditor.tsx`, `src/components/profiles/ProfileIdentity.tsx`,
  `src/db/schema.ts`.
- **Base de datos:** dos migraciones sobre `user_profile_link.kind`: `0035` admite `x`, `tiktok` y
  `spotify`; `0036` convierte las filas `website` en `other` y retira `website` del `CHECK`. Sin
  cambio de columnas.
- **Documentación:** `docs/05-features/user-profile.md`, `docs/04-api/contracts.md`, mensajes `es`/`en`.
- **Sin dependencias nuevas.**
