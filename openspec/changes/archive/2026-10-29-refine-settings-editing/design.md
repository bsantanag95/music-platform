## Context

Los editores del dueño (`OwnerIdentityEditor`, `OwnerMusicIdentityEditor`, `OwnerPromptsEditor`, `OwnerLinksEditor`,
`OwnerAvatarEditor`) informan su estado por `EditorHostContext` (`useReportDirty`, `useNotifySaved`); el panel lateral
del modo edición lo usa para pedir confirmación al cerrar. La pantalla Perfil los monta dentro de `SettingsCard`
(servidor), sin anfitrión, así que hoy nadie escucha ese estado.

## Decisions

### D1 — Tarjeta anfitriona

`SettingsEditorCard` (cliente) reemplaza a `SettingsCard` en Perfil: provee `EditorHostContext`, agrega el estado de
sus editores y, mientras alguno tiene cambios, muestra "● Cambios sin guardar" en su esquina. Lleva `id` (ancla del
índice) y una etiqueta, y reporta `{ id, label, dirty }` al guardián del área (D3). No cambia los editores.

### D2 — Índice

`SettingsSectionIndex` (cliente): fila de enlaces a `#settings-<id>`, pegajosa bajo la cabecera del sitio
(`sticky`, fondo de la página), con scroll horizontal en el móvil. Marca la tarjeta visible con un
`IntersectionObserver` y añade un punto ámbar a las que tienen cambios (lee el guardián). Las tarjetas llevan
`scroll-mt` para que el ancla no quede bajo la fila.

### D3 — Aviso al salir

`UnsavedChangesGuard` (cliente) envuelve el contenido del layout del área y mantiene qué tarjetas están sucias.
Con alguna:

- `beforeunload` pide la confirmación del navegador (cerrar o recargar la pestaña);
- un clic en un enlace interno (mismo origen, sin `target`, sin teclas modificadoras, distinto de un ancla de la misma
  página) se detiene y abre `ConfirmDialog` ("¿Salir sin guardar?", nombra las tarjetas); "Salir sin guardar" navega
  con el router, "Seguir editando" cierra.

El App Router no ofrece bloquear navegaciones; interceptar los clics cubre el menú lateral, la cabecera y el pie. El
botón atrás del navegador no se intercepta (riesgo aceptado).

### D4 — Sesiones plegadas

`SessionsCard` muestra la actual y las 2 más recientes (el servicio ya las devuelve con la actual primero y luego por
última actividad); "Ver las N más" / "Mostrar menos" alterna el resto. Nuevo `DELETE /api/me/sessions`: cierra todas
las sesiones salvo la actual (`deleteOtherSessions`, el mismo que usa el cambio de contraseña) y la tarjeta deja solo
la actual. Se ofrece cuando hay al menos otra sesión; "Cerrar todas las sesiones" (también esta) se mantiene.

## Risks / Trade-offs

- El guardián depende de la delegación de clics; un `router.push` programático no pasa por él (ningún control del área
  navega así con cambios pendientes).
