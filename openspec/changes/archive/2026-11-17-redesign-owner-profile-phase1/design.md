## Context

Hoy `page.tsx`, para el dueño real, monta `OwnerEditProvider` con `OwnerProfileBar` (barra en caja: estado → Privacidad,
«Ver cómo te ven», «Valoraciones», interruptor) encima de la cabecera, y pasa a `ProfileHeader` la tarjeta de Ajustes
(`SettingsCardSection` → `OwnerSettingsCard`, con la píldora de solicitudes) dentro de `extras`. `ProfileHeader` dibuja
`FollowButton`, que para `relation === "self"` muestra el texto «Perfil propio». El fondo de carátula
(`HeaderBackdropSection`) usa `-inset-16` dentro de una sección `overflow-hidden`.

Referencia visual: `mockups/owner-profile-2026-11/a-cabecera.html` (estados `#view` y `#edit`).

## Plan en tres fases

| Fase | Cambio | Alcance |
| --- | --- | --- |
| 1 | `redesign-owner-profile-phase1` (este) | Cabecera del dueño: acciones en la fila de la cabecera, marca de estado, línea de solicitudes; sin barra, tarjeta de Ajustes, «Perfil propio» ni «Valoraciones»; `overflow-clip`. |
| 2 | `redesign-owner-profile-phase2` | Cuerpo: marca de audiencia («Seguidores», «Solo tú») solo para el dueño en Diario, Reseñas, Listas y Colección; «+ Registrar», «+ Escribir», «+ Nueva lista», «+ Agregar» en cada sección. |
| 3 | `redesign-owner-profile-phase3` | Edición: lápiz en la Ficha de la franja; el panel de la cabecera se parte en paneles cortos por bloque con un solo «Guardar»; franja «Tu perfil · N de 7» solo mientras falte algo, ocultable. |

## Decisions

Decisiones abiertas de la auditoría, tomadas con la opción recomendada (2026-11-17): marcas de audiencia solo para el dueño
(Fase 2); franja «por completar» en la Fase 3; «Valoraciones» sale del perfil; solicitudes pendientes como línea bajo los
recuentos.

### Acciones del dueño en la cabecera
`ProfileHeader` recibe `ownerActions?: ReactNode`; cuando llega, ocupa el lugar de `FollowButton` en la fila de acciones (antes
de Compartir y los enlaces). `page.tsx` lo pasa solo para el dueño real (no en previsualización). `OwnerHeaderActions` es un
componente cliente que lee `useOwnerEdit()`: un botón «Editar perfil» con `aria-pressed` que con el modo activo se dibuja en
ámbar como «Listo», y el enlace «Ver como visitante» (`?preview=1`). Fuera del proveedor no dibuja nada. Como la cabecera ya
está dentro de `OwnerEditProvider`, no hace falta mover el proveedor.

### Marca de estado
`ProfileHeader` recibe `ownerStatus?: { visibility }` y dibuja junto al `<h1>` una marca «Público» (punto petróleo) o
«Privado» (punto ámbar) como enlace a `/me/settings/privacy`, con nombre accesible que dice que lleva a Privacidad y
audiencia. No cambia nada por sí misma.

### Solicitudes pendientes
`OwnerRequestsSection` (en `sections.tsx`, en su `<Suspense fallback={null}>`) cuenta las solicitudes con
`countPendingFollowRequests` y, si hay, dibuja una línea en ámbar «N solicitudes para seguirte →» a `/me/follow-requests`.
Va en `extras`, donde estaba la tarjeta. Sin solicitudes no dibuja nada.

### Fondo de la cabecera
`overflow-hidden` → `overflow-clip` en la sección de la cabecera: recorta igual pero no crea un contenedor desplazable, así que
el foco no puede correrla. Aplica a todas las vistas.

### Textos
`users.ownerHeader.edit` («Editar perfil»), `.done` («Listo»), `.viewAsVisitor` («Ver como visitante»), `.public`
(«Público»), `.private` («Privado»), `.statusAria` («Visibilidad del perfil: {status}. Cambiarla en Privacidad y audiencia»),
`.pendingRequests` (plural). Se retiran `ownerBar.*`, `editMode.toggle` y la clave de «Perfil propio» si queda sin uso.

## Risks / Trade-offs

- [El interruptor deja de estar arriba de todo] → queda en la primera fila visible bajo el nombre; con el modo activo, cada
  bloque ya muestra su lápiz y «Listo» vuelve a la vista con un desplazamiento.
- [Quitar la tarjeta de Ajustes] → Ajustes sigue en el menú de usuario y la marca de estado lleva a Privacidad.

## Migration Plan

Sin datos ni API; revertir el commit restaura la barra y la tarjeta.
