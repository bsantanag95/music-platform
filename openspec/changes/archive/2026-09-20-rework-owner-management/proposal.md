## Why

La gestión del propio perfil está repartida en tres sitios que mezclan tipos de cosas distintas:
una card con cinco editores apilados sobre el perfil (`OwnerEditors`), un panel de 11 atajos en la
barra lateral (`OwnerHubPanel`) que mezcla biblioteca, red y cuenta, y una página `/me/settings`
que solo contiene el selector público/privado (más el aviso de email sin verificar). El resultado
empuja el perfil real hacia abajo, contradice la decisión de `rework-user-profile` de que el dueño
vea el mismo layout que un visitante con la edición como capa, y no tiene dónde crecer (nombre
visible, sesiones, método de acceso y audiencia por defecto no tienen superficie).

## What Changes

Se separan los ajustes en cinco tipos —**Identidad**, **Curaduría**, **Privacidad y audiencia**,
**Red**, **Cuenta y seguridad**— y se ofrecen por dos vías complementarias:

- **Edición rápida sobre el perfil (B).** Un interruptor "Editar perfil" en la barra superior del
  perfil del dueño pone un lápiz en cada bloque visible. Cada lápiz abre el editor en un **panel
  lateral** (hoja inferior en móvil), una sola superficie para todos los editores. Un chip de
  estado "Perfil público · Ajustes →" enlaza al área de ajustes sin cambiar nada por sí mismo.
- **Área de ajustes (A).** `/me/settings` pasa a ser un área con menú lateral y una pantalla por
  tipo. Es la casa completa de todo: nada queda accesible solo desde la edición sobre el perfil.
- **Panel de gestión sustituido.** El panel de 11 atajos se reemplaza por una tarjeta "Ajustes" con
  el indicador de solicitudes pendientes. La biblioteca (diario, favoritos, por escuchar, listas,
  colección, artistas, recorridos, feed) deja de listarse en el perfil y queda solo en el menú de
  usuario. "Cuentas bloqueadas" pasa a la pantalla Red.
- **Los mismos editores en ambos sitios.** Los componentes `Owner*Editor` existentes se montan
  tanto en el panel lateral como en el área de ajustes, sin duplicar lógica.
- **Fase 2 (Cuenta y privacidad, backend nuevo mínimo).** Edición del nombre visible
  (`displayName`, hoy solo se fija al registrarse), cierre de todas las sesiones (el endpoint
  `DELETE /api/auth/revoke-all` existe sin interfaz), método de acceso en solo lectura, y
  **audiencia por defecto del contenido nuevo**.
- **Audiencia por defecto — modelo "valor por defecto", no regla global.** Un ajuste opcional que
  decide con qué audiencia nace el contenido nuevo; cada favorito, entrada de diario, lista o
  copia de colección sigue siendo editable por separado y nada existente cambia. Sin valor
  elegido (`NULL`) se conservan los defaults actuales por tipo, que **no son uniformes** (favoritos
  `public`, listas y colección `followers`, diario `private`); por eso el valor no puede tener un
  default único: uno global degradaría silenciosamente favoritos o el diario.

Sin cambios en `/me/diary`, `/me/favorites`, `/me/lists`, `/me/collection`, `/me/artists`,
`/me/follow-requests`, `/me/blocks` ni en las páginas de conexiones: siguen siendo los destinos
de gestión de su contenido y la pantalla Red los enlaza.

### Goals

- Que hacer clic en el propio username lleve al perfil, y que lo visible se pueda editar sin salir
  de él.
- Un lugar único y ordenado para toda configuración, con una pantalla por tipo de ajuste.
- Reutilizar los editores y las rutas de gestión existentes; sin reescribir editores.
- Entregar por fases: la Fase 1 reubica lo que ya existe, sin backend nuevo.

### Non-Goals

- Cambiar email, usuario o contraseña con sesión iniciada, foto de perfil y eliminar cuenta
  (requieren backend nuevo y decisiones de seguridad; fuera de este cambio). Nota: la
  recuperación de contraseña y la verificación de email ya existen (`password-reset`,
  `email-verification`) y no se tocan.
- "Aplicar a todo lo existente" para la audiencia por defecto (queda como extra opcional futuro).
- Cambiar el contenido, el orden o la composición por niveles del perfil visible.
- Mover o rediseñar las páginas de gestión de biblioteca `/me/*`.
- Vista previa en vivo con selector de rol (opción C de los mockups); `?preview=1` se conserva tal
  cual.
- Cambiar el menú de usuario del Header (sigue igual, incluidos seguidores/seguidos/solicitudes).

## Capabilities

### New Capabilities

- `owner-settings`: el área `/me/settings` con sus cinco pantallas, la navegación lateral, la
  conservación del aviso de email sin verificar, y el contenido de cada pantalla por fase.
- `profile-edit-mode`: el interruptor "Editar perfil", los lápices por bloque y el panel lateral de
  edición (comportamiento, accesibilidad, descarte de cambios sin guardar), más el chip de estado
  y la tarjeta "Ajustes" del perfil del dueño.
- `default-audience`: la preferencia opcional de audiencia por defecto del contenido nuevo, su
  precedencia sobre los defaults por tipo y su carácter no retroactivo (Fase 2).

### Modified Capabilities

- `social-profiles`: cambian los requisitos "Ruta canónica del perfil" (las capas de dueño pasan a
  ser modo edición + tarjeta de ajustes, ya no "edición inline + panel de gestión"), "Panel del
  dueño" (el panel de atajos se sustituye por la tarjeta "Ajustes"; el menú de usuario deja de
  compartir su definición con el panel) y "Perfil autenticado y configuración" (el nombre visible
  pasa a ser actualizable).
- `profile-identity`: "Edición de identidad desde el perfil" deja de decir "sin navegar a una
  superficie de configuración separada": ahora existe esa superficie y la edición sobre el perfil
  se activa con el modo edición.
- `profile-album-identity`: "Edición de los álbumes favoritos desde el propio perfil" deja de
  exigir montarse "únicamente en la vista del propio perfil"; también se monta en el área de
  ajustes del dueño.

## Impact

- **Rutas nuevas:** `/[locale]/me/settings/{profile,curation,privacy,network,account}` con un
  `layout.tsx` compartido; `/me/settings` redirige a `/me/settings/profile`.
- **Código afectado:** `src/app/[locale]/users/[username]/{page,sections}.tsx`,
  `src/components/profiles/{OwnerHubPanel,Owner*Editor,ViewAsBanner}.tsx`,
  `src/components/layout/{user-menu-items.ts,UserMenu.tsx}`, `src/app/[locale]/me/settings/`,
  `src/components/social/PrivacySettings.tsx`. Componentes nuevos: interruptor/contexto de modo
  edición, bloque editable, panel lateral, navegación de ajustes, tarjeta "Ajustes".
- **Fase 2:** columna `app_user.default_audience` nullable con `CHECK` (migración SQL escrita a
  mano, siguiente a `0033`, y espejo en `src/db/schema.ts`); `PATCH /api/me/profile` acepta
  `displayName` y `defaultAudience`; los servicios que crean favoritos, entradas de diario,
  listas y copias de colección leen la preferencia.
- **Documentación:** `docs/05-features/user-profile.md`, `docs/04-api/contracts.md` (contrato de
  `PATCH /api/me/profile`), `docs/03-data/sql-model.md` (nueva columna), mensajes `es`/`en`.
- **Sin dependencias nuevas.** La spec `email-verification` no cambia: su aviso se conserva en el
  área de ajustes (ver `design.md`).
