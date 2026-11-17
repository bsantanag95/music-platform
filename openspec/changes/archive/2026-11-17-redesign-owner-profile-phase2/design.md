## Context

Las vistas previas del cuerpo ya reciben la audiencia de cada elemento: `DiaryEntry.audience`, `FavoriteEntry.audience`,
las listas (`audience`) y los Caminos (`audience`). Las secciones de `sections.tsx` conocen `isOwn` (falso en la
previsualización). El diálogo de «Añadir» del sitio (`QuickActionsDialog`) acepta `initialAction` (`listen`, `favorite`,
`newList`, `collection`…) y avisa de cada cambio con el evento de `window` `OWN_DATA_CHANGED_EVENT`. Existe `AudienceIcon`
(`components/favorites/FavoriteActions.tsx`) con los iconos de privado, seguidores y público.

Referencia visual: `mockups/owner-profile-2026-11/a-cabecera.html#view`.

## Decisions

### Marca de audiencia
`AudienceMark` (servidor): `AudienceIcon` + «Seguidores» o «Solo tú» en tipografía de datos, apagada; para `public` no dibuja
nada. Las vistas previas reciben `showAudience?: boolean` y solo lo pasa `sections.tsx` con `isOwn`. Lugar: en el diario, la
última columna de la fila (donde está el contexto, a su lado); en favoritos, bajo el título de la carátula o al final de la
fila de la lista de artistas y canciones; en listas, en la línea de metadatos de la tarjeta. Sin leyenda: la marca lleva su
propio texto.

### Acción para agregar
`OwnerAddAction` (cliente): botón «+ {rótulo}» en ámbar, tipografía de datos, que monta `QuickActionsDialog` con
`initialAction`. Mientras está abierto escucha `OWN_DATA_CHANGED_EVENT`; al cerrar, si hubo algún cambio, hace
`router.refresh()` para que el perfil (Server Components) muestre lo nuevo, y devuelve el foco al botón. `ProfileRail` recibe
`ownerAction?: ReactNode`, dibujado antes de «Ver todo».

| Estante | Rótulo | `initialAction` |
| --- | --- | --- |
| Diario | «Registrar» | `listen` |
| Favoritos | «Agregar» | `favorite` |
| Listas | «Nueva lista» | `newList` |
| Colección física | «Agregar» | `collection` |

Los estantes vacíos del dueño (`EmptyRailForOwner`) también reciben la acción, así que agregar el primer elemento ya no
pide ir a otra página.

### Textos
`users.ownerAdd.listen` («Registrar»), `.favorite` («Agregar»), `.newList` («Nueva lista»), `.collection` («Agregar»),
con nombres accesibles completos (`.listenAria` «Registrar una escucha», etc.); `users.audienceMark.followers`
(«Seguidores»), `.private` («Solo tú»).

## Risks / Trade-offs

- [Recargar el perfil tras agregar] → solo si hubo un cambio, y el perfil ya refresca así tras editar un bloque.
- [El diálogo monta su propio buscador en el perfil] → es el mismo componente del Header; se carga solo al abrirlo.

## Migration Plan

Sin datos ni API; revertir el commit quita marcas y acciones.
