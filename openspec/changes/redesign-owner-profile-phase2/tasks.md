## 1. Marcas de audiencia

- [x] 1.1 `AudienceMark`: icono y «Seguidores» / «Solo tú»; nada para `public`
- [x] 1.2 `showAudience` en `DiaryPreviewTable`, `FavoritesPreview` y `ListsAndCaminosPreview`; `sections.tsx` lo pasa con `isOwn`
- [x] 1.3 Tests: marca por audiencia; sin `showAudience` no hay marcas

## 2. Acciones para agregar

- [x] 2.1 `OwnerAddAction` (cliente): abre `QuickActionsDialog` con `initialAction`; refresca al cerrar si hubo cambios; devuelve el foco
- [x] 2.2 `ProfileRail` con `ownerAction`; Diario, Favoritos, Listas y Colección la reciben con `isOwn`, también vacíos
- [x] 2.3 Tests: componente (abre en la acción, refresco solo con cambios) y secciones (solo el dueño)

## 3. Textos, documentación y verificación

- [x] 3.1 `users.ownerAdd.*` y `users.audienceMark.*` en `messages/{es,en}/users.json`; `pnpm run i18n:client-messages`
- [x] 3.2 `docs/05-features/user-profile.md`: marcas y acciones del dueño
- [x] 3.3 `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build`
- [x] 3.4 Navegador con la sesión del dueño a 1440 y 390 px: marcas en diario, favoritos y listas; cada «+» abre su acción; «Ver como visitante» sin marcas ni acciones; sin desborde
