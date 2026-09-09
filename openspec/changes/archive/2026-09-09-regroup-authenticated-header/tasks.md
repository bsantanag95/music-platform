## 1. Fuente compartida de destinos

- [x] 1.1 Crear `src/components/layout/user-menu-items.ts` con la lista ordenada de destinos de gestión como datos (`href`, `labelKey`, `group`, `headerOnly?`), sin JSX.
- [x] 1.2 Añadir un helper que reciba el conteo de solicitudes pendientes y devuelva la lista con el `badge` resuelto en el ítem de solicitudes.
- [x] 1.3 Consolidar las claves de traducción de estos destinos bajo `common.*` en `messages/es/common.json` y `messages/en/common.json`; añadir claves de apertura/cierre del menú de usuario.
- [x] 1.4 Retirar de `messages/{es,en}/users.json` las claves que queden huérfanas tras la consolidación.

## 2. Menú de usuario en el Header

- [x] 2.1 Extraer `SessionCluster` (usuario con sesión) a un componente `UserMenu` (desplegable) en `src/components/layout/`.
- [x] 2.2 Implementar el desplegable: control con `aria-haspopup`, `aria-expanded`, `aria-controls`; estado `userMenuOpen` en el Header.
- [x] 2.3 Cierre por `Escape` con retorno de foco al control, por navegación (`usePathname`) y por click/pointerdown fuera; generalizar el listener de `Escape` que hoy sirve al panel móvil.
- [x] 2.4 Renderizar los ítems desde `user-menu-items.ts` (incluido "Mi perfil" `headerOnly` y "Feed / Actividad") más el cierre de sesión y su manejo de error existente.
- [x] 2.5 Quitar `NAV_ITEMS` de la barra general `md+`; dejar solo `HeaderSearch` y el enlace a Explorar (condicionado a `exploreEnabled`).

## 3. Panel móvil

- [x] 3.1 Recomponer el panel `menuOpen` en dos bloques con divisor: barra general (buscador + Explorar) y sección de usuario (ítems del menú en lista vertical + selector de locale + Salir).
- [x] 3.2 Verificar que no haya overflow horizontal a 375px y que el foco quede contenido en el panel abierto.

## 4. Panel del dueño

- [x] 4.1 Actualizar `src/components/profiles/OwnerHubPanel.tsx` para construir sus enlaces desde `user-menu-items.ts` (excluyendo los `headerOnly`), leyendo las etiquetas desde `common.*`.
- [x] 4.2 Confirmar que el badge de solicitudes pendientes sigue funcionando con la nueva fuente.

## 5. Specs y documentación

- [x] 5.1 Añadir una sección `## Purpose` a `openspec/specs/cross-view-navigation/spec.md` (requerida por `openspec archive`).
- [x] 5.2 Actualizar `docs/05-features/user-profile.md` y cualquier doc de navegación para describir la barra general vs. el menú de usuario.

## 6. Pruebas y verificación

- [x] 6.1 Actualizar `src/components/layout/Header.test.tsx`: barra general sin enlaces `/me/*`, apertura/cierre del menú (click, `Escape`, navegación), Feed dentro del menú, badge de solicitudes.
- [x] 6.2 Añadir/ajustar test que verifique que cada `labelKey` de `user-menu-items.ts` resuelve en `es` y `en`.
- [x] 6.3 Ajustar los tests del perfil que cubren `OwnerHubPanel` para la fuente compartida.
- [x] 6.4 Ejecutar typecheck, lint, test y build; dejar todo en verde.
- [x] 6.5 Verificación visual en navegador (desktop y móvil) del Header reorganizado.
- [x] 6.6 `openspec validate regroup-authenticated-header --type change` en verde.
