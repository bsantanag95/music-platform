## Context

Hoy la gestión del propio perfil vive en tres sitios (ver `proposal.md`):

- `OwnerEditors` (`src/app/[locale]/users/[username]/sections.tsx`): una card con cinco editores
  cliente apilados —`OwnerIdentityCardEditor`, `OwnerIdentityEditor` (bio, pronombres,
  ubicación, zona horaria), `OwnerLinksEditor`, `OwnerShowcaseEditor` (destacados + himno) y
  `OwnerAlbumFavoritesEditor`— montada sobre el perfil. Cada editor recibe `initial` y persiste
  con `apiFetch` por su cuenta; algunos aplican al instante (Tarjeta de Identidad: "Cambiar" /
  "Quitar" llaman al endpoint directamente) y otros tienen botón "Guardar".
- `OwnerHubPanel`: 11 enlaces a `/me/*` generados desde `user-menu-items.ts` (superficie
  `panel`), fuente compartida con el menú del Header.
- `/me/settings`: `PrivacySettings` (público/privado) y `EmailVerificationNotice` (agregado por
  `email-verification`, cuya spec exige el aviso "en la configuración de su cuenta").

Estado de cuenta relevante: `app_user.display_name` se lee en todo el sitio pero solo se fija al
registrarse; `DELETE /api/auth/revoke-all` existe sin interfaz; `password_hash` es nulo en cuentas
Google y `auth_identity` guarda los proveedores. La verificación de email y la recuperación de
contraseña ya están implementadas y no se modifican. Los defaults de audiencia al crear contenido
son distintos por tipo: favoritos `public` (parámetro por defecto del servicio), listas y colección
`followers` (`params.audience ?? "followers"`) y diario `private` (fijo en `createEntry`).

El diseño salió de dos rondas de mockups estáticos: se descartaron una opción de solo área de
ajustes, una de solo edición sobre el perfil y una de editor con vista previa en vivo; se eligió el
híbrido con panel lateral e interruptor.

## Goals / Non-Goals

**Goals:**

- Dos vías coherentes —edición rápida sobre el perfil y área de ajustes completa— sobre los mismos
  editores.
- Que el perfil del dueño se vea igual que el de un visitante hasta que el dueño activa el modo
  edición.
- Fase 1 sin backend nuevo; Fase 2 con el mínimo (una columna, dos campos en un `PATCH` existente).

**Non-Goals:**

- Reescribir los editores o cambiar sus contratos REST (solo se les agregan props opcionales).
- Cambio de email, usuario y contraseña con sesión, foto de perfil y eliminar cuenta.
- Persistir el estado del modo edición entre navegaciones.
- Vista previa en vivo con selector de rol.

## Decisions

### 1. Área de ajustes como subrutas con un `layout.tsx` compartido

`/me/settings/{profile,curation,privacy,network,account}`, cada una un Server Component que carga
solo sus datos; el `layout.tsx` aporta el menú lateral (pestañas horizontales bajo `md`) y el
aviso de email sin verificar. `/me/settings` redirige a `/me/settings/profile`, de modo que el
"Ajustes" del menú de usuario y cualquier enlace existente siguen funcionando. Rutas en inglés,
como el resto de `/me/*`.

*Alternativa descartada:* una sola página cliente con pestañas por estado o query param. Obliga a
cargar los datos de las cinco pantallas juntos, pierde el enlace profundo por pantalla y no
aprovecha los Server Components (convención del proyecto).

### 2. El aviso de email sin verificar vive en el layout de ajustes, no en "Cuenta"

`email-verification` exige que quien entra "a la configuración de su cuenta" vea el aviso. Como la
pantalla de aterrizaje ahora es Perfil, un aviso solo en Cuenta pasaría desapercibido. Se monta
`EmailVerificationNotice` en el `layout.tsx` (visible en todas las pantallas mientras el email no
esté verificado). Así la spec `email-verification` no necesita cambios.

### 3. Un editor, dos anfitriones

Los cinco editores siguen siendo la única implementación. Se montan (a) dentro del panel lateral
desde el perfil y (b) en el área de ajustes. Para el panel ganan dos props **opcionales**:
`onSaved?: () => void` y `onDirtyChange?: (dirty: boolean) => void`; sin ellas se comportan como
hoy. Los agrupa así el anfitrión: el bloque Placa abre `OwnerIdentityEditor` + `OwnerLinksEditor`
(todo lo que dibuja la Placa, incluida zona horaria); Tarjeta de Identidad abre
`OwnerIdentityCardEditor`; Destacados abre `OwnerShowcaseEditor`; Álbumes favoritos abre
`OwnerAlbumFavoritesEditor`.

*Alternativa descartada:* editores nuevos "ligeros" solo para el panel. Duplica lógica y deriva
con el tiempo (ya pasó con el marcador "me define", ver `rework-user-profile`).

### 4. El panel no añade su propio "Guardar"

Los editores ya tienen sus propios botones o aplican al instante (Tarjeta de Identidad). El panel es
solo el anfitrión: título, botón Cerrar y el editor. Al cerrar, si algún editor reportó `onSaved`,
se llama a `router.refresh()` para que el bloque visible detrás refleje el cambio. Si hay cambios
sin guardar (`onDirtyChange(true)`), cerrar pide confirmación de descarte con el diálogo de
confirmación existente. Los mockups mostraban un pie "Guardar/Cancelar" propio; se descarta para
no duplicar la acción del editor.

### 5. Modo edición: contexto cliente + `EditableBlock`

Solo cuando el visitante es el dueño y **no** está en previsualización, la composición del perfil
envuelve el contenido en un `OwnerEditProvider` (cliente) que guarda `editing` (`useState`) y
renderiza una vez el panel lateral. `EditableBlock` (cliente) recibe `label`, `editor`
(`ReactNode` ya construido por el servidor con su `initial`) y `children` (la vista, renderizada
por el servidor); muestra el lápiz cuando `editing` y al pulsarlo abre el panel con `editor`.
Para visitantes y en previsualización no se monta ningún envoltorio ni proveedor: cero JS de
edición y ningún control visible (cumple "sin los controles de edición").

El estado del interruptor es local y no persistente: se reinicia al navegar. Un estado persistido
(`localStorage`, URL) sorprendería al volver al perfil y arriesga mostrar controles cuando el dueño
quería ver su perfil limpio.

*Alternativa descartada:* cargar el editor por API al abrir el panel (TanStack Query). Añade
estados de carga por bloque; el coste de la carga anticipada es de dos consultas y solo para el
dueño (hoy `OwnerEditors` ya las hace).

### 6. Solo llevan lápiz los bloques con editor existente

Placa, Tarjeta de Identidad, Destacados/Himno y Álbumes favoritos. Listas fijadas, valoraciones
destacadas y entradas de diario destacadas se fijan/destacan en el punto de origen; ponerles lápiz
sin editor llevaría a ninguna parte. Aparecen en la pantalla Curaduría con su conteo y un enlace
al origen.

### 7. La barra del dueño y la tarjeta "Ajustes"

`OwnerProfileBar` (cliente) agrupa el chip de estado ("Perfil público · Ajustes →", enlace a
`/me/settings/privacy`, sin acción propia), "Ver cómo te ven" (el `?preview=1` actual; sustituye el
enlace de `ViewAsBanner` fuera de previsualización) y el interruptor. En previsualización se
mantiene el aviso y la salida actuales, sin chip ni interruptor.

`OwnerHubPanel` se reemplaza por una tarjeta "Ajustes" con el indicador de solicitudes pendientes
(mismo `countPendingFollowRequests`) que enlaza a `/me/settings`. En `user-menu-items.ts` se
**añade** una superficie `settings` (seguidores, seguidos, solicitudes y `blocks`) para la pantalla
Red; la superficie `panel` se conserva porque también la consume el panel móvil del Header
(`Header.tsx`), que no cambia. Así sigue habiendo una única definición compartida entre el menú del
Header y el área de ajustes, y `blocks` pasa a estar en `panel` y `settings`.

### 8. Pantallas Red y Curaduría son índices, no reimplementaciones

Red se construye con los ítems de la superficie `settings` del grupo `network` (más
`blocks`), es decir, enlaza las páginas existentes (`/me/follow-requests` con su indicador,
conexiones de seguidores y seguidos, `/me/blocks`) sin reimplementar listados. Curaduría lista Destacados (n/4), Himno,
Álbumes favoritos (n/6) —los tres abren el panel lateral con el mismo editor— y los tres orígenes
externos con conteo y enlace. Los conteos salen de un servicio nuevo `getCurationSummary(userId)`
(una sola pasada de consultas de conteo).

### 9. Audiencia por defecto: `default_audience` nullable, `NULL` = defaults por tipo

Columna `app_user.default_audience text NULL` con `CHECK (default_audience IN ('private','followers','public'))`,
sin backfill. Precedencia al crear contenido: **valor explícito de la petición > preferencia del
usuario > default del tipo**. Un helper único (`resolveNewContentAudience`) lo aplican los cuatro
puntos de creación (favoritos, diario, listas, colección). La UI ofrece cuatro opciones: "Según el
tipo (recomendado)", Privado, Seguidores y Público, y explica en el mismo control que solo afecta
al contenido nuevo.

*Alternativa descartada:* columna `NOT NULL DEFAULT 'followers'`. Cambiaría, en cuanto se lanza,
el default de favoritos (`public`, decisión de `rework-user-profile`) y el del diario (`private`),
sin que el usuario haya elegido nada.

### 10. Nombre visible y sesiones (Fase 2)

`PATCH /api/me/profile` acepta `displayName` (recortado; vacío lo pone en `NULL`, y el sitio ya cae
al username) y `defaultAudience`. Cerrar todas las sesiones usa `DELETE /api/auth/revoke-all` tras
confirmar; como esa ruta borra también la cookie de la sesión actual, el cliente redirige a login.
El método de acceso se muestra en solo lectura: un helper de servidor devuelve
`{ hasPassword: boolean; providers: string[] }` y **nunca** el hash.

### 11. Accesibilidad y móvil del panel

El panel es un diálogo modal: `role="dialog"`, `aria-modal`, `aria-labelledby`, foco atrapado y
devuelto al lápiz que lo abrió, cierre con `Escape` y con clic en el fondo, y bloqueo del scroll
del documento (mismo criterio que los diálogos existentes). Por debajo de `md` se presenta como
hoja inferior (alto máximo ~85 vh con scroll interno). Los lápices son botones con nombre
accesible ("Editar {bloque}").

## Risks / Trade-offs

- **Deriva entre los dos anfitriones de cada editor** → un solo componente por editor; las props
  nuevas son opcionales y los tests existentes de cada editor deben seguir pasando sin cambios.
- **Panel modal con foco atrapado** es lo más delicado de accesibilidad → reutilizar el patrón de
  diálogo ya presente en el repo antes de escribir uno nuevo, y cubrirlo con pruebas de teclado.
- **Editor con carga anticipada** para el dueño (2 consultas extra por render) → aceptado; se
  puede pasar a carga bajo demanda más adelante sin cambiar el contrato de `EditableBlock`.
- **Cambiar el default de audiencia puede sorprender** → es no retroactivo, la opción por defecto
  es "Según el tipo" (sin cambio de comportamiento) y el texto lo dice en el mismo control.
- **Trabajo en paralelo sobre `/me/settings/page.tsx`** (el cambio de verificación de email lo
  modificó hace poco) → partir de `main` actualizado y revisar conflictos al integrar.
- **Números de migración** → `0033` es la última hoy; verificar el siguiente libre justo antes de
  crear la de la Fase 2 (otros agentes migran en paralelo).
- **Retirar `OwnerHubPanel`** rompe su test y el de `page.test.tsx` → se actualizan en el mismo
  cambio. La superficie `panel` de `user-menu-items.ts` NO se toca (la usa el Header móvil).

## Migration Plan

1. **Fase 1** (sin migración ni cambios de contrato): subrutas y layout de ajustes, contexto y
   panel de edición, barra del dueño y tarjeta "Ajustes", retiro de `OwnerEditors` y
   `OwnerHubPanel`. Reversible por completo con `git revert`; ningún dato cambia.
2. **Fase 2**: migración SQL escrita a mano que añade `app_user.default_audience` (nullable, sin
   backfill) y su espejo en `src/db/schema.ts`; luego `PATCH /api/me/profile`, helper de
   precedencia y pantallas Cuenta/Privacidad. *Rollback:* dejar de leer la columna (el helper cae
   a los defaults por tipo) y, si hace falta, `ALTER TABLE ... DROP COLUMN`; ningún contenido se
   ve afectado porque la preferencia nunca reescribe filas existentes.

## Open Questions

- ¿Dónde se gestionan hoy las **valoraciones destacadas** para enlazarlas desde Curaduría? Verificar
  al implementar (`rating_highlight`); si solo se alternan desde el perfil, el enlace apunta al
  propio perfil.
- **Reglas del nombre visible**: longitud máxima (propuesta 50) y si debe ser único (hoy no lo es).
- "Aplicar la audiencia por defecto a todo lo existente" y "cambiar contraseña con sesión iniciada"
  (podría reutilizar el flujo de restablecimiento por correo, que además cierra las sesiones) quedan
  como continuaciones posibles, fuera de este cambio.
