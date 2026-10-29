## Why

La auditoría de `/me/settings` (2026-10-29) reprodujo con la sesión del usuario el fallo que reportó: al pulsar
"Ajustes", entre 0,9 s y 3,2 s la página muestra solo el menú lateral, sin pantalla marcada y sin contenido.

- **Causa:** `/me/settings` es una página que solo redirige a `/me/settings/profile`, pero vive **dentro** del layout
  del área. En una navegación del cliente, el servidor responde 200 con el layout completo (~190 KB) y un
  `NEXT_REDIRECT`; el navegador pinta el menú con la ruta `/me/settings` (ninguna pestaña coincide), deja vacío el
  contenido y hace una segunda petición. En desarrollo esa ida y vuelta tarda 1–2 s; en producción cada respuesta tarda
  ~30–60 ms, pero siguen siendo dos viajes con un estado intermedio vacío, y con una red real se ve.
- **Enlaces a la puerta:** el menú de usuario, el pie y la tarjeta de ajustes del perfil apuntan a `/me/settings`.
- **Sin estado de carga:** no hay `loading.tsx`; al cambiar de pantalla no se ve que algo carga.
- **Base:** las seis pantallas se llaman "music-platform"; en el móvil el menú es una fila con scroll que puede dejar
  la pantalla activa fuera de la vista (en Cuenta queda a 530 px) con pestañas de 38 px; tres textos usan voseo en una
  interfaz que tutea.

## What Changes

- La redirección de `/me/settings` deja de renderizar el layout: las pantallas pasan a un grupo de rutas
  `(screens)` con su layout, y `/me/settings/page.tsx` queda fuera (sin cambiar ninguna URL).
- El menú de usuario, el pie y la tarjeta de ajustes enlazan directo a `/me/settings/profile`.
- `loading.tsx` en el área: el menú se pinta con la pantalla marcada y el contenido muestra un esqueleto mientras
  carga.
- Título propio por pantalla ("Perfil · Ajustes", …).
- Menú en el móvil: la pantalla activa se desplaza a la vista, pestañas de 44 px con puntero grueso y sin barra de
  scroll visible.
- Voseo corregido ("Cómo apareces…", "usa «Desactivar»", "usa este link").
- Medición antes/después en build de producción.

### Non-Goals

- Reducir los textos que el layout raíz manda al cliente en cada página (~165 KB): cambio aparte, afecta a toda la
  app (decisión del usuario).
- Índice y estado de guardado en Perfil, sesiones plegadas en Cuenta (Fase 2); Red con cifras (Fase 3).

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `owner-settings`: la puerta del área no pinta el menú, los accesos enlazan a Perfil, estado de carga, títulos y menú
  móvil.

## Impact

- `src/app/[locale]/me/settings/(screens)/` (layout, `loading.tsx` y las seis pantallas, movidos), `page.tsx`
- `src/components/settings/{SettingsNav,settings-screens}.tsx`, `src/components/layout/{user-menu-items.ts,Footer.tsx}`,
  `src/components/profiles/OwnerSettingsCard.tsx`
- `messages/{es,en}/users.json`, `messages/es/auth.json`, `docs/05-features/user-profile.md`
