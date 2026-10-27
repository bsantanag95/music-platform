## 1. Cabecera y pestañas

- [x] 1.1 `countProgressTabs` y totales iniciales desde la página.
- [x] 1.2 `ProgressSection` con título, descripción, acción por pestaña (diálogo de acciones rápidas) y enlace de descubrir.
- [x] 1.3 Pestañas subrayadas con total; "Listas para completar" ("Para completar" bajo `sm`).
- [x] 1.4 Contexto `useProgressSection` (`reportTotal`, `openPrimary`); los listados informan su total.

## 2. Barra

- [x] 2.1 `ProgressStateSegments` con cifras en Discografías y Listas para completar.
- [x] 2.2 `ProgressSortSelect` con etiqueta dentro y la opción "Más avanzadas".
- [x] 2.3 Mis listas sin formulario en línea ni línea de total; estados vacíos con la acción.
- [x] 2.4 Los listados se sincronizan con los datos nuevos tras `router.refresh()`.

## 3. Cierre

- [x] 3.1 Pruebas de componentes y de la página (el conteo de `countProgressTabs` se comprobó contra la BD en el navegador).
- [x] 3.2 Documentación en `docs/05-features/caminos.md`.
- [x] 3.3 typecheck, lint, test y build; verificación en el navegador a 1280 y 375 px.
