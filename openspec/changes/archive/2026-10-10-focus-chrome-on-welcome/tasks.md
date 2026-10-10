## 1. Criterio de pantalla de foco

- [x] 1.1 `isFocusRoute` (`src/lib/focus-routes.ts`, solo `/welcome` y subrutas) con pruebas

## 2. Header y pie

- [x] 2.1 `Header`: variante de foco (logo + selector de idioma que conserva la ruta), después de todos los hooks; pruebas (con y sin foco, idioma)
- [x] 2.2 `Footer` con `variant="minimal"`: atribución completa + barra inferior con enlaces legales, sin navegación, redes ni «volver arriba»; pruebas
- [x] 2.3 `FooterSlot` (cliente) elige entre los dos pies que renderiza el layout; el layout lo usa; pruebas
- [x] 2.4 `welcome/page.tsx`: el `<main>` deja de forzar `min-h-screen`

## 3. Documentación y verificación

- [x] 3.1 `docs/05-features/onboarding.md` y `docs/03-data/data-licensing.md` (la atribución se conserva en la variante reducida)
- [x] 3.2 Navegador: HTML del servidor de `/welcome` con header reducido, un solo footer con atribución; ida y vuelta Inicio ↔ bienvenida con el router (el chrome completo vuelve y se va); 375 px: documento de 1609 px, primer campo en y=700, sin scroll horizontal; usuarios de prueba borrados
- [x] 3.3 `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build`
