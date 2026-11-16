## Context

`page.tsx` compone, para quien no tiene acceso a un perfil privado (`lockedOut`), `PrivateProfileCard` + `ShareAction`
dentro de un contenedor de 672 px, con `ViewAsBanner` si es el dueño previsualizando. La tarjeta usa `ProfileIdentity`
(variante `md`, recuentos `plain`, `minimal` para el bloqueado por la cuenta) con los datos personales vaciados
(`EMPTY_PERSONAL_INFO`), y debajo el estado de quien mira (`privateState`: anonymous, none, requested, incoming,
blockedByMe, blockedByThem, preview), las cuatro secciones bloqueadas, los seguidores en común (`mutualFollowersHint`) y
`FollowButton` / `BlockButton` / `ProfileModerationActions`. El perfil accesible usa `ProfileHeader` (Fase 1 del rediseño
del perfil).

Referencia visual: `mockups/private-profile-2026-11/a-continua.html` (estados `#anon`, `#logged`, `#requested`) y, para la
solicitud enviada, `c-pasos.html#requested`.

## Plan en dos fases

| Fase | Cambio | Alcance |
| --- | --- | --- |
| 1 | `redesign-private-profile-phase1` (este) | Perfil privado sin acceso: `ProfileHeader` sin acceso + franja «Solo para seguidores» con siluetas; estados por quien mira; textos. |
| 2 | `redesign-private-profile-phase2` | Perfil público visto por quien no sigue: aviso genérico al final («Si sigues a @x, verás también lo que comparte solo con sus seguidores»), mostrado a todo visitante que no sigue aunque no haya nada oculto; estado vacío «Nada público por ahora» cuando no hay ninguna sección visible. |

## Decisions

Decisiones abiertas de la auditoría, tomadas con la opción recomendada (2026-11-16): el aviso de la Fase 2 se muestra a todo
visitante que no sigue; la Tarjeta de Identidad sigue oculta en el perfil privado; las cuatro siluetas se muestran siempre.

### `ProfileHeader` con `access="locked"`
Una prop `locked?: { state: PrivateState }` en vez de un componente aparte: misma estructura y estilos. Con ella, la cabecera
vacía los datos personales (como hoy la tarjeta), muestra la marca «Privado» (o «Bloqueada») junto al nombre, dibuja los
recuentos como texto, no recibe `identity`, `backdrop`, `extras` ni `wrapDetails` (las pasa `page.tsx`), y en
`blockedByThem` se reduce a avatar, nombre y usuario. El botón de seguir y el de bloquear dejan la cabecera: la acción vive en
la franja, para que haya una sola llamada a la acción. «Compartir» queda en la cabecera (hoy suelto).

### `PrivateProfileDoor` (franja)
Server Component a todo el ancho (`max-w-7xl`), dos columnas desde `lg` y apiladas abajo: a la izquierda título (con candado),
una oración y la acción del estado (`FollowButton` con `requestApproval`, «Crear cuenta», «Cancelar solicitud» que es el mismo
`FollowButton` en estado `requested`, `BlockButton` para desbloquear) y la nota de seguidores en común; a la derecha, cuatro
siluetas `aria-hidden` (barras para Diario y Colección, cuadros para Favoritos y Listas) con su nombre. Sin siluetas en los
estados de bloqueo y de solicitud recibida. Reportar/suspender (`ProfileModerationActions`) va al pie de la franja, como hoy.

### Estados y textos
`privateState` pasa a `src/components/profiles/private-state.ts` (lo usan la cabecera y la franja). Títulos: «Solo para
seguidores» (sin sesión, sin relación, previsualización), «Solicitud enviada», «Quiere seguirte», «Bloqueaste a esta
cuenta», «No puedes ver este perfil». Una oración por estado, sin voseo. Se retiran `privateNoticeEyebrow`,
`privateNoticeTitle`, `privateProfile.eyebrowBlocked` y `opensOnFollow`.

## Risks / Trade-offs

- [Los tests de `PrivateProfileCard` cubren estados y permisos] → se trasladan a `PrivateProfileDoor` y a la variante de
  `ProfileHeader`, caso por caso.
- [La cabecera grande para una cuenta bloqueada] → en `blockedByThem` el modo mínimo deja solo nombre y usuario.

## Migration Plan

Sin datos ni API; revertir el commit restaura la tarjeta.
