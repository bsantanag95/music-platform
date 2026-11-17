## 1. Cabecera sin acceso

- [x] 1.1 Mover `privateState` a `src/components/profiles/private-state.ts`
- [x] 1.2 `ProfileHeader` con `locked`: marca «Privado»/«Bloqueada», datos personales vaciados, recuentos como texto, sin seguir/bloquear en la cabecera, modo mínimo en `blockedByThem`
- [x] 1.3 Tests de la variante: marca, recuentos sin enlace, sin pronombres ni ubicación, modo mínimo

## 2. Franja

- [x] 2.1 `PrivateProfileDoor`: título, oración y acción por estado; nota de seguidores en común; siluetas de las cuatro secciones sin datos; moderación al pie
- [x] 2.2 «Solicitud enviada»: «Pendiente», aviso y «el perfil se abrirá aquí», con cancelar
- [x] 2.3 Tests por estado: sin sesión, con sesión, solicitud enviada, solicitud recibida, bloqueo propio, bloqueo de la cuenta, previsualización

## 3. Página

- [x] 3.1 `page.tsx`: la rama sin acceso compone `ProfileHeader` (locked) + `PrivateProfileDoor` + `ViewAsBanner` en previsualización; sin contenedor de 672 px
- [x] 3.2 Borrar `PrivateProfileCard` y su test; actualizar `page.test.tsx`

## 4. Textos, documentación y verificación

- [x] 4.1 Mensajes `privateProfile.*` en `messages/{es,en}/users.json`, sin voseo; quitar las claves retiradas; `pnpm run i18n:client-messages`
- [x] 4.2 `docs/05-features/user-profile.md`, sección "Perfil privado", con el plan de la Fase 2
- [x] 4.3 `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build`
- [x] 4.4 Verificación en el navegador a 1440 y 390 px: `@pruebatesting` sin sesión, sin desborde; el perfil accesible sin cambios
