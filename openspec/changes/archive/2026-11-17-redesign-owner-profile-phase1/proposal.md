## Why

La auditoría del 2026-11-17 (`mockups/owner-profile-2026-11/`, con la sesión del dueño sobre la BD de pruebas) encontró que
el dueño ve su perfil con controles repartidos y duplicados. Encima de la cabecera hay una barra en caja con cuatro cosas
sin relación (estado, «Ver cómo te ven», «Valoraciones» y el interruptor «Editar perfil») que en teléfono ocupa 137 px antes
del nombre. Ajustes aparece dos veces con destinos distintos (el estado lleva a Privacidad; la tarjeta «Ajustes» dentro de la
cabecera lleva a Perfil). Donde el visitante tiene «Seguir», el dueño ve el texto inerte «Perfil propio». Las solicitudes
pendientes solo asoman como una píldora en la tarjeta. Además, el fondo de carátula de la cabecera sobresale 64 px dentro de
una sección `overflow-hidden` que el navegador puede desplazar: al mover el foco, la cabecera se corre de lado (visto a
390 px, afecta a todo visitante). El usuario eligió la propuesta **A · Cabecera del dueño**, con la franja «por completar»
de C en la última fase.

## What Changes

- Se retira la barra del dueño en caja (`OwnerProfileBar`). Sus acciones pasan a la fila de acciones de la cabecera, donde
  el visitante tiene «Seguir»: «Editar perfil» (que pasa a «Listo» con el modo activo), «Ver como visitante» y «Compartir».
- El estado de visibilidad pasa junto al nombre como marca «Público» / «Privado» que enlaza a Privacidad y audiencia.
- Se retiran la tarjeta «Ajustes» de la cabecera, el texto «Perfil propio» y el enlace «Valoraciones» (sigue en el menú de
  usuario).
- Las solicitudes pendientes, cuando las hay, son una línea bajo los recuentos que enlaza a `/me/follow-requests`.
- La cabecera recorta su fondo sin poder desplazarse (`overflow-clip`), para todos.

### Goals

- Una sola fila de acciones del dueño, en el mismo lugar que las del visitante; una sola entrada a Ajustes desde el perfil.
- Que el nombre sea lo primero en teléfono también para el dueño.

### Non-Goals

- Fase 2 (`redesign-owner-profile-phase2`): marcas de audiencia solo para el dueño y acciones para agregar en cada sección.
- Fase 3 (`redesign-owner-profile-phase3`): lápiz en la Ficha, un panel corto por bloque con un solo «Guardar» y la franja
  «Tu perfil · N de 7».
- Cambiar qué se edita o cómo se guarda; cambiar la previsualización «cómo te ven».

## Capabilities

### New Capabilities

_(ninguna)_

### Modified Capabilities

- `profile-edit-mode`: el interruptor vive en la cabecera; la barra del dueño se reemplaza por el estado y las acciones en la
  cabecera.
- `social-profiles`: el «Panel del dueño» deja la tarjeta «Ajustes» por la línea de solicitudes pendientes.

## Impact

`src/components/profiles/ProfileHeader.tsx` (acciones del dueño, marca de estado, línea de solicitudes, `overflow-clip`),
nuevo `OwnerHeaderActions` (cliente, usa `OwnerEditProvider`), `src/app/[locale]/users/[username]/page.tsx` y
`sections.tsx`; se borran `OwnerProfileBar`, `OwnerSettingsCard` y sus tests. Mensajes `messages/{es,en}/users.json`
(`ownerBar.*` → `ownerHeader.*`), `client-messages.json`, `docs/05-features/user-profile.md`. Sin esquema ni API.
