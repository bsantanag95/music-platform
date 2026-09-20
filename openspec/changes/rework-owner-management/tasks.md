## 1. Base compartida (Fase 1)

- [x] 1.1 `src/components/layout/user-menu-items.ts`: añadir la superficie `settings` (ítems
      followers, following, followRequests y `blocks`) sin quitar `panel`, que consume el panel
      móvil del Header; el menú del Header queda sin cambios; tests en `user-menu-items.test.ts`
- [x] 1.2 Añadir a los cinco editores (`OwnerIdentityEditor`, `OwnerLinksEditor`,
      `OwnerIdentityCardEditor`, `OwnerShowcaseEditor`, `OwnerAlbumFavoritesEditor`) las props
      opcionales `onSaved` y `onDirtyChange`; sin ellas el comportamiento y los tests existentes
      no cambian; tests nuevos de las dos props por editor
- [x] 1.3 `EditorPanel` (cliente, panel lateral modal): `role="dialog"`, `aria-modal`, foco
      atrapado y devuelto, `Escape` y clic en el fondo, bloqueo de scroll, hoja inferior bajo `md`;
      revisar primero `src/components/ui/ConfirmDialog.tsx` y reutilizar su patrón de portal y foco;
      confirmación de descarte con `ConfirmDialog` cuando hay cambios sin guardar; tests de
      teclado y de descarte
- [x] 1.4 `OwnerEditProvider` (estado `editing` con `useState`, no persistente, renderiza el
      panel una vez) y `EditableBlock` (lápiz accesible "Editar {bloque}" solo con `editing`; abre
      el panel con el `editor` recibido; `router.refresh()` al cerrar si hubo `onSaved`); tests
- [x] 1.5 `OwnerProfileBar` (cliente): chip "Perfil público/privado · Ajustes →" a
      `/me/settings/privacy` sin acción propia, acceso a "Ver cómo te ven" (`?preview=1`) e
      interruptor "Editar perfil"; en previsualización se conserva `ViewAsBanner` sin chip ni
      interruptor; tests

## 2. Perfil del dueño (Fase 1)

- [x] 2.1 `page.tsx` / `sections.tsx`: montar `OwnerEditProvider` y `OwnerProfileBar` solo cuando
      `isOwn && !previewing`; envolver con `EditableBlock` la Placa (editor = identidad + enlaces),
      la Tarjeta de Identidad, los Destacados/Himno y los Álbumes favoritos, construyendo cada
      `editor` en el servidor con su `initial`; visitantes y previsualización no reciben
      envoltorios
- [x] 2.2 Eliminar `OwnerEditors` y la card apilada; verificar que los datos que cargaba
      (`getShowcase`, `getAlbumFavorites` con las tres audiencias) se cargan ahora por bloque y solo
      para el dueño
- [x] 2.3 Reemplazar `OwnerHubPanel` y `HubSection` por la tarjeta "Ajustes" (enlace a
      `/me/settings`, indicador de solicitudes pendientes con `countPendingFollowRequests`); borrar
      `OwnerHubPanel.tsx` y su test, añadir el de la tarjeta
- [x] 2.4 Tests de `page.test.tsx`: dueño sin lápices por defecto; visitante y previsualización sin
      ningún control; con el modo edición activo cada bloque con editor muestra su lápiz y los
      estantes sin editor no

## 3. Área de ajustes (Fase 1)

- [x] 3.1 `src/app/[locale]/me/settings/layout.tsx`: `requirePageUser`, menú lateral (pestañas
      horizontales bajo `md`, componente cliente solo para marcar la ruta activa) y
      `EmailVerificationNotice` en todas las pantallas; `me/settings/page.tsx` redirige a
      `/me/settings/profile`
- [x] 3.2 Pantalla Perfil (`profile/page.tsx`): monta Tarjeta de Identidad, identidad y enlaces con
      los mismos editores
- [x] 3.3 Servicio `getCurationSummary(userId)` (conteos de listas fijadas, valoraciones destacadas
      y diario destacado) con tests; los conteos de Destacados y Álbumes favoritos salen de
      `getShowcase`/`getAlbumFavorites`, que la pantalla ya carga para sus editores. Pregunta abierta
      de `design.md` resuelta: las valoraciones se destacan desde `DualRating` (página de cada
      álbum o canción) y el diario desde su lista, sin superficie única, así que Valoraciones lleva
      conteo y pista, sin enlace
- [x] 3.4 Pantalla Curaduría (`curation/page.tsx`): filas con conteo; Destacados, Himno y Álbumes
      favoritos abren su editor en `EditorPanel`; los tres orígenes externos enlazan al lugar donde
      se fijan
- [x] 3.5 Pantalla Privacidad (`privacy/page.tsx`): mover `PrivacySettings` con su comportamiento
      actual; ajustar textos si hace falta
- [x] 3.6 Pantalla Red (`network/page.tsx`): enlaces desde los ítems `settings` del grupo `network`
      más `blocks`, con el indicador de solicitudes pendientes
- [x] 3.7 Mensajes `es`/`en` (`users.settings.*`, claves del menú lateral, chip, tarjeta
      "Ajustes", panel de edición y `edit.*` nuevos) sin claves huérfanas; el aviso y los textos de
      `PrivacySettings` se conservan
- [x] 3.8 Tests de layout (aviso visible/oculto según verificación, redirección sin sesión, pestaña
      activa) y de cada pantalla

## 4. Verificación de la Fase 1

- [x] 4.1 `pnpm typecheck`, `pnpm lint`, `pnpm test` y `pnpm build` en verde
- [ ] 4.2 En el navegador con una cuenta real (pedir al usuario que inicie sesión en el panel del
      navegador): activar/desactivar el modo edición, editar bio y ver el cambio detrás del panel,
      cerrar con cambios sin guardar, `Escape` y foco de retorno, previsualización sin controles,
      recorrer las pantallas de Ajustes y comprobar el aviso de email sin verificar
- [ ] 4.3 Comprobar el panel como hoja inferior en viewport móvil y el menú lateral como pestañas
- [ ] 4.4 Comprobar que ningún enlace previo a `/me/settings` se rompió (menú de usuario,
      `EmailVerificationNotice`, páginas de verificación)

## 5. Fase 2 — datos y contratos

- [ ] 5.1 Verificar el siguiente número de migración libre (hoy `0033` es la última) y escribir la
      migración SQL: `app_user.default_audience text NULL` con `CHECK` en
      (`private`,`followers`,`public`), sin backfill; espejo en `src/db/schema.ts`;
      `docs/03-data/sql-model.md`
- [ ] 5.2 Esquemas Zod y ruta `PATCH /api/me/profile`: aceptar `displayName` (recortado, vacío →
      `NULL`, longitud máxima según la pregunta abierta de `design.md`) y `defaultAudience`
      (`private`/`followers`/`public`/`null`); `VALIDATION_ERROR` y `AUTH_REQUIRED` según
      `default-audience`; actualizar `docs/04-api/contracts.md`; tests de la ruta
- [ ] 5.3 Helper `resolveNewContentAudience(userId, tipo, explícita?)` con la precedencia
      explícita > preferencia > default del tipo, y tests unitarios de las tres ramas
- [ ] 5.4 Cablear el helper en los cuatro puntos de creación: favoritos (`toggleFavorite`,
      default `public`), diario (`createEntry`, hoy `private` fijo), listas (`?? "followers"`) y
      colección (`?? "followers"`); un test por punto que fije la precedencia y demuestre que sin
      preferencia el comportamiento previo se conserva
- [ ] 5.5 Test de no retroactividad: cambiar la preferencia no toca filas existentes
- [ ] 5.6 Helper de servidor `getAccessMethod(userId)` → `{ hasPassword, providers }` (nunca el
      hash) y test

## 6. Fase 2 — pantallas

- [ ] 6.1 Pantalla Cuenta y seguridad (`account/page.tsx`): formulario de nombre visible, método de
      acceso en solo lectura y "Cerrar todas las sesiones" con `ConfirmDialog` y redirección al
      inicio de sesión tras `DELETE /api/auth/revoke-all`; sin controles de funciones no
      disponibles; añadir la entrada al menú lateral solo desde esta tarea
- [ ] 6.2 Privacidad: control de audiencia por defecto con las cuatro opciones y el texto de "solo
      contenido nuevo"
- [ ] 6.3 Mensajes `es`/`en` y tests de las dos pantallas (guardado, error recuperable, vaciar
      nombre, cuenta Google sin opción de contraseña, cancelar cierre de sesiones)
- [ ] 6.4 Verificación en navegador de la Fase 2: cambiar nombre visible y verlo en el perfil,
      elegir una audiencia por defecto y crear contenido nuevo de cada tipo, cerrar todas las
      sesiones

## 7. Documentación y cierre

- [ ] 7.1 Actualizar `docs/05-features/user-profile.md` (modo edición, panel lateral, área de
      ajustes, audiencia por defecto) y cualquier referencia al panel de gestión o a `OwnerEditors`
- [ ] 7.2 `openspec validate rework-owner-management --strict` y revisar que las specs modificadas
      conservan todos sus escenarios (ver la memoria `openspec-archive-gotchas`)
- [ ] 7.3 Actualizar la memoria `profile-management-section` con el resultado y los hallazgos de
      la implementación
