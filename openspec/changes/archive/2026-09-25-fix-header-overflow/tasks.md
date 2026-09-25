## 1. Menú de usuario

- [x] 1.1 Grupo `tools` con `moderation` y `administration` y campo `requires` en `user-menu-items.ts`; `buildUserMenuItems` filtra por `permissions` (D1)
- [x] 1.2 `UserMenu` y `UserMenuList` reciben y pasan los permisos
- [x] 1.3 Tests de `user-menu-items` (con y sin permisos, orden del grupo)

## 2. Header

- [x] 2.1 Quitar Moderación y Administración de la barra general; pasar los permisos al menú y al panel
- [x] 2.2 Punto de corte `md` → `lg` (D2)
- [x] 2.3 Tests del Header

## 3. Verificación

- [x] 3.1 `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build`
- [x] 3.2 Navegador: sin desplazamiento horizontal a 800 y 1024 px con sesión y roles; herramientas en el menú
