## Context

`src/app/[locale]/me/settings/layout.tsx` envuelve tanto las seis pantallas como `page.tsx`, que solo llama a
`redirect()`. En el App Router, el layout se renderiza antes que la página: una navegación del cliente a
`/me/settings` recibe el layout (con `SettingsNav`, que marca la activa por `usePathname`) y luego el redirect.

Medición en build de producción (`next start`, usuario de prueba, mediana de 5 peticiones RSC):

| Ruta | RSC | Tamaño |
|---|---|---|
| `/me/settings` (redirige) | 41 ms | 193 KB |
| `/me/settings/profile` | 39 ms | 197 KB |
| resto de pantallas | 28–34 ms | 194–198 KB |

En desarrollo, la misma redirección tardó 1,0–2,3 s y se observó 2,3 s de estado vacío en el navegador.

## Decisions

### D1 — La puerta, fuera del layout

Las pantallas y el layout se mueven a `settings/(screens)/` (un grupo de rutas no cambia URLs). `settings/page.tsx`
queda fuera del layout: su redirect responde sin renderizar el menú ni pedir datos (solicitudes pendientes, sesión),
así que ya no existe el estado intermedio "menú sin pantalla". La guarda de sesión sigue en cada pantalla.

Alternativa descartada: redirigir en `next.config` (`redirects()`): habría que repetir la ruta por idioma y la regla
quedaría lejos del área; el grupo de rutas lo resuelve sin configuración.

### D2 — Enlaces directos

`user-menu-items.ts`, `Footer.tsx` y `OwnerSettingsCard.tsx` enlazan a `SETTINGS_DEFAULT_HREF`
(`/me/settings/profile`): un solo viaje y la pantalla correcta desde el primer render. `/me/settings` se conserva para
enlaces viejos.

### D3 — Estado de carga

`(screens)/loading.tsx` envuelve solo el contenido: el layout y el menú se mantienen, el menú marca la pantalla de
destino en cuanto cambia la ruta y el contenido muestra un esqueleto (título, intro y dos tarjetas) con
`aria-busy`.

### D4 — Títulos

Cada pantalla exporta `generateMetadata` con "<Pantalla> · Ajustes" (los nombres del menú).

### D5 — Menú en el móvil

Por debajo de `md`, `SettingsNav` desplaza la pestaña activa a la vista (`scrollIntoView({ inline: "nearest" })`) al
montar y al cambiar de ruta; pestañas de 44 px con puntero grueso; barra de scroll oculta (`scrollbar-width: none`).

## Risks / Trade-offs

- Mover archivos a `(screens)/` cambia rutas de import en las pruebas del área; ninguna URL cambia.
- El esqueleto aparece también en navegaciones rápidas (~40 ms en producción); es breve y no desplaza el menú.
