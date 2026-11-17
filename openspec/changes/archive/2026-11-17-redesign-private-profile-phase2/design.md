## Context

El cuerpo del perfil accesible (`page.tsx`) es una serie de secciones asíncronas, cada una en su `<Suspense>`, que
devuelven `null` para un visitante cuando no tienen nada visible (spec social-profiles, "Estante de contenido vacío"):
franja de identidad, En rotación, Empieza por aquí | Valoraciones destacadas, Reseñas | Diario, Favoritos,
Listas | Colección física y Conciertos. Ninguna sabe si las demás quedaron vacías, así que hoy nada puede dibujar un estado
vacío común. `AnchorsSection` ya hace consultas livianas (una fila) para decidir qué anclas ofrecer, y se oculta con menos
de dos.

Referencia visual: `mockups/private-profile-2026-11/a-continua.html#limited` (aviso al final) y `#empty` (estado vacío).

## Decisions

### Quién lo ve
Visitante de un perfil accesible que no es el dueño y no lo sigue: sin sesión, con sesión sin relación, con una solicitud
recibida de esa cuenta, y el dueño en «cómo te ven» (que ve lo de un anónimo). No lo ven el dueño ni sus seguidores. Un
perfil privado sin acceso no llega acá (Fase 1). La condición vive en `page.tsx`: `!isOwn && profile.relation !== "following"`.

### Un aviso genérico, siempre
El texto no depende de lo que haya oculto, y se muestra aunque no haya nada oculto: decidir mostrarlo según el contenido
oculto revelaría que existe (spec `diary-visibility`). Por eso no se consulta qué es solo para seguidores.

### Saber si hay algo visible
Servicio `profileHasVisibleContent(username, ownerId, viewerId)` en `src/services/profiles/visible-content.ts`: consultas
de una fila, en paralelo, con la vista de ese visitante (las mismas funciones que usan las secciones, así que respetan las
mismas audiencias): diario, reseñas, valoraciones destacadas, favoritos, listas, Caminos, colección, conciertos, En rotación,
Empieza por aquí, la huella y los artistas seguidos, y la ficha musical (que llega en `ProfileView`). Devuelve un booleano,
nunca recuentos. Las consultas van en paralelo, sin cortar en la primera con contenido; el costo es el de
`AnchorsSection` más unas pocas consultas, y solo corre para quien no sigue.

### Composición
Nueva `FollowersNoteSection` en `sections.tsx`, en su propio `<Suspense fallback={null}>` al final del cuerpo. Con contenido
visible dibuja `FollowersOnlyNote` en variante `note`: una fila con borde superior, la oración y la acción a la derecha
(apiladas en teléfono). Sin contenido visible, la variante `empty`: título «Nada público por ahora», la oración sin
«también» y la acción. Como las demás secciones devuelven `null`, el estado vacío queda justo debajo de la cabecera.

### Acción
`FollowButton` sin `requestApproval` (seguir un perfil público es directo) con `refreshProfileOnFollow`; sin sesión, su
enlace «Iniciar sesión para seguir» y, solo en el estado vacío, «Crear cuenta». En «cómo te ven», inerte. Con una solicitud
recibida (`incoming`) no hay acción: aprobar o rechazar ya está en la cabecera.

### Textos
`users.followersNote.note` («Si sigues a @{username}, verás también lo que comparte solo con sus seguidores.»),
`users.followersNote.emptyTitle` («Nada público por ahora») y `users.followersNote.empty` («Si sigues a @{username},
verás lo que comparte solo con sus seguidores.»), en ambos idiomas.

## Risks / Trade-offs

- [Consultas extra en cada visita de quien no sigue] → una fila por sección y solo para ese visitante; `getShowcase` y la
  vista del perfil ya están en `cache()`.
- [Una sección agregada en el futuro sin sumarse al servicio] → el estado vacío aparecería con contenido debajo. El
  servicio lleva un test que enumera las fuentes, y `user-profile.md` lo anota junto a la lista de secciones.

## Migration Plan

Sin datos ni API; revertir el commit quita el aviso.
