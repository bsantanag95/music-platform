## 1. Cabecera

- [x] 1.1 `ProfileHeader`: props `ownerActions` y `ownerStatus`; `ownerActions` reemplaza a `FollowButton`; marca de estado junto al nombre; `overflow-clip`
- [x] 1.2 `OwnerHeaderActions` (cliente): «Editar perfil» / «Listo» con `aria-pressed` y «Ver como visitante»
- [x] 1.3 `OwnerRequestsSection` en `sections.tsx`: línea «N solicitudes para seguirte →» solo si hay

## 2. Página

- [x] 2.1 `page.tsx`: sin `OwnerProfileBar` ni `SettingsCardSection`; pasa `ownerActions`, `ownerStatus` y la línea de solicitudes en `extras` solo al dueño real
- [x] 2.2 Borrar `OwnerProfileBar`, `OwnerSettingsCard` y sus tests; actualizar `ViewAsBanner` (comentario) y `page.test.tsx`

## 3. Tests

- [x] 3.1 `ProfileHeader`: con `ownerActions` no hay `FollowButton` ni «Perfil propio»; marca de estado pública y privada enlaza a Privacidad
- [x] 3.2 `OwnerHeaderActions`: alterna el modo edición, `aria-pressed`, «Listo»; enlace a `?preview=1`; nada fuera del proveedor
- [x] 3.3 `OwnerRequestsSection`: con y sin solicitudes

## 4. Textos, documentación y verificación

- [x] 4.1 `users.ownerHeader.*` en `messages/{es,en}/users.json`; quitar `ownerBar.*` y las claves sin uso; `pnpm run i18n:client-messages`
- [x] 4.2 `docs/05-features/user-profile.md`: vista del dueño y plan de las Fases 2 y 3
- [x] 4.3 `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build`
- [x] 4.4 Navegador con la sesión del dueño a 1440 y 390 px: acciones en la cabecera, modo edición, «Ver como visitante», sin desborde ni desplazamiento lateral de la cabecera; un visitante sin cambios
