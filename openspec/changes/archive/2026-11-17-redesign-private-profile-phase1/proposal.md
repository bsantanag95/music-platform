## Why

La auditoría del 2026-11-16 (`mockups/private-profile-2026-11/`, sin sesión sobre `@pruebatesting`) encontró que quien no
tiene acceso a un perfil privado ve la tarjeta anterior al rediseño del perfil: 672 px, nombre de 24 px y contadores como
píldoras ámbar, con media pantalla vacía a 1440 px. Al aprobar la solicitud, la misma persona aparece con otra cabecera. La
tarjeta dice «privado» tres veces, las secciones bloqueadas parecen botones deshabilitados, «Compartir» queda suelto debajo,
la solicitud enviada solo cambia el texto del botón y algunos textos usan voseo («Pedile», «Desbloqueala», «acá») distinto
del resto del sitio. El usuario eligió la propuesta **A · Cabecera continua**, con el tratamiento de «Solicitud enviada» de
la propuesta C.

## What Changes

- El perfil privado sin acceso usa `ProfileHeader` (la cabecera del perfil rediseñado) en una variante sin acceso: marca
  «Privado», sin Tarjeta de Identidad ni fondo de carátula, sin datos personales ni afinidad, recuentos como texto.
- Debajo, una franja a todo el ancho reemplaza a la tarjeta: «Solo para seguidores» (o el título del estado), una oración, la
  acción de quien mira y, a la derecha, las siluetas de Diario, Favoritos, Listas y Colección física, siempre las cuatro y
  sin datos.
- «Solicitud enviada»: «Pendiente», «Te avisaremos» y «el perfil se abrirá aquí», con «Cancelar solicitud».
- Los estados de bloqueo, solicitud recibida y «cómo te ven» se conservan con la nueva composición.
- Textos más cortos y sin voseo, en ambos idiomas.
- `PrivateProfileCard` se retira.

### Goals

- Que el perfil privado y el accesible sean la misma página, distinta solo en lo que el acceso abre.
- Decir «privado» una vez y explicar en una oración qué hacer según quien mira.

### Non-Goals

- Fase 2 (`redesign-private-profile-phase2`): el aviso genérico y el estado vacío en perfiles públicos con contenido solo para
  seguidores.
- Mostrar la Tarjeta de Identidad o cualquier dato nuevo en el perfil privado.
- Cambiar quién puede ver qué (reglas de acceso, audiencias, API).

## Capabilities

### New Capabilities

_(ninguna)_

### Modified Capabilities

- `social-profiles`: requisito nuevo «Vista del perfil privado sin acceso».

## Impact

`src/app/[locale]/users/[username]/page.tsx` (rama sin acceso), `ProfileHeader` (variante sin acceso: marca, recuentos
como texto, modo mínimo para el bloqueo), nuevo `PrivateProfileDoor` en `src/components/profiles/`, `privateState` movido a
un módulo propio; se borra `PrivateProfileCard` y su test. Mensajes `messages/{es,en}/users.json` (`privateProfile.*`),
`client-messages.json`, `docs/05-features/user-profile.md` ("Perfil privado"). Sin esquema ni API.
